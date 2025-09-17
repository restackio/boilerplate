"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import {
  LifeBuoy,
  CheckSquare,
  Clock,
  Users,
  AlertTriangle,
  Eye,
  Activity,
  DollarSign,
  Shield,
  Bot,
  User,
  ClipboardList,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { DataTableFilter } from "@workspace/ui/components/table";
import { createColumnConfigHelper } from "@workspace/ui/components/table/core/filters";
import { useDataTableFilters } from "@workspace/ui/components/table/hooks/use-data-table-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { EmptyState } from "@workspace/ui/components/ui/empty-state";
import Link from "next/link";

// Task data type
export interface Task {
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
  // Schedule-related fields
  schedule_spec?: any; // Schedule specification for scheduled tasks
  schedule_task_id?: string; // If this task was created by a schedule, this points to the parent schedule
  is_scheduled?: boolean; // Whether this task is scheduled
  schedule_status?: string; // Status of the schedule
  restack_schedule_id?: string; // Restack schedule identifier
  created_by_id?: string; // ID of user who created the task
  created_by_name?: string; // Name of user who created the task
  created: string;
  updated: string;
}

// Column configuration helper
const dtf = createColumnConfigHelper<Task>();

// Column configurations
export const taskColumnsConfig = [
  dtf
    .text()
    .id("title")
    .accessor((row: Task) => row.title)
    .displayName("Task Title")
    .icon(Bot)
    .build(),
  dtf
    .option()
    .id("status")
    .accessor((row: Task) => row.status)
    .displayName("Status")
    .icon(Activity)
    .build(),
  dtf
    .option()
    .id("agent")
    .accessor((row: Task) => row.agent_name)
    .displayName("Agent")
    .icon(Shield)
    .build(),
  dtf
    .option()
    .id("team")
    .accessor((row: Task) => row.team_name || "No Team")
    .displayName("Team")
    .icon(Users)
    .build(),
  dtf
    .option()
    .id("created_by")
    .accessor((row: Task) => row.schedule_task_id ? "Schedule" : (row.created_by_name || "User"))
    .displayName("Created by")
    .icon(User)
    .build(),

] as const;

// Level options
export const taskTeamOptions = [
  { label: "Customer Support", value: "Customer Support", icon: User },
  { label: "Sales", value: "Sales", icon: DollarSign },
  { label: "Marketing", value: "Marketing", icon: TrendingUp },
  { label: "Engineering", value: "Engineering", icon: Activity },
  { label: "HR", value: "HR", icon: UserPlus },
];

// Status options
export const taskStatusOptions = [
  { label: "Open", value: "open", icon: Clock },
  { label: "Active", value: "active", icon: Activity },
  { label: "Waiting", value: "waiting", icon: AlertTriangle },
  { label: "Closed", value: "closed", icon: CheckSquare },
  { label: "Completed", value: "completed", icon: CheckSquare },
];

// Agent options (placeholder - would be populated from backend)
export const taskAgentOptions = [
  { label: "GitHub Support Agent", value: "github-support", icon: Bot },
  { label: "Slack Support Agent", value: "slack-support", icon: Bot },
  { label: "Email Support Agent", value: "email-support", icon: Bot },
  { label: "Alerts Monitor Agent", value: "alerts-monitor", icon: Bot },
  { label: "Intercom Support Agent", value: "intercom-support", icon: Bot },
];

// Created by options
export const taskCreatedByOptions = [
  { label: "Schedule", value: "Schedule", icon: Clock },
  { label: "User", value: "User", icon: User },
];



// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "active":
      return "bg-blue-100 text-blue-800";
    case "waiting":
      return "bg-yellow-100 text-yellow-800";
    case "closed":
      return "bg-neutral-100 text-neutral-800";
    case "open":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-neutral-100 text-neutral-800";
  }
};



interface TasksTableProps {
  data: Task[];
  onViewTask?: (taskId: string) => void;
  withFilters?: boolean;
  teams?: Array<{ label: string; value: string; icon: any }>;
  defaultFilters?: any[];
  dashboard?: boolean;
}

export function TasksTable({
  data,
  onViewTask,
  withFilters = true,
  teams = [],
  defaultFilters = [],
  dashboard = false,
}: TasksTableProps) {
  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: taskColumnsConfig,
      defaultFilters,
      options: {
        status: taskStatusOptions,
        agent: taskAgentOptions,
        team: teams,
        created_by: taskCreatedByOptions,
      },
    });

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-12 w-12" />}
        title="No tasks yet"
        description="Tasks will appear here when you create them. Start by describing what you need help with in the dashboard."
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
                <TableHead className="w-2/5">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell" >Agent</TableHead>
                <TableHead className="hidden md:table-cell" >Team</TableHead>
                <TableHead className="hidden lg:table-cell" >Created by</TableHead>
                {!dashboard && <TableHead className="hidden lg:table-cell" >Assigned to</TableHead>}
                <TableHead className="hidden lg:table-cell" >Updated</TableHead>
                {!dashboard && <TableHead >Actions</TableHead>}
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredData.map((task) => (
              <TableRow key={task.id} className="hover:bg-muted/50">
                <TableCell className="p-3">
                  <Link href={`/tasks/${task.id}`} className="block">
                    <div className="space-y-1">
                      <div className="font-medium truncate hover:underline">{task.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {task.description}
                      </div>
                      {/* Show agent and team info on mobile when columns are hidden */}
                      <div className="sm:hidden flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Bot className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{task.agent_name}</span>
                        </span>
                        {task.team_name && (
                          <span className="flex items-center gap-1 truncate">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{task.team_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="p-3">
                  <Badge
                    className={`${getStatusColor(task.status)} border-0 w-fit text-xs`}
                  >
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell p-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{task.agent_name}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell p-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{task.team_name || "No Team"}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell p-3">
                  {task.schedule_task_id ? (
                    <Link 
                      href={`/tasks/schedules/${task.schedule_task_id}`}
                      className="flex items-center space-x-2 hover:underline"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">Schedule</span>
                    </Link>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{task.created_by_name || "User"}</span>
                    </div>
                  )}
                </TableCell>
                {!dashboard && <TableCell className="hidden lg:table-cell p-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{task.assigned_to_name}</span>
                  </div>
                </TableCell>}
                <TableCell className="hidden lg:table-cell p-3">
                  {new Date(task.updated).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </TableCell>
                {!dashboard && <TableCell className="p-3">
                  <Link href={`/tasks/${task.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <span>
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="inline">View</span>
                      </span>
                    </Button>
                  </Link>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
