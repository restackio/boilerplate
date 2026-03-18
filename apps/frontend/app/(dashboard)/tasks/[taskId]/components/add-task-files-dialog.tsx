"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  QuickActionDialog,
  useQuickActionDialog,
} from "@workspace/ui/components/quick-action-dialog";
import { FileUp, FileText, Plus, Loader2 } from "lucide-react";
import { sendAgentEvent } from "@/app/actions/agent";
import {
  scheduleAddFilesToDatasetWorkflow,
  getWorkflowResult,
  getOrCreateTaskFilesDatasetId,
  getDatasets,
  createDataset,
} from "@/app/actions/workflow";
import {
  GRPC_MESSAGE_LIMIT_BYTES,
  SAFE_PAYLOAD_BYTES,
  splitPdfIntoParts,
  batchUnderLimit,
} from "@/app/(dashboard)/datasets/lib/pdf-split";

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
  "application/pdf,.pdf,.txt,text/plain,.md,text/markdown,text/csv,.csv,image/jpeg,image/png,.jpg,.jpeg,.png";

interface AddTaskFilesDialogProps {
  workspaceId: string;
  taskId: string;
  onFilesAdded?: () => void;
  trigger?: React.ReactNode;
  /** When provided, dialog open state is controlled by parent (e.g. from dropdown). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If set (e.g. from agent builder), preselect this dataset. */
  preferredDatasetId?: string | null;
  /** If set (e.g. build task temporal_agent_id), notify agent with a message (file names + dataset id) after upload. */
  temporalAgentId?: string | null;
}

export function AddTaskFilesDialog({
  workspaceId,
  taskId,
  onFilesAdded,
  trigger,
  open: controlledOpen,
  onOpenChange,
  preferredDatasetId,
  temporalAgentId,
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

  type DatasetOption = { id: string; name: string };
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [createNewName, setCreateNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createNameError, setCreateNameError] = useState("");

  const fetchDatasets = useCallback(async () => {
    if (!workspaceId) return;
    setDatasetsLoading(true);
    try {
      const result = await getDatasets(workspaceId);
      const list =
        result && typeof result === "object" && "datasets" in result
          ? (result as { datasets: { id: string; name: string }[] })
          : null;
      const listDatasets = list?.datasets ?? [];
      setDatasets(Array.isArray(listDatasets) ? listDatasets : []);
    } catch {
      setDatasets([]);
    } finally {
      setDatasetsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen && workspaceId) fetchDatasets();
  }, [isOpen, workspaceId, fetchDatasets]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDatasetId("");
      setCreateNewName("");
      setCreateNameError("");
      return;
    }
    if (preferredDatasetId && datasets.some((d) => d.id === preferredDatasetId)) {
      setSelectedDatasetId(preferredDatasetId);
    } else if (datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
    // Intentionally omit selectedDatasetId: we only set initial selection when dialog opens or datasets load, not when user changes selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preferredDatasetId, datasets]);

  const handleCreateDataset = useCallback(async () => {
    const name = createNewName.trim().toLowerCase().replace(/\s+/g, "-");
    const slugPattern = /^[a-z0-9_-]+$/;
    if (!name) {
      setCreateNameError("Name is required");
      return;
    }
    if (!slugPattern.test(name)) {
      setCreateNameError(
        "Use only lowercase letters, numbers, hyphens, and underscores",
      );
      return;
    }
    if (!workspaceId) return;
    setCreating(true);
    setCreateNameError("");
    try {
      const result = await createDataset({
        workspace_id: workspaceId,
        name,
        description: "",
        storage_type: "clickhouse",
      });
      const created =
        result &&
        typeof result === "object" &&
        "dataset" in result &&
        result.dataset &&
        typeof result.dataset === "object" &&
        "id" in result.dataset
          ? (result as { dataset: { id: string } }).dataset
          : null;
      if (created?.id) {
        await fetchDatasets();
        setSelectedDatasetId(created.id);
        setCreateNewName("");
      } else {
        setCreateNameError("Failed to create dataset");
      }
    } catch (err) {
      setCreateNameError(
        err instanceof Error ? err.message : "Failed to create dataset",
      );
    } finally {
      setCreating(false);
    }
  }, [workspaceId, createNewName, fetchDatasets]);

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

    const tooLarge = selectedFiles.filter(
      (f) => !isPdf(f) && f.size > GRPC_MESSAGE_LIMIT_BYTES,
    );
    if (tooLarge.length > 0) {
      const names = tooLarge.map((f) => f.name).join(", ");
      handleError(
        `Restack has a 4 MB limit per message. The following files exceed 4 MB: ${names}. Use smaller files or split them; large documents are split automatically.`,
      );
      return;
    }

    if (selectedDatasetId === "__new__") {
      handleError("Create a dataset first using the form above, or select an existing dataset.");
      return;
    }
    const resolvedDatasetId =
      selectedDatasetId || (await getOrCreateTaskFilesDatasetId(workspaceId));
    if (!resolvedDatasetId) {
      handleError("Select or create a dataset first");
      return;
    }

    startLoading();
    try {
      const datasetId = resolvedDatasetId;

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
      if (temporalAgentId) {
        const filenames = filesWithContent.map((f) => f.filename);
        const parts = [`User uploaded file(s): ${filenames.join(", ")}.`];
        if (datasetId) parts.push(` dataset_id: ${datasetId}`);
        const content = parts.join(" ");
        await sendAgentEvent({
          agentId: temporalAgentId,
          eventName: "messages",
          eventInput: {
            messages: [{ role: "user", content }],
          },
        });
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
    selectedDatasetId,
    temporalAgentId,
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
        title="Add files"
        description="Upload documents, text, markdown, CSV, or images to a dataset. The agent is notified with the file names and dataset id."
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
          <div className="space-y-2">
            <Label>Dataset</Label>
            {datasetsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading datasets...
              </div>
            ) : (
              <>
                <Select
                  value={
                    selectedDatasetId === "__new__" ? "__new__" : selectedDatasetId || ""
                  }
                  onValueChange={(value) => {
                    setSelectedDatasetId(value);
                    if (value !== "__new__") setCreateNameError("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-2">
                        <Plus className="h-3.5 w-3.5" />
                        Create new dataset
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedDatasetId === "__new__" && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Dataset name (e.g. my-docs)"
                      value={createNewName}
                      onChange={(e) => {
                        setCreateNewName(e.target.value);
                        setCreateNameError("");
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCreateDataset}
                      disabled={creating || !createNewName.trim()}
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                )}
                {createNameError && (
                  <p className="text-xs text-destructive">{createNameError}</p>
                )}
              </>
            )}
          </div>
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
              TXT, MD, CSV, JPEG, PNG and documents supported. Max 4 MB per file;
              large documents are split automatically.
            </p>
          </div>
        </div>
      </QuickActionDialog>
    </>
  );
}
