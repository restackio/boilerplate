"use client";

import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle,
  Bot,
  GitBranch,
  Eye,
  FileText,
  Archive,
  Tag,
  MessageSquare,
  Workflow,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import { AgentStatusBadge, type AgentStatus } from "@workspace/ui/components/agent-status-badge";
import { Button } from "@workspace/ui/components/ui/button";
import { DataTableFilter } from "@workspace/ui/components/table";
import { createColumnConfigHelper } from "@workspace/ui/components/table/core/filters";
import { useDataTableFilters } from "@workspace/ui/components/table/hooks/use-data-table-filters";
import type { FiltersState } from "@workspace/ui/components/table/core/types";
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

export interface Agent {
  id: string;
  type?: string;
  name: string;
  description?: string;
  instructions: string;
  status: AgentStatus;
  parent_agent_id?: string;
  team_id?: string;
  team_name?: string;
  created_at?: string;
  updated_at?: string;
  version_count?: number;
  published_version_id?: string;
  published_version_short?: string;
  draft_count?: number;
  latest_draft_version_id?: string;
  latest_draft_version_short?: string;
}

// Column configuration helper
const dtf = createColumnConfigHelper<Agent>();

// Column configurations
export const agentColumnsConfig = [
  dtf
    .text()
    .id("name")
    .accessor((row: Agent) => row.name)
    .displayName("Name")
    .icon(Bot)
    .build(),
  dtf
    .option()
    .id("type")
    .accessor((row: Agent) => row.type)
    .displayName("Type")
    .icon(Workflow)
    .build(),
  dtf
    .option()
    .id("status")
    .accessor((row: Agent) => row.status)
    .displayName("Status")
    .icon(Tag)
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
export const statusOptions: Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> }> =
  [
    { label: "Published", value: "published", icon: CheckCircle },
    { label: "Draft", value: "draft", icon: FileText },
    { label: "Archived", value: "archived", icon: Archive },
  ];

// Agent type options
export const agentTypeOptions: Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> }> =
  [
    { label: "Interactive", value: "interactive", icon: MessageSquare },
    { label: "Pipeline", value: "pipeline", icon: Workflow },
  ];

interface AgentsTableProps {
  data: Agent[];
  onRowClick?: (agentId: string) => void;
  onViewAgent?: (agentId: string) => void;
  teams?: Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> }>;
  defaultFilters?: FiltersState;
}

// Helper function to get the correct agent ID for navigation
function getAgentNavigationId(agent: Agent): string {
  // For draft agents, use the latest draft version ID if available
  if (agent.status === 'draft' && agent.latest_draft_version_id) {
    return agent.latest_draft_version_id;
  }
  // For published/archived agents, use the main agent ID
  return agent.id;
}

// Helper function to get the team icon for an agent
function getTeamIcon(agent: Agent, teams: Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> }>) {
  if (!agent.team_name || agent.team_name === "No Team") {
    return Users;
  }
  
  // Find the team in the teams array to get its icon
  const team = teams.find(t => t.value === agent.team_name);
  if (team && team.icon) {
    return team.icon;
  }
  
  // Fallback to Users icon if team not found
  return Users;
}

export function AgentsTable({ 
  data, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRowClick: _onRowClick, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onViewAgent: _onViewAgent, 
  teams = [], 
  defaultFilters = [] 
}: AgentsTableProps) {
  const router = useRouter();

  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: agentColumnsConfig,
      defaultFilters,
      options: {
        status: statusOptions,
        type: agentTypeOptions,
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
                  <TableHead className="w-1/3">Agent</TableHead>
                  <TableHead className="hidden md:table-cell">Draft</TableHead>
                  <TableHead className="hidden md:table-cell">Published</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Team</TableHead>
                  <TableHead className="hidden lg:table-cell">Updated at</TableHead>
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
                    <Link href={`/agents/${getAgentNavigationId(agent)}`} className="block">
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
                            {(() => {
                              const TeamIcon = getTeamIcon(agent, teams);
                              return <TeamIcon className="h-3 w-3 flex-shrink-0" />;
                            })()}
                            <span className="truncate">{agent.team_name || "No Team"}</span>
                          </span>
                          {agent.draft_count > 0 && (
                            <span className="flex items-center gap-1 min-w-0">
                              <GitBranch className="h-3 w-3 flex-shrink-0 text-yellow-600" />
                              {agent.latest_draft_version_short ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/agents/${agent.latest_draft_version_id}`);
                                  }}
                                  className="truncate font-mono hover:underline text-yellow-700 bg-transparent border-none cursor-pointer p-0"
                                >
                                  {agent.latest_draft_version_short}
                                </button>
                              ) : (
                                <span className="truncate">draft</span>
                              )}
                              <span className="truncate">({agent.draft_count})</span>
                            </span>
                          )}
                          {agent.published_version_short && (
                            <span className="flex items-center gap-1 min-w-0">
                              <span className="text-xs text-muted-foreground">Published:</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/agents/${agent.published_version_id}`);
                                }}
                                className="truncate font-mono hover:underline text-green-700 bg-transparent border-none cursor-pointer p-0"
                              >
                                {agent.published_version_short}
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    {agent.draft_count > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3 text-yellow-600" />
                          {agent.latest_draft_version_short ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/agents/${agent.latest_draft_version_id}`);
                                  }}
                                  className="text-sm font-mono hover:underline text-yellow-700 hover:text-yellow-800 bg-transparent border-none cursor-pointer p-0"
                                >
                                  {agent.latest_draft_version_short}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Latest Draft Version: {agent.latest_draft_version_short}</p>
                                <p className="text-xs">ID: {agent.latest_draft_version_id}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm font-mono text-yellow-700">draft</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {agent.draft_count} draft{agent.draft_count > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {agent.published_version_short ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/agents/${agent.published_version_id}`);
                            }}
                            className="text-sm font-mono hover:underline text-green-700 hover:text-green-800 bg-transparent border-none cursor-pointer p-0"
                          >
                            {agent.published_version_short}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Published version: {agent.published_version_short}</p>
                          <p className="text-xs">ID: {agent.published_version_id}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AgentStatusBadge status={agent.status} size="sm" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center space-x-2 min-w-0">
                      {agent.type === "pipeline" ? (
                        <Workflow className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{agentTypeOptions.find(option => option.value === agent.type)?.label || "Interactive"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center space-x-2 min-w-0">
                      {(() => {
                        const TeamIcon = getTeamIcon(agent, teams);
                        return <TeamIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
                      })()}
                      <span className="text-sm truncate">{agent.team_name || "No Team"}</span>
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {new Date(agent.updated_at || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/agents/${getAgentNavigationId(agent)}`}>
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
