"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtonGroup, type ActionButton } from "@workspace/ui/components/action-button-group";
import { PageHeader } from "@workspace/ui/components/page-header";
import { SchedulesTable } from "@workspace/ui/components/schedules-table";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import { NotificationBanner } from "@workspace/ui/components/notification-banner";
import { QuickActionDialog, useQuickActionDialog } from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { executeWorkflow } from "@/app/actions/workflow";
import { CreateTaskForm } from "../components/create-task-form";
import TasksTabs from "../tasks-tabs";
import { 
  Bot,
  Plus,
  RefreshCw
} from "lucide-react";

interface ScheduleOverview {
  id: string;
  title: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedule_spec?: any;
  schedule_status?: "active" | "inactive" | "paused";
  agent_name?: string;
  team_name?: string;
  created: string;
  updated: string;
  task_count: number; // Number of tasks created from this schedule
}

export default function SchedulesPage() {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const { isOpen, open, close } = useQuickActionDialog();
  
  const { tasks: allTasks, teams, agents, tasksLoading, fetchTasks, fetchTeams, fetchAgents, createTask, isReady } = useWorkspaceScopedActions();

  // Fetch data on mount
  useEffect(() => {
    if (isReady) {
      fetchTasks();
      fetchTeams();
      fetchAgents({ publishedOnly: true });
    }
  }, [isReady, fetchTasks, fetchTeams, fetchAgents]);

  // Get all tasks with schedule_spec (both schedule definitions and scheduled tasks)
  const schedules: ScheduleOverview[] = allTasks
    .filter(task => task.schedule_spec) // All tasks with schedule_spec
    .map(task => {
      // For schedule definition tasks, count how many tasks were created from them
      // For scheduled tasks created from a schedule, show 0 (they don't create other tasks)
      const taskCount = task.schedule_task_id 
        ? 0 // This is a task created from a schedule
        : allTasks.filter(t => t.schedule_task_id === task.id).length; // This is a schedule definition
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        schedule_spec: task.schedule_spec,
        schedule_status: task.schedule_status,
        agent_name: task.agent_name,
        team_name: task.team_name,
        created: task.created_at || "",
        updated: task.updated_at || "",
        task_count: taskCount,
      };
    });

  const handleScheduleControl = async (scheduleId: string, action: string) => {
    setUpdating(scheduleId);
    try {
      const result = await executeWorkflow("ScheduleControlWorkflow", {
        task_id: scheduleId,
        action: action,
      });

      if (result.success) {
        // Refresh the page data
        window.location.reload();
      } else {
        alert(`Failed to ${action} schedule: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error ${action} schedule:`, error);
      alert(`Failed to ${action} schedule`);
    } finally {
      setUpdating(null);
    }
  };

  const handleScheduleClick = (scheduleId: string) => {
    router.push(`/tasks/schedules/${scheduleId}`);
  };

  const handleRefresh = () => {
    fetchTasks();
  };

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

  const handleTaskCreated = async () => {
    // Close the dialog
    close();
    // The CreateTaskForm will navigate to the schedule page automatically
  };

  // Format teams and agents for the table
  const formattedTeams = teams.map(team => ({
    label: team.name,
    value: team.name,
    icon: team.icon,
  }));

  const formattedAgents = agents.map(agent => ({
    label: agent.name,
    value: agent.name,
    icon: Bot,
  }));

  const breadcrumbs = [{ label: "Schedules" }];

  // Define action buttons using our ActionButtonGroup
  const actionButtons: ActionButton[] = [
    {
      key: "refresh",
      label: "Refresh",
      icon: RefreshCw,
      variant: "outline",
      loading: tasksLoading.isLoading || updating !== null,
      onClick: handleRefresh,
    },
    {
      key: "create",
      label: "New Schedule",
      icon: Plus,
      variant: "ghost",
      onClick: open,
    },
  ];

  const actions = (
    <ActionButtonGroup actions={actionButtons} />
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <TasksTabs />
      <div className="p-4 space-y-4">
        {/* Error state */}
        {tasksLoading.error && (
          <NotificationBanner
            variant="error"
            title="Error"
            description={`Failed to load schedules: ${tasksLoading.error}`}
            dismissible={false}
          />
        )}

        {/* Loading state */}
        {tasksLoading.isLoading && allTasks.length === 0 ? (
          <CenteredLoading message="Loading schedules..." height="h-64" />
        ) : (
          <SchedulesTable
            data={schedules}
            onScheduleClick={handleScheduleClick}
            onScheduleControl={handleScheduleControl}
            teams={formattedTeams}
            agents={formattedAgents}
            withFilters={true}
            showSearch={true}
          />
        )}
      </div>

      {/* Create Schedule Dialog */}
      <QuickActionDialog
        isOpen={isOpen}
        onClose={close}
        title="Create New Schedule"
        description="Create a new scheduled task that will run automatically"
        size="xl"
      >
        <CreateTaskForm
          onSubmit={handleCreateTask}
          onTaskCreated={handleTaskCreated}
          placeholder="Describe the task to be scheduled..."
          buttonText="Create schedule"
        />
      </QuickActionDialog>
    </div>
  );
}
