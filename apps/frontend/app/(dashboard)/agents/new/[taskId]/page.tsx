"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useWorkspaceScopedActions,
  type Task,
} from "@/hooks/use-workspace-scoped-actions";
import type { DatasetFileSummary } from "@/app/(dashboard)/datasets/components/dataset-files-table";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import {
  ConfirmationDialog,
  createConfirmationConfig,
} from "@workspace/ui/components";
import { BuildSessionView } from "../build-session-view";
import type { BuildSummary } from "../components/build-canvas";

export default function NewAgentTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params?.taskId === "string" ? params.taskId : null;
  const { getBuildSessionSnapshot, updateTask, deleteTask } = useWorkspaceScopedActions();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [buildSummary, setBuildSummary] = useState<BuildSummary | null>(null);
  const [buildSummaryLoading, setBuildSummaryLoading] = useState(false);
  const [buildSummaryError, setBuildSummaryError] = useState<string | null>(null);
  const [taskFiles, setTaskFiles] = useState<DatasetFileSummary[]>([]);

  const loadBuildSession = useCallback(async () => {
    if (!taskId || !getBuildSessionSnapshot) return;
    setBuildSummaryLoading(true);
    setBuildSummaryError(null);
    try {
      const result = await getBuildSessionSnapshot(taskId);
      if (result?.success && result?.data) {
        const d = result.data;
        setTask(d.task as Task);
        setBuildSummary({
          agents: d.summary.agents ?? [],
          datasets: d.summary.datasets ?? [],
          tasks: d.summary.tasks ?? [],
          view_specs: d.summary.view_specs ?? [],
        });
        setTaskFiles(Array.isArray(d.task_files) ? d.task_files : []);
        setNotFound(false);
      } else {
        setTask(null);
        setBuildSummary(null);
        setTaskFiles([]);
        setBuildSummaryError(result?.error ?? null);
        setNotFound(true);
      }
    } catch {
      setTask(null);
      setBuildSummary(null);
      setTaskFiles([]);
      setBuildSummaryError("Failed to load build session");
      setNotFound(true);
    } finally {
      setBuildSummaryLoading(false);
      setLoading(false);
    }
  }, [taskId, getBuildSessionSnapshot]);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    void loadBuildSession();
  }, [taskId, loadBuildSession]);

  useEffect(() => {
    if (notFound) {
      router.replace("/agents/new");
    }
  }, [notFound, router]);

  useEffect(() => {
    if (task?.status !== "in_progress") return;
    const intervalMs = 5000;
    const id = window.setInterval(() => {
      void loadBuildSession();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [task?.status, loadBuildSession]);

  const handleRefreshBuildSummary = useCallback(async () => {
    await loadBuildSession();
  }, [loadBuildSession]);

  const handleDeleteTask = useCallback(async () => {
    if (!task?.id || !deleteTask) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      router.push("/agents/new");
    } catch (error) {
      console.error("Failed to delete build task:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [task?.id, deleteTask, router]);

  const handleUpdateTask = useCallback(
    async (updates: Partial<Task>) => {
      if (!task?.id || !updateTask) return;
      try {
        const updateData = {
          title: task.title ?? "Build",
          description: task.description ?? "",
          status: task.status ?? "in_progress",
          agent_id: task.agent_id ?? "",
          assigned_to_id: task.assigned_to_id ?? "",
          ...updates,
        };
        const result = await updateTask(task.id, updateData);
        if (!result.success) throw new Error(result.error ?? "Failed to update task");
        await loadBuildSession();
        if (updates.status === "closed") {
          router.push("/agents/new");
        }
      } catch (error) {
        console.error("Failed to update task:", error);
        throw error;
      }
    },
    [task, updateTask, loadBuildSession, router]
  );

  if (!taskId || loading || notFound) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <CenteredLoading message="Loading…" />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <>
      <BuildSessionView
        task={task}
        onTaskRefetch={loadBuildSession}
        onDelete={() => setShowDeleteDialog(true)}
        onUpdateTask={handleUpdateTask}
        buildSummary={buildSummary}
        buildSummaryLoading={buildSummaryLoading}
        buildSummaryError={buildSummaryError}
        onRefreshBuildSummary={handleRefreshBuildSummary}
        taskFilesSnapshot={taskFiles}
      />
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTask}
        isLoading={isDeleting}
        {...createConfirmationConfig.delete(task.title ?? "Build", "task")}
      />
    </>
  );
}
