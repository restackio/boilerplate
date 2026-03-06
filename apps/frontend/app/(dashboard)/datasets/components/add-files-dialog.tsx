"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Label } from "@workspace/ui/components/ui/label";
import {
  QuickActionDialog,
  useQuickActionDialog,
} from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { FileUp, FileText } from "lucide-react";
import {
  scheduleAddFilesToDatasetWorkflow,
  getWorkflowResult,
} from "@/app/actions/workflow";
import {
  GRPC_MESSAGE_LIMIT_BYTES,
  SAFE_PAYLOAD_BYTES,
  splitPdfIntoParts,
  batchUnderLimit,
} from "../lib/pdf-split";

const LOG_PREFIX = "[AddFilesToDataset]";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isPdf(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf") || file.type === "application/pdf";
}

/** File types supported by EmbedAnything: PDF, text, markdown, images */
const ACCEPT_FILE_TYPES =
  "application/pdf,.pdf,.txt,text/plain,.md,text/markdown,image/jpeg,image/png,.jpg,.jpeg,.png";

interface AddFilesDialogProps {
  datasetId: string;
  onSeeded?: () => void;
}

export function AddFilesDialog({ datasetId, onSeeded }: AddFilesDialogProps) {
  const { currentWorkspaceId } = useWorkspaceScopedActions();
  const {
    isOpen,
    open,
    close,
    isLoading,
    startLoading,
    stopLoading,
    handleError,
    handleSuccess,
  } = useQuickActionDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleAddFiles = async () => {
    if (!currentWorkspaceId || !datasetId) {
      handleError("Missing workspace or dataset");
      return;
    }
    if (selectedFiles.length === 0) {
      handleError("Select at least one file");
      return;
    }

    const tooLargeNonPdf = selectedFiles.filter(
      (f) => !isPdf(f) && f.size > GRPC_MESSAGE_LIMIT_BYTES,
    );
    if (tooLargeNonPdf.length > 0) {
      const names = tooLargeNonPdf.map((f) => f.name).join(", ");
      handleError(
        `Restack has a 4 MB limit per message. The following non-PDF files exceed 4 MB and cannot be uploaded: ${names}. Please use smaller files or split PDFs (PDFs are split automatically).`,
      );
      return;
    }

    startLoading();
    try {
      const filesWithContent: { filename: string; content_base64: string }[] =
        [];
      for (const file of selectedFiles) {
        const baseName = file.name || "document";
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const shouldSplit =
          isPdf(file) && file.size > SAFE_PAYLOAD_BYTES;
        console.log(
          `${LOG_PREFIX} file=${baseName} size=${file.size} (${sizeMB} MB) isPdf=${isPdf(file)} safeLimit=${SAFE_PAYLOAD_BYTES} → ${shouldSplit ? "splitting" : "single"}`
        );
        if (shouldSplit) {
          const parts = await splitPdfIntoParts(file, baseName);
          console.log(
            `${LOG_PREFIX} split "${baseName}" into ${parts.length} part(s)`
          );
          filesWithContent.push(...parts);
        } else {
          const base64 = await readFileAsBase64(file);
          filesWithContent.push({
            filename: baseName,
            content_base64: base64,
          });
        }
      }

      console.log(
        `${LOG_PREFIX} total items=${filesWithContent.length} batching...`
      );
      if (filesWithContent.length === 0) {
        handleError("No files to upload");
        stopLoading();
        return;
      }

      const batches = batchUnderLimit(filesWithContent);
      console.log(
        `${LOG_PREFIX} batches=${batches.length} (sizes: ${batches.map((b) => b.length).join(", ")})`
      );
      // Schedule all workflows first so each batch gets its own workflow (avoids serialization)
      const scheduled = await Promise.all(
        batches.map((batch) =>
          scheduleAddFilesToDatasetWorkflow({
            workspace_id: currentWorkspaceId,
            dataset_id: datasetId,
            files_with_content: batch,
          }),
        ),
      );
      const scheduleErrors = scheduled
        .filter((s): s is { success: false; error: string } => !s.success)
        .map((s) => s.error);
      if (scheduleErrors.length > 0) {
        throw new Error(scheduleErrors.join("; "));
      }
      const ids = scheduled.filter(
        (s): s is { success: true; workflowId: string; runId: string } =>
          s.success && "workflowId" in s,
      );
      console.log(
        `${LOG_PREFIX} scheduled ${ids.length} workflow(s), waiting for results...`
      );
      const results = await Promise.all(
        ids.map(({ workflowId, runId }) =>
          getWorkflowResult({
            workflowId,
            runId,
            timeoutMs: 5 * 60 * 1000,
          }),
        ),
      );
      const errors: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i] as
          | { success?: boolean; errors?: string[] }
          | null
          | undefined;
        if (r && typeof r === "object" && r.success === false) {
          const batchErrs = r.errors?.length ? r.errors : ["Workflow failed"];
          errors.push(...batchErrs.map((e) => `Batch ${i + 1}: ${e}`));
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }
      handleSuccess();
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSeeded?.();
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Add files failed");
    } finally {
      stopLoading();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={open}>
        <FileUp className="h-4 w-4 mr-2" />
        Add files
      </Button>
      <QuickActionDialog
        isOpen={isOpen}
        onClose={close}
        title="Add files to dataset"
        description="Upload PDFs, text, markdown, or images. The backend will extract content, generate embeddings, and store them in this dataset."
        onPrimaryAction={handleAddFiles}
        primaryActionLabel="Add files"
        primaryActionIcon={FileUp}
        isLoading={isLoading}
        closeOnSuccess
        onSuccess={handleSuccess}
        onError={handleError}
        size="lg"
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_FILE_TYPES}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="space-y-2">
            <Label>Files</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={handleOpenFilePicker}
            >
              <FileText className="h-4 w-4 mr-2" />
              {selectedFiles.length === 0
                ? "Select files..."
                : `${selectedFiles.length} file(s) selected`}
            </Button>
            {selectedFiles.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc list-inside max-h-24 overflow-y-auto">
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              PDF, TXT, MD, JPEG, PNG supported. Max 4 MB per file for non-PDFs;
              large PDFs are split automatically.
            </p>
          </div>
        </div>
      </QuickActionDialog>
    </>
  );
}
