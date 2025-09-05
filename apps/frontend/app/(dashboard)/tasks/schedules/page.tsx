"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { SchedulesTable } from "@workspace/ui/components/schedules-table";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { executeWorkflow } from "@/app/actions/workflow";
import TasksTabs from "../TasksTabs";
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
  
  const { tasks: allTasks, teams, agents, tasksLoading, fetchTasks, fetchTeams, fetchAgents, isReady } = useWorkspaceScopedActions();

  // Fetch data on mount
  useEffect(() => {
    if (isReady) {
      fetchTasks();
      fetchTeams();
      fetchAgents();
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
        created: task.created_at || new Date().toISOString(),
        updated: task.updated_at || new Date().toISOString(),
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

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleRefresh}
        disabled={tasksLoading.isLoading || updating !== null}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${tasksLoading.isLoading || updating !== null ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => router.push('/tasks')}
      >
        <Plus className="h-4 w-4 mr-1" />
        New Schedule
      </Button>
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <TasksTabs />
      <div className="p-4 space-y-4">
        {/* Error state */}
        {tasksLoading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">Error: {tasksLoading.error}</p>
          </div>
        )}

        {/* Loading state */}
        {tasksLoading.isLoading && allTasks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading schedules...</p>
            </div>
          </div>
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
    </div>
  );
}
