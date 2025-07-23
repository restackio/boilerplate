"use client";

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
  Flag,
  Bot,
  User,
  ClipboardList,
  TrendingUp,
  UserPlus,
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

// Problem size options
export const taskProblemSizeOptions = [
  { label: "Small", value: "Small", icon: CheckSquare },
  { label: "Medium", value: "Medium", icon: Clock },
  { label: "Large", value: "Large", icon: AlertTriangle },
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
      return "bg-gray-100 text-gray-800";
    case "open":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

interface TasksTableProps {
  data: Task[];
  onViewTask?: (taskId: string) => void;
  withFilters?: boolean;
}

export function TasksTable({
  data,
  onViewTask,
  withFilters = true,
}: TasksTableProps) {
  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: taskColumnsConfig,
      options: {
        status: taskStatusOptions,
        agent: taskAgentOptions,
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
    <div className="space-y-4">
      {withFilters && (
        <DataTableFilter
          filters={filters}
          columns={columns}
          actions={actions}
          strategy={strategy}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((task) => (
              <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewTask?.(task.id)}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {task.id}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${getStatusColor(task.status)} border-0 w-fit`}
                  >
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.agent_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.assigned_to_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTask?.(task.id);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
