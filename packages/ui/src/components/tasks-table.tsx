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
  team: string;
  agents: string[];
  status: "pending" | "in-progress" | "resolved" | "completed";
  humanReview: string;
  priority: "Low" | "Medium" | "High" | "Critical";
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
    .id("team")
    .accessor((row: Task) => row.team)
    .displayName("Team")
    .icon(Shield)
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
    .id("priority")
    .accessor((row: Task) => row.priority)
    .displayName("Priority")
    .icon(Flag)
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
  { label: "Pending", value: "pending", icon: Clock },
  { label: "In Progress", value: "in-progress", icon: Activity },
  { label: "Resolved", value: "resolved", icon: CheckSquare },
  { label: "Completed", value: "completed", icon: CheckSquare },
];

// Priority options
export const taskPriorityOptions = [
  { label: "Low", value: "Low", icon: Flag },
  { label: "Medium", value: "Medium", icon: Flag },
  { label: "High", value: "High", icon: Flag },
  { label: "Critical", value: "Critical", icon: Flag },
];

// Problem size options
export const taskProblemSizeOptions = [
  { label: "Small", value: "Small", icon: CheckSquare },
  { label: "Medium", value: "Medium", icon: Clock },
  { label: "Large", value: "Large", icon: AlertTriangle },
];

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case "resolved":
      return "bg-green-100 text-green-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "Critical":
      return "bg-red-100 text-red-800";
    case "High":
      return "bg-orange-100 text-orange-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-gray-100 text-gray-800";
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
        team: taskTeamOptions,
        status: taskStatusOptions,
        priority: taskPriorityOptions,
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
              <TableHead>Team</TableHead>
              <TableHead>Agents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Human Review</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {task.id}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`border-0 w-fit`}>
                    {task.team}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {task.agents.slice(0, 2).map((agent, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-primary-foreground rounded px-2 py-1 border"
                      >
                        {agent}
                      </span>
                    ))}
                    {task.agents.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{task.agents.length - 2}
                      </span>
                    )}
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.humanReview}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${getPriorityColor(task.priority)} border-0 w-fit`}
                  >
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewTask?.(task.id)}
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
