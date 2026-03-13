"use client";

import { useEffect, useState, useCallback } from "react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import {
  DatasetFilesTable,
  DatasetFileSummary,
} from "@/app/(dashboard)/datasets/components/dataset-files-table";
import { getDatasets } from "@/app/actions/workflow";

const TASK_FILES_DATASET_NAME = "task-files";

interface TaskFilesPanelProps {
  taskId: string;
  /** When this value changes, the panel refetches (e.g. after adding files). */
  refreshTrigger?: number;
}

export function TaskFilesPanel({
  taskId,
  refreshTrigger,
}: TaskFilesPanelProps) {
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow } = useWorkspaceScopedActions();
  const [files, setFiles] = useState<DatasetFileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) return;
    setLoading(true);
    try {
      const listResult = await getDatasets(currentWorkspaceId);
      const list =
        listResult && typeof listResult === "object" && "datasets" in listResult
          ? (listResult as { datasets: { id: string; name: string }[] })
          : null;
      const datasets =
        list?.datasets ?? (Array.isArray(listResult) ? listResult : []);
      const taskFilesDataset = Array.isArray(datasets)
        ? datasets.find(
            (d: { name?: string }) => d.name === TASK_FILES_DATASET_NAME,
          )
        : null;
      if (!taskFilesDataset?.id) {
        setFiles([]);
        return;
      }
      const result = await executeWorkflow("ListDatasetFilesWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: taskFilesDataset.id,
        task_id: taskId,
      });
      const data = result.data as {
        success?: boolean;
        files?: DatasetFileSummary[];
      };
      if (result.success && data?.success && Array.isArray(data.files)) {
        setFiles(data.files);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to load task files:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, taskId, executeWorkflow]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Files uploaded to this task (via the + Add files button). They are
        stored in the workspace &quot;task-files&quot; dataset and linked to
        this task.
      </p>
      <DatasetFilesTable files={files} loading={loading} />
    </div>
  );
}
