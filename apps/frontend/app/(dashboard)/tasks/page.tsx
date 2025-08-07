"use client";

import { useEffect, useState, useMemo } from "react";
import { TasksTable } from "@workspace/ui/components/tasks-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Users } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { CreateTaskForm } from "@/components/create-task-form";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { tasks, tasksLoading, fetchTasks, deleteTask, createTask, teams, fetchTeams } = useWorkspaceScopedActions();
  const [showCreateForm, setShowCreateForm] = useState(false);


  useEffect(() => {
    if (isReady && currentWorkspaceId) {
      fetchTasks();
      fetchTeams();
    }
  }, [isReady, currentWorkspaceId, fetchTasks, fetchTeams]);

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
  void handleDeleteTask; // Suppress unused warning - function ready for future use

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    status: "open" | "active" | "waiting" | "closed" | "completed";
    agent_id: string;
    assigned_to_id: string;
  }) => {
    console.log("🔄 [TasksPage] handleCreateTask called with:", taskData);
    const startTime = Date.now();
    
    const result = await createTask(taskData);
    
    const endTime = Date.now();
    console.log(`✅ [TasksPage] createTask completed in ${endTime - startTime}ms`);
    console.log("✅ [TasksPage] createTask result:", result);
    
    if (result.success) {
      console.log("✅ [TasksPage] Task created successfully");
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [TasksPage] handleCreateTask total time: ${totalTime}ms`);
    return result;
  };

  const handleTaskCreated = async (taskData: { id: string }) => {
    console.log("🔄 [TasksPage] handleTaskCreated called with:", taskData);
    const startTime = Date.now();
    
    setShowCreateForm(false);
    
    // Navigate immediately to the task page
    console.log("🔄 [TasksPage] About to navigate to:", `/tasks/${taskData.id}`);
    router.push(`/tasks/${taskData.id}`);
    
    const endTime = Date.now();
    console.log(`✅ [TasksPage] handleTaskCreated completed in ${endTime - startTime}ms`);
  };

  const tasksData = tasks.map((task) => ({
    ...task,
    created: task.created_at || new Date().toISOString(),
    updated: task.updated_at || new Date().toISOString(),
  }));

  // Create team options for filtering
  const teamOptions = useMemo(() => {
    const uniqueTeams = new Set<string>();
    const options = [];
    
    // Add "No Team" option
    options.push({ label: "No Team", value: "No Team", icon: Users });
    
    // Add teams from the teams list
    teams.forEach((team) => {
      if (!uniqueTeams.has(team.name)) {
        uniqueTeams.add(team.name);
        options.push({ label: team.name, value: team.name, icon: Users });
      }
    });
    
    return options;
  }, [teams]);

  // Get initial filters from URL parameters
  const initialFilters = useMemo(() => {
    const teamParam = searchParams.get('team');
    if (teamParam) {
      return [
        {
          columnId: 'team',
          type: 'option' as const,
          operator: 'is any of' as const,
          values: [teamParam],
        },
      ];
    }
    return [];
  }, [searchParams]);

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

        {/* Create task Form */}
        {showCreateForm && (
          <div className="p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">New Task</h3>
            <CreateTaskForm
              onSubmit={handleCreateTask}
              onTaskCreated={handleTaskCreated}
              placeholder="Describe a task..."
              buttonText="Create task"
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
            teams={teamOptions}
            defaultFilters={initialFilters}
          />
        )}
      </div>
    </div>
  );
}
