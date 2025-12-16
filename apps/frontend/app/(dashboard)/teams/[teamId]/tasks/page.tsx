"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter, useSearchParams, useParams} from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { getTasksByMetric, getTasksByFeedback } from "@/app/actions/tasks-filter";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

import { CreateTaskForm } from "../../../tasks/components/create-task-form";
import { TaskStatsCard } from "../../../tasks/components/task-stats-card";
import TasksTabs from "../../../tasks/tasks-tabs";
import { TasksTable } from "../../../tasks/components/tasks-table";


export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const teamId = params.teamId as string;
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { tasks, tasksLoading, fetchTasks, deleteTask, createTask } = useWorkspaceScopedActions();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filteredTaskIds, setFilteredTaskIds] = useState<string[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);


  useEffect(() => {
    if (isReady && currentWorkspaceId) {
      fetchTasks({ teamId });
    }
  }, [isReady, currentWorkspaceId, fetchTasks, teamId]);

  // Fetch filtered task IDs when metric or feedback filters are present
  useEffect(() => {
    const fetchFilteredTasks = async () => {
      if (!isReady || !currentWorkspaceId) return;

      const metricParam = searchParams.get('metric');
      const metricStatusParam = searchParams.get('metricStatus');
      const feedbackParam = searchParams.get('feedback');
      const dateRangeParam = searchParams.get('dateRange') as "1d" | "7d" | "30d" | "90d" | "all" | null;
      const agentIdParam = searchParams.get('agentId');
      const versionParam = searchParams.get('version');

      // Only filter if metric or feedback params are present
      if (!metricParam && !feedbackParam) {
        setFilteredTaskIds(null);
        return;
      }

      setFilterLoading(true);
      setFilterError(null);

      try {
        if (metricParam) {
          // Filter by metric failure/pass
          const result = await getTasksByMetric({
            workspaceId: currentWorkspaceId,
            metricName: metricParam,
            status: (metricStatusParam as "failed" | "passed") || "failed",
            dateRange: dateRangeParam || "7d",
            agentId: agentIdParam,
            version: versionParam,
          });

          if (result.success) {
            setFilteredTaskIds(result.task_ids);
          } else {
            setFilterError(result.error || "Failed to fetch filtered tasks");
            setFilteredTaskIds([]);
          }
        } else if (feedbackParam) {
          // Filter by feedback
          const result = await getTasksByFeedback({
            workspaceId: currentWorkspaceId,
            feedbackType: (feedbackParam as "positive" | "negative") || "negative",
            dateRange: dateRangeParam || "7d",
            agentId: agentIdParam,
            version: versionParam,
          });

          if (result.success) {
            setFilteredTaskIds(result.task_ids);
          } else {
            setFilterError(result.error || "Failed to fetch filtered tasks");
            setFilteredTaskIds([]);
          }
        }
      } catch (error) {
        console.error("Error fetching filtered tasks:", error);
        setFilterError("An error occurred while filtering tasks");
        setFilteredTaskIds([]);
      } finally {
        setFilterLoading(false);
      }
    };

    fetchFilteredTasks();
  }, [isReady, currentWorkspaceId, searchParams]);

  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const handleRefresh = () => {
    fetchTasks({ teamId });
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
    team_id?: string;
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
    // Transform all tasks first
    const transformedTasks = tasks.map((task) => ({
      ...task,
      created: task.created_at || "",
      updated: task.updated_at || "",
    }));

    // Filter by metric/feedback if filteredTaskIds is set
    if (filteredTaskIds !== null) {
      return transformedTasks.filter(task => filteredTaskIds.includes(task.id));
    }

    // Filter by specific task IDs if provided in URL params (for newly created tasks)
    const tasksParam = searchParams.get('tasks');
    if (tasksParam && searchParams.get('highlight') === 'true') {
      const taskIds = tasksParam.split(',').filter(id => id.trim());
      return transformedTasks.filter(task => taskIds.includes(task.id));
    }

    // Only exclude scheduled tasks when no filters are active
    return transformedTasks.filter(task => !task.schedule_spec);
  }, [tasks, searchParams, filteredTaskIds]);

  // Get initial filters from URL parameters
  const initialFilters = useMemo(() => {
    const filters = [];
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
    const tasksParam = searchParams.get('tasks');
    const assignedParam = searchParams.get('assigned');
    const statusParam = searchParams.get('status');
    const metricParam = searchParams.get('metric');
    const feedbackParam = searchParams.get('feedback');
    
    return !!(tasksParam || assignedParam || statusParam || metricParam || feedbackParam);
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

  // Check if we're showing filtered tasks by metric or feedback
  const metricParam = searchParams.get('metric');
  const feedbackParam = searchParams.get('feedback');
  const isShowingFilteredTasks = !!(metricParam || feedbackParam);

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
              <Button
                onClick={() => router.push('/tasks')}
                variant="link"
                className="text-green-600 hover:text-green-800 text-xs h-auto p-0"
              >
                Clear filter
              </Button>
            </div>
          </div>
        )}

        {/* Show notification for filtered tasks by metric/feedback */}
        {isShowingFilteredTasks && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            {filterLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-blue-800 text-sm">Loading filtered tasks...</p>
              </div>
            ) : filterError ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-800 text-sm font-medium">Error loading filtered tasks</p>
                  <p className="text-red-700 text-xs mt-1">{filterError}</p>
                </div>
                <Button
                  onClick={() => router.push('/tasks')}
                  variant="link"
                  className="text-red-600 hover:text-red-800 text-xs h-auto p-0"
                >
                  Clear filter
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 text-sm font-medium">
                    {metricParam 
                      ? `Showing tasks that ${searchParams.get('metricStatus') || 'failed'} "${metricParam}"`
                      : `Showing tasks with ${feedbackParam} feedback`}
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Found {filteredTaskIds?.length || 0} tasks matching the criteria. Clear filters to see all tasks.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/tasks')}
                  variant="link"
                  className="text-blue-600 hover:text-blue-800 text-xs h-auto p-0"
                >
                  Clear filter
                </Button>
              </div>
            )}
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
              teamId={teamId}
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
            defaultFilters={initialFilters}
            showTeamFilter={false}
          />
        )}
      </div>
    </div>
  );
}
