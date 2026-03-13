"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useWorkspaceScopedActions,
  type Task,
} from "@/hooks/use-workspace-scoped-actions";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import { BuildSessionView } from "@/app/(dashboard)/build/build-session-view";

export default function NewAgentTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params?.taskId === "string" ? params.taskId : null;
  const { getTaskById } = useWorkspaceScopedActions();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  return <BuildSessionView task={task} onTaskRefetch={handleTaskRefetch} />;
}
