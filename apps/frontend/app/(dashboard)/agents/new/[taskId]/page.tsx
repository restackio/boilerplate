"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useWorkspaceScopedActions,
  type Task,
} from "@/hooks/use-workspace-scoped-actions";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import {
  ConfirmationDialog,
  createConfirmationConfig,
} from "@workspace/ui/components";
import { BuildSessionView } from "../build-session-view";

export default function NewAgentTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params?.taskId === "string" ? params.taskId : null;
  const { getTaskById, updateTask, deleteTask } = useWorkspaceScopedActions();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadTask = useCallback(async () => {
    if (!taskId || !getTaskById) return;
    setLoading(true);
    setNotFound(false);
    try {
      const result = await getTaskById(taskId);
      if (result?.success && result?.data) {
        setTask(result.data as Task);
      } else {
        setTask(null);
        setNotFound(true);
      }
    } catch {
      setTask(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [taskId, getTaskById]);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    loadTask();
  }, [taskId, loadTask]);

  useEffect(() => {
    if (notFound) {
      router.replace("/agents/new");
    }
  }, [notFound, router]);

  const handleTaskRefetch = useCallback(async () => {
    if (!taskId || !getTaskById) return;
    const result = await getTaskById(taskId);
    if (result?.success && result?.data) {
      setTask(result.data as Task);
    }
  }, [taskId, getTaskById]);

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
      setIsUpdating(true);
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
        await handleTaskRefetch();
        if (updates.status === "closed") {
          router.push("/agents/new");
        }
      } catch (error) {
        console.error("Failed to update task:", error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [task, updateTask, handleTaskRefetch, router]
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
        onTaskRefetch={handleTaskRefetch}
        onDelete={() => setShowDeleteDialog(true)}
        onUpdateTask={handleUpdateTask}
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
