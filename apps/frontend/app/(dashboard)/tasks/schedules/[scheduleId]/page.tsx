"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { PageHeader } from "@workspace/ui/components/page-header";
import { ScheduleSetupModal } from "@/components/schedule-setup-modal";
import { TasksTable } from "@workspace/ui/components/tasks-table";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { executeWorkflow } from "@/app/actions/workflow";
import { 
  Clock, 
  Edit, 
  Play, 
  Pause, 
  Trash2, 
  Calendar,
  RefreshCw
} from "lucide-react";

interface SchedulePageTask {
  id: string;
  title: string;
  description?: string;
  status: "open" | "active" | "waiting" | "closed" | "completed";
  agent_id: string;
  agent_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  team_id?: string;
  team_name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedule_spec?: any;
  schedule_task_id?: string;
  is_scheduled?: boolean;
  schedule_status?: "active" | "inactive" | "paused";
  restack_schedule_id?: string;
  created_by_id?: string;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  created: string;
  updated: string;
}

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.scheduleId as string;
  
  const [scheduleTask, setScheduleTask] = useState<SchedulePageTask | null>(null);
  const [relatedTasks, setRelatedTasks] = useState<SchedulePageTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { tasks: allTasks, tasksLoading, fetchTasks, isReady } = useWorkspaceScopedActions();

  // Fetch tasks on mount
  useEffect(() => {
    if (isReady) {
      fetchTasks();
    }
  }, [isReady, fetchTasks]);

  // Load schedule data and related tasks
  useEffect(() => {
    const loadScheduleData = () => {
      try {
        // Find the schedule task (the main task that defines the schedule)
        const mainTask = allTasks.find(task => task.id === scheduleId);
        
        if (!mainTask) {
          console.error("Schedule task not found");
          setLoading(false);
          return;
        }

        setScheduleTask({
          ...mainTask,
          created: mainTask.created_at || new Date().toISOString(),
          updated: mainTask.updated_at || new Date().toISOString(),
        });

        // Find all tasks that were created from this schedule
        const related = allTasks
          .filter(task => task.schedule_task_id === scheduleId && task.id !== scheduleId)
          .map(task => ({
            ...task,
            created: task.created_at || new Date().toISOString(),
            updated: task.updated_at || new Date().toISOString(),
          }));
        
        setRelatedTasks(related);
        setLoading(false);
      } catch (error) {
        console.error("Error loading schedule data:", error);
        setLoading(false);
      }
    };

    // Wait for tasks to be loaded, then process the data
    if (!tasksLoading.isLoading && allTasks.length >= 0) {
      loadScheduleData();
    }
  }, [scheduleId, allTasks, tasksLoading.isLoading]);

  // Refresh tasks function
  const handleRefreshTasks = async () => {
    setRefreshing(true);
    try {
      await fetchTasks();
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleScheduleUpdate = async (newScheduleSpec: any) => {
    if (!scheduleTask) return;

    setUpdating(true);
    try {
      // Use the new ScheduleEditWorkflow to update both Temporal and database
      const result = await executeWorkflow("ScheduleEditWorkflow", {
        task_id: scheduleTask.id,
        schedule_spec: newScheduleSpec,
      });

      if (result.success) {
        // Refresh the page data
        window.location.reload();
      } else {
        alert(`Failed to update schedule: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert(`Failed to update schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleScheduleControl = async (action: string) => {
    if (!scheduleTask) return;

    setUpdating(true);
    try {
      const result = await executeWorkflow("ScheduleControlWorkflow", {
        task_id: scheduleTask.id,
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
      setUpdating(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatScheduleDisplay = (scheduleSpec: any): string => {
    if (!scheduleSpec) return "No schedule";

    if (scheduleSpec.calendars) {
      const cal = scheduleSpec.calendars[0];
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[parseInt(cal.dayOfWeek)];
      const time = `${cal.hour.toString().padStart(2, '0')}:${cal.minute.toString().padStart(2, '0')}`;
      const timezone = scheduleSpec.timeZone ? ` (${scheduleSpec.timeZone})` : "";
      return `${dayName} at ${time}${timezone}`;
    }

    if (scheduleSpec.intervals) {
      return `Every ${scheduleSpec.intervals[0].every}`;
    }

    if (scheduleSpec.cron) {
      const timezone = scheduleSpec.timeZone ? ` (${scheduleSpec.timeZone})` : "";
      return `Cron: ${scheduleSpec.cron}${timezone}`;
    }

    return "Unknown schedule";
  };

  const getScheduleStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "inactive":
        return "bg-neutral-100 text-neutral-800 hover:bg-neutral-200";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  if (loading || tasksLoading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (tasksLoading.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Error loading schedule</h2>
          <p className="mt-2 text-muted-foreground">{tasksLoading.error}</p>
          <Button className="mt-4" onClick={() => fetchTasks()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!scheduleTask) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Schedule not found</h2>
          <p className="mt-2 text-muted-foreground">The requested schedule could not be found.</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Schedules", href: "/tasks/schedules" },
    { label: scheduleTask.title },
  ];

  const actions = (
    <div className="flex gap-2">

      <Button 
        variant="ghost" 
        size="sm" 
        disabled={updating}
        onClick={() => {
          if (confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) {
            handleScheduleControl("delete");
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {scheduleTask.schedule_status === "active" ? (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={updating}
          onClick={() => handleScheduleControl("pause")}
        >
          <Pause className="h-4 w-4" />
          Resume
        </Button>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={updating}
          onClick={() => handleScheduleControl("resume")}
        >
          <Play className="h-4 w-4" />
          Resume
        </Button>
      )}

      <ScheduleSetupModal
        trigger={
          <Button variant="default"
          size="sm" disabled={updating}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        }
        initialSchedule={scheduleTask.schedule_spec}
        onScheduleSubmit={handleScheduleUpdate}
        isEditing={true}
      />

    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-4 space-y-4">

        {/* Schedule Details */}
        <div className="rounded-lg border bg-card">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{scheduleTask.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {scheduleTask.description || "No description"}
                </p>
              </div>
              <Badge className={getScheduleStatusColor(scheduleTask.schedule_status)}>
                {scheduleTask.schedule_status || 'unknown'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground mb-1">Schedule</div>
                <div>{formatScheduleDisplay(scheduleTask.schedule_spec)}</div>
              </div>
              
              <div>
                <div className="font-medium text-muted-foreground mb-1">Agent</div>
                <div>{scheduleTask.agent_name || "No agent assigned"}</div>
              </div>

              <div>
                <div className="font-medium text-muted-foreground mb-1">Team</div>
                <div>{scheduleTask.team_name || "No team assigned"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Created from Schedule */}
        <div className="rounded-lg border bg-card">
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Scheduled tasks</h3>
                <p className="text-sm text-muted-foreground">
                  {relatedTasks.length} task{relatedTasks.length !== 1 ? 's' : ''} created from this schedule
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTasks}
                disabled={refreshing || tasksLoading.isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {relatedTasks.length > 0 ? (
              <TasksTable
                data={relatedTasks}
                withFilters={true}
                dashboard={false}
              />
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Tasks will appear here when the schedule runs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
