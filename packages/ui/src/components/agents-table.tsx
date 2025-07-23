"use client";

import {
  Github,
  Mail,
  Slack,
  Server,
  Crown,
  Shield,
  Users,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Bot,
  ThumbsUp,
  GitBranch,
  Clock,
  DollarSign,
  Brain,
  HelpCircle,
  ChevronRight,
  Hash,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Badge } from "./ui/badge";
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

export interface Agent {
  id: string;
  name: string;
  version: string;
  description?: string;
  instructions: string;
  status: "active" | "inactive";
  parent_agent_id?: string;
  created_at?: string;
  updated_at?: string;
  version_count?: number;
  latest_version?: string;
}

// Column configuration helper
const dtf = createColumnConfigHelper<Agent>();

// Column configurations
export const agentColumnsConfig = [
  dtf
    .text()
    .id("name")
    .accessor((row: Agent) => row.name)
    .displayName("Agent Name")
    .icon(Bot)
    .build(),
  dtf
    .option()
    .id("status")
    .accessor((row: Agent) => row.status)
    .displayName("Status")
    .icon(CheckCircle)
    .build(),
] as const;

// Status options
export const statusOptions: Array<{ label: string; value: string; icon: any }> =
  [
    { label: "Active", value: "active", icon: Play },
    { label: "Inactive", value: "inactive", icon: Pause },
  ];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "inactive":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Play className="h-3 w-3" />;
    case "inactive":
      return <Pause className="h-3 w-3" />;
    default:
      return <AlertTriangle className="h-3 w-3" />;
  }
};

interface AgentsTableProps {
  data: Agent[];
  onRowClick?: (agentId: string) => void;
}

export function AgentsTable({ data, onRowClick }: AgentsTableProps) {
  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: agentColumnsConfig,
      options: {
        status: statusOptions,
      },
    });

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Bot className="h-12 w-12" />}
        title="No agents yet"
        description="AI agents will appear here when you create them. Agents help automate your support workflow across different channels."
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <DataTableFilter
          filters={filters}
          columns={columns}
          actions={actions}
          strategy={strategy}
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest Version</TableHead>
                <TableHead>Versions</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((agent) => (
                <TableRow
                  key={agent.id}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors group" : ""
                  }
                  onClick={() => onRowClick?.(agent.id)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {agent.name}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {agent.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getStatusColor(agent.status)} border-0 flex items-center space-x-1 w-fit`}
                    >
                      {getStatusIcon(agent.status)}
                      <span>{agent.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="font-mono text-xs">
                            {agent.latest_version || agent.version}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Latest version: {agent.latest_version || agent.version}</p>
                        {agent.version_count && agent.version_count > 1 && (
                          <p className="text-xs text-muted-foreground">
                            Current version: {agent.version}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">
                            {agent.version_count || 1}
                          </Badge>
                          {agent.version_count && agent.version_count > 1 && (
                            <span className="text-xs text-muted-foreground">
                              versions
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {agent.version_count && agent.version_count > 1 && (
                        <TooltipContent>
                          <p>This agent has {agent.version_count} versions</p>
                          <p className="text-xs text-muted-foreground">Click to view version history</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {new Date(agent.created_at || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(agent.updated_at || "").toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
