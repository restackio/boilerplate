"use client";

import { useEffect, useState, useMemo } from "react";
import { TasksTable } from "./components/tasks-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Users } from "lucide-react";
import { getLucideIcon } from "@workspace/ui/lib/get-lucide-icon";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { CreateTaskForm } from "./components/create-task-form";
import { TaskStatsCard } from "./components/task-stats-card";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import TasksTabs from "./tasks-tabs";

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
    return result;
  };

  const handleTaskCreated = async (taskData: { id: string }) => {
    setShowCreateForm(false);
    router.push(`/tasks/${taskData.id}`);
  };

  // Transform and filter tasks data
  const tasksData = useMemo(() => {
    const transformedTasks = tasks
      .filter(task => !task.schedule_spec) // Exclude tasks with schedule_spec - those belong in /schedules
      .map((task) => ({
        ...task,
        created: task.created_at || new Date().toISOString(),
        updated: task.updated_at || new Date().toISOString(),
      }));

    // Filter by specific task IDs if provided in URL params
    const tasksParam = searchParams.get('tasks');
    if (tasksParam && searchParams.get('highlight') === 'true') {
      const taskIds = tasksParam.split(',').filter(id => id.trim());
      return transformedTasks.filter(task => taskIds.includes(task.id));
    }

    return transformedTasks;
  }, [tasks, searchParams]);

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
        options.push({ 
          label: team.name, 
          value: team.name, 
          icon: getLucideIcon(team.icon) 
        });
      }
    });
    
    return options;
  }, [teams]);

  // Get initial filters from URL parameters
  const initialFilters = useMemo(() => {
    const filters = [];
    
    // Handle team filtering
    const teamParam = searchParams.get('team');
    if (teamParam) {
      filters.push({
        columnId: 'team',
        type: 'option' as const,
        operator: 'is any of' as const,
        values: [teamParam],
      });
    }
    
    // Handle status filtering
    const statusParam = searchParams.get('status');
    if (statusParam) {
      filters.push({
        columnId: 'status',
        type: 'option' as const,
        operator: 'is any of' as const,
        values: [statusParam],
      });
    }
    
    // Handle task IDs filtering for newly created tasks
    // Since we can't filter by ID directly, we'll store the task IDs for client-side filtering
    const tasksParam = searchParams.get('tasks');
    if (tasksParam) {
      // We'll handle this differently - by filtering the data directly in the component
      // rather than using the table's filter system
    }
    
    return filters;
  }, [searchParams]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const teamParam = searchParams.get('team');
    const tasksParam = searchParams.get('tasks');
    const assignedParam = searchParams.get('assigned');
    const statusParam = searchParams.get('status');
    
    return !!(teamParam || tasksParam || assignedParam || statusParam);
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
        size="sm"
        onClick={() => setShowCreateForm(!showCreateForm)}
      >
        <Plus className="h-4 w-4 mr-1" />
        {showCreateForm ? "Hide Form" : "New Task"}
      </Button>
    </div>
  );

  // Check if we're showing newly created tasks
  const tasksParam = searchParams.get('tasks');
  const highlightParam = searchParams.get('highlight');
  // const createdParam = searchParams.get('created'); // Currently unused
  const isShowingNewTasks = tasksParam && highlightParam === 'true';

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <TasksTabs />
      <div className="p-4 space-y-4">{/* Following agents pattern with proper spacing */}
        {/* Task Statistics Card - only show when no filters are active */}
        {!hasActiveFilters && <TaskStatsCard />}

        {/* Show notification for newly created tasks */}
        {isShowingNewTasks && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 text-sm font-medium">
                  Created {tasksParam.split(',').length} new tasks
                </p>
                <p className="text-green-700 text-xs mt-1">
                  The tasks below are filtered to show only newly created tasks. Clear filters to see all tasks.
                </p>
              </div>
              <button
                onClick={() => router.push('/tasks')}
                className="text-green-600 hover:text-green-800 text-xs underline"
              >
                Clear filter
              </button>
            </div>
          </div>
        )}

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
