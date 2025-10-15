"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TasksTable, type Task as UITask } from "../tasks/components/tasks-table";
import { ErrorNotification } from "@workspace/ui/components";
import { useWorkspaceScopedActions, type Task as HookTask } from "@/hooks/use-workspace-scoped-actions";
import { CreateTaskForm } from "../tasks/components/create-task-form";
import { DashboardSkeleton } from "./components/dashboard-skeleton";
import { RefreshCw } from "lucide-react";

function convertHookTaskToUITask(hookTask: HookTask): UITask {
  return {
    id: hookTask.id,
    title: hookTask.title,
    description: hookTask.description,
    status: hookTask.status,
    agent_id: hookTask.agent_id,
    agent_name: hookTask.agent_name,
    assigned_to_id: hookTask.assigned_to_id,
    assigned_to_name: hookTask.assigned_to_name,
    team_id: hookTask.team_id,
    team_name: hookTask.team_name,
    // Schedule-related fields
    schedule_spec: hookTask.schedule_spec,
    schedule_task_id: hookTask.schedule_task_id,
    is_scheduled: hookTask.is_scheduled,
    schedule_status: hookTask.schedule_status,
    restack_schedule_id: hookTask.restack_schedule_id,
    created: hookTask.created_at || "",
    updated: hookTask.updated_at || "",
  };
}

export default function DashboardPage() {

  const { tasks, tasksLoading, fetchTasks, createTask } = useWorkspaceScopedActions();
  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const tasksData: UITask[] = tasks.slice(0, 10).map(convertHookTaskToUITask);

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    status: "in_progress" | "in_review" | "closed" | "completed";
    agent_id: string;
    assigned_to_id: string;
    // Schedule-related fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schedule_spec?: any;
    is_scheduled?: boolean;
    schedule_status?: string;
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
    <div className="min-h-screen w-full max-w-screen-lg mx-auto overflow-x-hidden">
      <div className="space-y-6 md:space-y-10 max-w-full mx-auto p-4 md:p-6 pt-8 md:pt-20">
        <div className="flex justify-center items-center text-center">
          <h1 className="text-2xl md:text-3xl font-semibold px-4">What are we doing next?</h1>
        </div>

      <CreateTaskForm 
        onSubmit={handleCreateTask}
        onTaskCreated={handleTaskCreated}
        placeholder="Describe a task"
        buttonText="Create task"
      />

      {/* My tasks */}
      {tasksLoading.isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My tasks</h2>
            <button
              className="text-sm text-primary hover:underline"
            >
              View all tasks →
            </button>
          </div>
          <div className="rounded-lg border">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30">
              <div className="col-span-3 text-sm font-medium">Task</div>
              <div className="col-span-2 text-sm font-medium">Status</div>
              <div className="col-span-2 text-sm font-medium">Agent</div>
              <div className="col-span-2 text-sm font-medium">Team</div>
              <div className="col-span-2 text-sm font-medium">Created by</div>
              <div className="col-span-1 text-sm font-medium">Updated</div>
            </div>
            <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
          </div>
        </div>
      ) : tasksLoading.error ? (
        <ErrorNotification error={`Failed to load tasks: ${tasksLoading.error}`} />
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
            dashboard={true}
          />
        </div>
      )}
      </div>
    </div>
  );
}
