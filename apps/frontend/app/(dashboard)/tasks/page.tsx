"use client";

import { useEffect, useState } from "react";
import { TasksTable } from "@workspace/ui/components/tasks-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus,RefreshCw } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { CreateTaskForm } from "@/components/create-task-form";

export default function TasksPage() {
  const router = useRouter();
  const { tasks, tasksLoading, fetchTasks, deleteTask, createTask } = useWorkspaceScopedActions();
  const [showCreateForm, setShowCreateForm] = useState(false);


  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId);
    }
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
      fetchTasks();
    }
    return result;
  };

  const handleTaskCreated = (taskData: any) => {
    setShowCreateForm(false);
    router.push(`/tasks/${taskData.id}`);
  };

  const tasksData = tasks.map((task) => ({
    ...task,
    created: task.created_at || new Date().toISOString(),
    updated: task.updated_at || new Date().toISOString(),
  }));

  const breadcrumbs = [{ label: "Tasks" }];

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleRefresh}
        disabled={tasksLoading.isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${tasksLoading.isLoading ? 'animate-spin' : ''}`} />
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
        {tasksLoading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">Error: {tasksLoading.error}</p>
          </div>
        )}

        {/* Create Task Form */}
        {showCreateForm && (
          <div className="p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">New Task</h3>
            <CreateTaskForm
              onSubmit={handleCreateTask}
              onTaskCreated={handleTaskCreated}
              placeholder="Describe a task..."
              buttonText="Create Task"
            />
          </div>
        )}

        {tasksLoading.isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <TasksTable 
            data={tasksData} 
            onViewTask={handleTaskClick}
          />
        )}
      </div>
    </div>
  );
}
