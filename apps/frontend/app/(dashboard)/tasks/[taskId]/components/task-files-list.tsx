"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import {
  DatasetFilesTable,
  type DatasetFileSummary,
} from "@/app/(dashboard)/datasets/components/dataset-files-table";
import { getDatasets } from "@/app/actions/workflow";

const TASK_FILES_DATASET_NAME = "task-files";

interface TaskFilesListProps {
  taskId: string;
  /** When this value changes, the list refetches (e.g. after adding files). */
  refreshTrigger?: number;
  /** When provided, skip workspace dataset list + use these rows (e.g. TasksGetBuildSessionWorkflow). */
  taskFilesSnapshot?: DatasetFileSummary[];
  /** Refresh handler when using snapshot (typically reloads build session). */
  onTaskFilesRefresh?: () => void | Promise<void>;
}

export function TaskFilesList({
  taskId,
  refreshTrigger,
  taskFilesSnapshot,
  onTaskFilesRefresh,
}: TaskFilesListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow } = useWorkspaceScopedActions();
  const [files, setFiles] = useState<DatasetFileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const useSnapshot = taskFilesSnapshot !== undefined;

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
    if (useSnapshot) return;
    fetchFiles();
  }, [fetchFiles, refreshTrigger, useSnapshot]);

  const displayFiles = useSnapshot ? (taskFilesSnapshot ?? []) : files;
  const displayLoading = useSnapshot ? false : loading && files.length === 0;

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (useSnapshot && onTaskFilesRefresh) {
        await onTaskFilesRefresh();
      } else {
        await fetchFiles();
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (displayLoading && displayFiles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto border border-border/40 bg-muted/90 p-2 rounded-lg flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading files…</span>
      </div>
    );
  }

  const totalCount = displayFiles.length;
  if (totalCount === 0) return null;

  return (
    <div className="max-w-4xl mx-auto border border-border/40 bg-muted/90 p-2 rounded-lg space-y-2">
      <div
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <span className="text-sm font-medium text-foreground">Files</span>
        <span className="text-sm text-muted-foreground">
          {totalCount} file{totalCount !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-auto"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh files"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-2">
          <DatasetFilesTable files={displayFiles} loading={refreshing} />
        </div>
      )}
    </div>
  );
}
