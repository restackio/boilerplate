"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Label } from "@workspace/ui/components/ui/label";
import {
  QuickActionDialog,
  useQuickActionDialog,
} from "@workspace/ui/components/quick-action-dialog";
import { FileUp, FileText } from "lucide-react";
import {
  scheduleAddFilesToDatasetWorkflow,
  getWorkflowResult,
} from "@/app/actions/workflow";
import { getDatasets, createDataset } from "@/app/actions/workflow";
import {
  GRPC_MESSAGE_LIMIT_BYTES,
  SAFE_PAYLOAD_BYTES,
  splitPdfIntoParts,
  batchUnderLimit,
} from "@/app/(dashboard)/datasets/lib/pdf-split";

const TASK_FILES_DATASET_NAME = "task-files";

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

const ACCEPT_FILE_TYPES =
  "application/pdf,.pdf,.txt,text/plain,.md,text/markdown,image/jpeg,image/png,.jpg,.jpeg,.png";

interface AddTaskFilesDialogProps {
  workspaceId: string;
  taskId: string;
  onFilesAdded?: () => void;
  trigger?: React.ReactNode;
  /** When provided, dialog open state is controlled by parent (e.g. from dropdown). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Get or create the workspace "task-files" dataset; returns dataset id or null. */
async function getOrCreateTaskFilesDataset(
  workspaceId: string,
): Promise<string | null> {
  const listResult = await getDatasets(workspaceId);
  const list =
    listResult && typeof listResult === "object" && "datasets" in listResult
      ? (listResult as { datasets: { id: string; name: string }[] })
      : null;
  const datasets =
    list?.datasets ?? (Array.isArray(listResult) ? listResult : []);
  const existing = Array.isArray(datasets)
    ? datasets.find(
        (d: { name?: string }) => d.name === TASK_FILES_DATASET_NAME,
      )
    : null;
  if (existing && typeof existing.id === "string") {
    return existing.id;
  }
  const createResult = await createDataset({
    workspace_id: workspaceId,
    name: TASK_FILES_DATASET_NAME,
    description: "Files uploaded from tasks",
    storage_type: "clickhouse",
  });
  const created =
    createResult &&
    typeof createResult === "object" &&
    "dataset" in createResult
      ? (createResult as { dataset: { id: string } }).dataset
      : null;
  return created?.id ?? null;
}

export function AddTaskFilesDialog({
  workspaceId,
  taskId,
  onFilesAdded,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: AddTaskFilesDialogProps) {
  const {
    isOpen: internalOpen,
    open: openInternal,
    close,
    isLoading,
    startLoading,
    stopLoading,
    handleError,
    handleSuccess,
  } = useQuickActionDialog();

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const open = isControlled ? () => onOpenChange?.(true) : openInternal;
  const handleClose = () => {
    if (isControlled) onOpenChange?.(false);
    else close();
  };
  const handleSuccessAndClose = useCallback(() => {
    handleSuccess();
    if (isControlled) onOpenChange?.(false);
  }, [handleSuccess, isControlled, onOpenChange]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleAddFiles = useCallback(async () => {
    if (!workspaceId || !taskId) {
      handleError("Missing workspace or task");
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
        `Restack has a 4 MB limit per message. The following non-PDF files exceed 4 MB: ${names}. Use smaller files or split PDFs (PDFs are split automatically).`,
      );
      return;
    }

    startLoading();
    try {
      const datasetId = await getOrCreateTaskFilesDataset(workspaceId);
      if (!datasetId) {
        handleError("Could not get or create task files dataset");
        stopLoading();
        return;
      }

      const filesWithContent: { filename: string; content_base64: string }[] =
        [];
      for (const file of selectedFiles) {
        const baseName = file.name || "document";
        const shouldSplit = isPdf(file) && file.size > SAFE_PAYLOAD_BYTES;
        if (shouldSplit) {
          const parts = await splitPdfIntoParts(file, baseName);
          filesWithContent.push(...parts);
        } else {
          const base64 = await readFileAsBase64(file);
          filesWithContent.push({ filename: baseName, content_base64: base64 });
        }
      }

      if (filesWithContent.length === 0) {
        handleError("No files to upload");
        stopLoading();
        return;
      }

      const batches = batchUnderLimit(filesWithContent);
      const scheduled = await Promise.all(
        batches.map((batch) =>
          scheduleAddFilesToDatasetWorkflow({
            workspace_id: workspaceId,
            dataset_id: datasetId,
            task_id: taskId,
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
      handleSuccessAndClose();
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onFilesAdded?.();
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Add files failed");
    } finally {
      stopLoading();
    }
  }, [
    workspaceId,
    taskId,
    selectedFiles,
    handleError,
    handleSuccessAndClose,
    startLoading,
    stopLoading,
    onFilesAdded,
  ]);

  return (
    <>
      {!isControlled &&
        (trigger ? (
          <div onClick={open}>{trigger}</div>
        ) : (
          <Button variant="outline" size="sm" onClick={open}>
            <FileUp className="h-4 w-4 mr-2" />
            Add files
          </Button>
        ))}
      <QuickActionDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Add files to task"
        description="Upload PDFs, text, markdown, or images. Files are stored and linked to this task."
        onPrimaryAction={handleAddFiles}
        primaryActionLabel="Add files"
        primaryActionIcon={FileUp}
        isLoading={isLoading}
        closeOnSuccess
        onSuccess={handleSuccessAndClose}
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
