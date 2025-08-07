"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TasksTable, type Task as UITask } from "@workspace/ui/components/tasks-table";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { CreateTaskForm } from "@/components/create-task-form";
import { Loader2 } from "lucide-react";

interface BackendTask {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  user_id: string;
}

function convertBackendTaskToUITask(backendTask: BackendTask): UITask {
  return {
    id: backendTask.id,
    title: backendTask.title,
    description: backendTask.description,
    status: backendTask.status as "open" | "active" | "waiting" | "closed" | "completed",
    agent_id: backendTask.agent_id,
    agent_name: backendTask.agent_name,
    assigned_to_id: backendTask.assigned_to_id,
    assigned_to_name: backendTask.assigned_to_name,
    created: backendTask.created_at || new Date().toISOString(),
    updated: backendTask.updated_at || new Date().toISOString(),
  };
}

export default function DashboardPage() {

  const { tasks, tasksLoading, fetchTasks, createTask } = useWorkspaceScopedActions();
  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const tasksData: UITask[] = tasks.slice(0, 3).map(convertBackendTaskToUITask);

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    status: "open" | "active" | "waiting" | "closed" | "completed";
    agent_id: string;
    assigned_to_id: string;
  }) => {
    const result = await createTask(taskData);
    if (result.success) {
      fetchTasks();
    }
    return result;
  };

  const handleTaskCreated = (taskData: { id: string }) => {
    router.push(`/tasks/${taskData.id}`);
  };

  const handleViewTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  return (
    <div className="space-y-10 max-w-screen-lg mx-auto p-4 pt-20">
      <div className="flex justify-center items-center ">
        <h1 className="text-3xl font-semibold">What are we doing next?</h1>
      </div>

      <CreateTaskForm 
        onSubmit={handleCreateTask}
        onTaskCreated={handleTaskCreated}
        placeholder="Describe a task"
        buttonText="Create task"
      />

      {/* My tasks */}
      {tasksLoading.isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tasksLoading.error ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load tasks: {tasksLoading.error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My tasks</h2>
            <button
              onClick={() => router.push("/tasks")}
              className="text-sm text-primary hover:underline"
            >
              View all tasks →
            </button>
          </div>
          <TasksTable 
            data={tasksData} 
            onViewTask={handleViewTask}
            withFilters={false}
          />
        </div>
      )}
    </div>
  );
}
