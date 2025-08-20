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
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
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

export interface Agent {
  id: string;
  name: string;
  version: string;
  description?: string;
  instructions: string;
  status: "active" | "inactive";
  parent_agent_id?: string;
  team_id?: string;
  team_name?: string;
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
  dtf
    .option()
    .id("team")
    .accessor((row: Agent) => row.team_name || "No Team")
    .displayName("Team")
    .icon(Users)
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
  onViewAgent?: (agentId: string) => void;
  teams?: Array<{ label: string; value: string; icon: any }>;
  defaultFilters?: any[];
}

export function AgentsTable({ data, onRowClick, onViewAgent, teams = [], defaultFilters = [] }: AgentsTableProps) {
  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: agentColumnsConfig,
      defaultFilters,
      options: {
        status: statusOptions,
        team: teams,
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

        <div className="w-full overflow-hidden">
          <div className="rounded-md border overflow-x-auto max-w-full">
            <Table className="w-full" style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Team</TableHead>
                  <TableHead className="hidden md:table-cell">Version</TableHead>
                  <TableHead className="hidden lg:table-cell">Updated At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredData.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="hover:bg-muted/50 transition-colors group"
                >
                  <TableCell>
                    <Link href={`/agents/${agent.id}`} className="block">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2 hover:underline">
                          {agent.name}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-1 truncate">
                          {agent.description}
                        </div>
                        {/* Show team and version info on mobile when columns are hidden */}
                        <div className="sm:hidden flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 min-w-0">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{agent.team_name || "No Team"}</span>
                          </span>
                          <span className="flex items-center gap-1 min-w-0">
                            <GitBranch className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{agent.latest_version || agent.version}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getStatusColor(agent.status)} border-0 flex items-center space-x-1 w-fit`}
                    >
                      {getStatusIcon(agent.status)}
                      <span>{agent.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{agent.team_name || "No Team"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                              {agent.latest_version || agent.version}
                          </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Hash className="h-3 w-3" />
                              <span>{agent.version_count ?? 1} versions</span>
                            </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Latest version: {agent.latest_version || agent.version}</p>
                        {agent.version_count && agent.version_count > 1 && (
                          <p className="text-xs">
                            Active version: {agent.version}
                          </p>
                        )}
                        {agent.version_count && agent.version_count > 1 && (
                          <p className="text-xs">
                            Total versions: {agent.version_count}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {new Date(agent.updated_at || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/agents/${agent.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <span>
                          <Eye className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View</span>
                        </span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
