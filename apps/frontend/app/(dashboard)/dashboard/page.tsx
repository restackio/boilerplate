"use client";

import { useState, useEffect } from "react";
import { TasksTable, type Task as UITask } from "@workspace/ui/components/tasks-table";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-context";
import { useTaskActions, type Task as BackendTask } from "@/hooks/use-workflow-actions";
import { Loader2 } from "lucide-react";
import { CreateTaskForm } from "@/components/create-task-form";

// Convert backend Task to UI Task format
const convertBackendTaskToUITask = (backendTask: BackendTask): UITask => {
  return {
    id: backendTask.id,
    title: backendTask.title,
    description: backendTask.description,
    status: backendTask.status as UITask["status"],
    agent_id: backendTask.agent_id,
    agent_name: backendTask.agent_name,
    assigned_to_id: backendTask.assigned_to_id,
    assigned_to_name: backendTask.assigned_to_name,
    created: backendTask.created_at || new Date().toISOString(),
    updated: backendTask.updated_at || new Date().toISOString(),
  };
};

export default function DashboardPage() {
  const [, setChatHistory] = useState([
    {
      role: "system",
      message:
        "Hello! I'm here to help you create tasks for our support automation system. Describe what you need help with.",
    },
  ]);

  // Get real task data from backend
  const { tasks, loading, fetchTasks, createTask } = useTaskActions();
  const router = useRouter();

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Convert backend tasks to UI format and show only first 3 for dashboard
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
      fetchTasks(); // Refresh the list
    }
    return result;
  };

  const handleTaskCreated = (taskData: any) => {
    // Redirect to the task details page
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
        buttonText="Create Task"
      />

      {/* My Tasks */}
      {loading.isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : loading.error ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load tasks: {loading.error}</p>
        </div>
      ) : (
        <TasksTable
          data={tasksData}
          withFilters={false}
          onViewTask={handleViewTask}
        />
      )}
    </div>
  );
}
