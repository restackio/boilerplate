"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Label } from "@workspace/ui/components/ui/label";
import { QuickActionDialog, useQuickActionDialog } from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { FileUp, FileText } from "lucide-react";
import { addFilesToDataset } from "@/app/actions/workflow";

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

/** File types supported by EmbedAnything: PDF, text, markdown, images */
const ACCEPT_FILE_TYPES =
  "application/pdf,.pdf,.txt,text/plain,.md,text/markdown,image/jpeg,image/png,.jpg,.jpeg,.png";

interface AddFilesDialogProps {
  datasetId: string;
  onSeeded?: () => void;
}

export function AddFilesDialog({ datasetId, onSeeded }: AddFilesDialogProps) {
  const { currentWorkspaceId } = useWorkspaceScopedActions();
  const { isOpen, open, close, isLoading, startLoading, stopLoading, handleError, handleSuccess } = useQuickActionDialog();
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

    startLoading();
    try {
      const filesWithContent: { filename: string; content_base64: string }[] = [];
      for (const file of selectedFiles) {
        const base64 = await readFileAsBase64(file);
        filesWithContent.push({ filename: file.name || "document", content_base64: base64 });
      }

      const result = await addFilesToDataset({
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        files_with_content: filesWithContent,
      });

      if (result.success && result.data) {
        const data = result.data as { files_processed?: number; total_chunks_ingested?: number; errors?: string[] };
        const msg = data.errors?.length
          ? `Ingested ${data.total_chunks_ingested ?? 0} chunks from ${data.files_processed ?? 0} files. Some errors: ${data.errors.slice(0, 2).join("; ")}`
          : `Ingested ${data.total_chunks_ingested ?? 0} chunks from ${data.files_processed ?? 0} file(s).`;
        handleSuccess(msg);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onSeeded?.();
      } else {
        throw new Error(result.error || "Add files failed");
      }
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
        primaryActionLabel="Upload and ingest"
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
            <Button type="button" variant="outline" className="w-full justify-start" onClick={handleOpenFilePicker}>
              <FileText className="h-4 w-4 mr-2" />
              {selectedFiles.length === 0 ? "Select files..." : `${selectedFiles.length} file(s) selected`}
            </Button>
            {selectedFiles.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc list-inside max-h-24 overflow-y-auto">
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              PDF, TXT, MD, JPEG, PNG supported.
            </p>
          </div>
        </div>
      </QuickActionDialog>
    </>
  );
}
