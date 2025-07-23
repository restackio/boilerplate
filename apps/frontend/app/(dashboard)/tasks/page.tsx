"use client";

import { useEffect, useState } from "react";
import { TasksTable, type Task } from "@workspace/ui/components/tasks-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { useTaskActions } from "@/hooks/use-workflow-actions";
import { useApiHealth } from "@/hooks/use-workflow-actions";
import { CreateTaskForm } from "@/components/create-task-form";

export default function TasksPage() {
  const router = useRouter();
  const { tasks, loading, fetchTasks, removeTask, createTask } = useTaskActions();
  const { isHealthy, checkHealth } = useApiHealth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
    checkHealth();
  }, [fetchTasks, checkHealth]);

  // Map database tasks to the expected format for the table
  const tasksData: Task[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as "open" | "active" | "waiting" | "closed" | "completed",
    agent_id: task.agent_id,
    agent_name: task.agent_name,
    assigned_to_id: task.assigned_to_id,
    assigned_to_name: task.assigned_to_name,
    created: task.created_at || new Date().toISOString(),
    updated: task.updated_at || new Date().toISOString(),
  }));

  const handleViewTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const handleRefresh = () => {
    fetchTasks();
  };

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
    // Hide the form and redirect to the task details page
    setShowCreateForm(false);
    router.push(`/tasks/${taskData.id}`);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await removeTask(taskId);
    }
  };

  const breadcrumbs = [{ label: "Tasks", href: "/tasks" }];

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleRefresh}
        disabled={loading.isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${loading.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowCreateForm(!showCreateForm)}
      >
        <Plus className="h-4 w-4 mr-1" />
        {showCreateForm ? "Hide Form" : "New Task"}
      </Button>
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-4 space-y-4">
        {loading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Error: {loading.error}
              {!isHealthy && " (API may be unavailable)"}
            </p>
          </div>
        )}

        {/* Create Task Form */}
        {showCreateForm && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <CreateTaskForm
              onSubmit={handleCreateTask}
              onTaskCreated={handleTaskCreated}
              placeholder="Describe a task..."
              buttonText="Create Task"
            />
          </div>
        )}

        {loading.isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <TasksTable data={tasksData} onViewTask={handleViewTask} />
        )}
      </div>
    </div>
  );
}
