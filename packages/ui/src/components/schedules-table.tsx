"use client";

import {
  Clock,
  Users,
  Bot,
  Activity,
  Calendar,
  Edit3,
  Play,
  Pause,
  Square,
  Trash2,
  Eye,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DataTableFilter } from "./table/index";
import { createColumnConfigHelper } from "./table/core/filters";
import { useDataTableFilters } from "./table/hooks/use-data-table-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { EmptyState } from "./ui/empty-state";
import Link from "next/link";

// Schedule data type
export interface Schedule {
  id: string;
  title: string;
  description?: string;
  schedule_spec?: any;
  schedule_status?: "active" | "inactive" | "paused";
  agent_name?: string;
  team_name?: string;
  created: string;
  updated: string;
  task_count: number; // Number of tasks created from this schedule
}

// Timezone-aware display helpers
const formatScheduleDisplay = (scheduleSpec: any, userTimezone?: string): string => {
  if (!scheduleSpec) return "No schedule";
  
  const displayTimezone = userTimezone || (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  })();

  if (scheduleSpec.calendars) {
    const cal = scheduleSpec.calendars[0];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[parseInt(cal.dayOfWeek)];
    const time = `${cal.hour.toString().padStart(2, '0')}:${cal.minute.toString().padStart(2, '0')}`;
    
    const timezoneDisplay = scheduleSpec.timeZone !== displayTimezone 
      ? ` (${scheduleSpec.timeZone})` 
      : "";
    
    return `${dayName} at ${time}${timezoneDisplay}`;
  }
  
  if (scheduleSpec.intervals) {
    return `Every ${scheduleSpec.intervals[0].every}`;
  }
  
  if (scheduleSpec.cron) {
    const timezoneDisplay = scheduleSpec.timeZone !== displayTimezone 
      ? ` (${scheduleSpec.timeZone})` 
      : "";
    return `Cron: ${scheduleSpec.cron}${timezoneDisplay}`;
  }
  
  return "Unknown schedule";
};

// Helper function for schedule status colors
const getScheduleStatusColor = (status?: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "inactive":
      return "bg-neutral-100 text-neutral-800";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
};

// Column configuration helper
const dtf = createColumnConfigHelper<Schedule>();

// Column configurations for schedules
export const scheduleColumnsConfig = [
  dtf
    .text()
    .id("title")
    .accessor((row: Schedule) => row.title)
    .displayName("Schedule Name")
    .icon(Calendar)
    .build(),
  dtf
    .option()
    .id("schedule_status")
    .accessor((row: Schedule) => row.schedule_status || "inactive")
    .displayName("Status")
    .icon(Activity)
    .build(),
  dtf
    .option()
    .id("agent")
    .accessor((row: Schedule) => row.agent_name || "No Agent")
    .displayName("Agent")
    .icon(Bot)
    .build(),
  dtf
    .option()
    .id("team")
    .accessor((row: Schedule) => row.team_name || "No Team")
    .displayName("Team")
    .icon(Users)
    .build(),
] as const;

// Schedule status options
export const scheduleStatusOptions = [
  { label: "Active", value: "active", icon: Activity },
  { label: "Inactive", value: "inactive", icon: Clock },
  { label: "Paused", value: "paused", icon: Pause },
];

interface SchedulesTableProps {
  data: Schedule[];
  onScheduleClick?: (scheduleId: string) => void;
  withFilters?: boolean;
  teams?: Array<{ label: string; value: string; icon: any }>;
  agents?: Array<{ label: string; value: string; icon: any }>;
  defaultFilters?: any[];
  showSearch?: boolean;
  onScheduleControl?: (scheduleId: string, action: string) => Promise<void>;
}

export function SchedulesTable({
  data,
  onScheduleClick,
  withFilters = true,
  teams = [],
  agents = [],
  defaultFilters = [],
  showSearch = true,
  onScheduleControl,
}: SchedulesTableProps) {
  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: scheduleColumnsConfig,
      defaultFilters,
      options: {
        schedule_status: scheduleStatusOptions,
        agent: agents,
        team: teams,
      },
    });

  // Show empty state if no data after filtering
  if (filteredData.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        title="No schedules found"
        description={data.length === 0 ? "Create a first scheduled task to see it here." : "No schedules match the current filters."}
        action={{
          label: "+ New schedule",
          onClick: () => window.location.href = "/tasks/schedules"
        }}
      />
    );
  }

  return (
    <div className="space-y-4 w-full">
      {withFilters && (
        <DataTableFilter
          filters={filters}
          columns={columns}
          actions={actions}
          strategy={strategy}
        />
      )}

      <div className="w-full overflow-hidden">
        <div className="rounded-md border overflow-x-auto max-w-full">
          <Table className="w-full" style={{ tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Agent</TableHead>
                <TableHead className="hidden md:table-cell">Team</TableHead>
                <TableHead className="hidden lg:table-cell">Tasks Created</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((schedule) => (
                <TableRow key={schedule.id} className="hover:bg-muted/50">
                  <TableCell className="p-3">
                    <Link href={`/tasks/schedules/${schedule.id}`} className="block">
                      <div className="space-y-1">
                        <div className="font-medium truncate hover:underline">{formatScheduleDisplay(schedule.schedule_spec)}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {schedule.title}
                        </div>
                        {/* Show agent and team info on mobile when columns are hidden */}
                        <div className="sm:hidden flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <Bot className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{schedule.agent_name || "No Agent"}</span>
                          </span>
                          {schedule.team_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{schedule.team_name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="p-3">
                    <Badge
                      className={`${getScheduleStatusColor(schedule.schedule_status)} border-0 w-fit text-xs`}
                    >
                      {schedule.schedule_status || 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell p-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{schedule.agent_name || "No Agent"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell p-3">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{schedule.team_name || "No Team"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell p-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{schedule.task_count} task{schedule.task_count !== 1 ? 's' : ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell p-3">
                    {new Date(schedule.updated).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex items-center space-x-1">
                      {schedule.schedule_status === "active" ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScheduleControl?.(schedule.id, "pause");
                          }}
                        >
                          <Pause className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Pause</span>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScheduleControl?.(schedule.id, "start");
                          }}
                        >
                          <Play className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Start</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
