"use client";

import { useState } from "react";
// ActionButtonGroup, commonActions, ActionButton not currently used but may be needed for future features
import { StatusIcon } from "@workspace/ui/components/status-indicators";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { 
  Clock, 
  Play, 
  Pause, 
  Square as Stop, 
  Edit, 
  Calendar,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { ScheduleSetupDialog, ScheduleSpec } from "./schedule-setup-dialog";
import { executeWorkflow } from "@/app/actions/workflow";
import { getStatusColor } from "../[taskId]/utils/conversation-utils";

interface ScheduleManagementProps {
  task: {
    id: string;
    title: string;
    is_scheduled: boolean;
    schedule_status?: "active" | "inactive" | "paused";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schedule_spec?: any;
    restack_schedule_id?: string;
  };
  onScheduleUpdated?: () => void;
}

export function ScheduleManagement({ task, onScheduleUpdated }: ScheduleManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  // Note: showEditDialog/setShowEditDialog removed as ScheduleSetupDialog handles its own state

  if (!task.is_scheduled) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatScheduleSpec = (spec?: any) => {
    if (!spec) return "No schedule configured";

    if (spec.calendars && spec.calendars.length > 0) {
      const cal = spec.calendars[0];
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `${days[parseInt(cal.dayOfWeek)]} at ${cal.hour}:${cal.minute?.toString().padStart(2, '0') || '00'}`;
    }

    if (spec.intervals && spec.intervals.length > 0) {
      return `Every ${spec.intervals[0].every}`;
    }

    if (spec.cron) {
      return `Cron: ${spec.cron}`;
    }

    return "Custom schedule";
  };

  const handleScheduleAction = async (action: "start" | "stop" | "pause" | "resume" | "delete") => {
    setIsLoading(true);
    try {
      const result = await executeWorkflow("ScheduleControlWorkflow", {
        task_id: task.id,
        action: action,
      });

      if (result.success) {
        onScheduleUpdated?.();
      } else {
        alert(`Failed to ${action} schedule: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} schedule:`, error);
      alert(`Failed to ${action} schedule. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleUpdate = async (scheduleSpec: ScheduleSpec) => {
    setIsLoading(true);
    try {
      const result = await executeWorkflow("ScheduleUpdateWorkflow", {
        task_id: task.id,
        schedule_spec: scheduleSpec,
      });

      if (result.success) {
        onScheduleUpdated?.();
      } else {
        alert(`Failed to update schedule: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to update schedule:", error);
      alert("Failed to update schedule. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Schedule Status Badge */}
      <Badge className={`${getStatusColor(task.schedule_status || "inactive")} border-0 flex items-center gap-1`}>
        <StatusIcon status={(task.schedule_status || "inactive") as "active" | "inactive" | "paused"} size="sm" />
        {task.schedule_status || "inactive"}
      </Badge>

      {/* Schedule Info */}
      <span className="text-sm text-muted-foreground">
        {formatScheduleSpec(task.schedule_spec)}
      </span>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Edit Schedule */}
          <ScheduleSetupDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Schedule
              </DropdownMenuItem>
            }
            onScheduleSubmit={handleScheduleUpdate}
            initialSchedule={task.schedule_spec}
            title="Edit Schedule"
            submitLabel="Update Schedule"
          />

          <DropdownMenuSeparator />

          {/* Control Actions */}
          {task.schedule_status === "active" ? (
            <DropdownMenuItem onClick={() => handleScheduleAction("pause")}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Schedule
            </DropdownMenuItem>
          ) : task.schedule_status === "paused" ? (
            <DropdownMenuItem onClick={() => handleScheduleAction("resume")}>
              <Play className="h-4 w-4 mr-2" />
              Resume Schedule
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleScheduleAction("start")}>
              <Play className="h-4 w-4 mr-2" />
              Start Schedule
            </DropdownMenuItem>
          )}

          {task.schedule_status === "active" && (
            <DropdownMenuItem onClick={() => handleScheduleAction("stop")}>
              <Stop className="h-4 w-4 mr-2" />
              Stop Schedule
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Delete Schedule */}
          <DropdownMenuItem 
            onClick={() => {
              if (confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) {
                handleScheduleAction("delete");
              }
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Schedule
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Schedule info display component for task detail pages
export function ScheduleInfo({ task }: { task: ScheduleManagementProps['task'] }) {
  if (!task.is_scheduled) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatScheduleDetails = (spec?: any) => {
    if (!spec) return "No schedule configured";

    if (spec.calendars && spec.calendars.length > 0) {
      const cal = spec.calendars[0];
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        type: "Calendar",
        description: `Every ${days[parseInt(cal.dayOfWeek)]} at ${cal.hour}:${cal.minute?.toString().padStart(2, '0') || '00'}`,
        icon: Calendar,
      };
    }

    if (spec.intervals && spec.intervals.length > 0) {
      return {
        type: "Interval",
        description: `Runs every ${spec.intervals[0].every}`,
        icon: Clock,
      };
    }

    if (spec.cron) {
      return {
        type: "Cron",
        description: spec.cron,
        icon: Clock,
      };
    }

    return {
      type: "Custom",
      description: "Custom schedule configuration",
      icon: Clock,
    };
  };

  const scheduleDetails = formatScheduleDetails(task.schedule_spec);
  
  // Handle case where scheduleDetails is a string
  if (typeof scheduleDetails === 'string') {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Schedule Configuration</h3>
          </div>
          <Badge variant="outline">None</Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {scheduleDetails}
        </p>
      </div>
    );
  }

  const Icon = scheduleDetails.icon;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Schedule Configuration</h3>
        </div>
        <Badge variant="outline">{scheduleDetails.type}</Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {scheduleDetails.description}
      </p>

      {task.restack_schedule_id && (
        <div className="text-xs text-muted-foreground">
          Schedule ID: {task.restack_schedule_id}
        </div>
      )}
    </div>
  );
}
