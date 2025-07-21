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

// Agent experiment data type
export interface AgentExperiment {
  id: string;
  name: string;
  version?: string;
  model: "openai-gpt40mini" | "google-gemini2.5pro" | "anthropic-claude4sonnet";
  description: string;
  instructions?: string;
  channel: "github" | "slack" | "email" | "alerts";
  status: "active" | "testing" | "paused";
  startDate: string;
  duration: string;
  traffic: number;
  baseline: {
    approvalRate: number;
    averageSteps: number;
    responseTime: string;
    costPerResolution: number;
  };
  current: {
    approvalRate: number;
    averageSteps: number;
    responseTime: string;
    costPerResolution: number;
  };
  improvement: {
    approvalRate: number;
    averageSteps: number;
    responseTime: number;
    costPerResolution: number;
  };
  userTypes: string[];
  integrations: string[];
}

// Column configuration helper
const dtf = createColumnConfigHelper<AgentExperiment>();

// Column configurations
export const agentColumnsConfig = [
  dtf
    .text()
    .id("name")
    .accessor((row: AgentExperiment) => row.name)
    .displayName("Agent Name")
    .icon(Bot)
    .build(),
  dtf
    .option()
    .id("model")
    .accessor((row: AgentExperiment) => row.model)
    .displayName("Model")
    .icon(Brain)
    .build(),
  dtf
    .option()
    .id("channel")
    .accessor((row: AgentExperiment) => row.channel)
    .displayName("Channel")
    .icon(Server)
    .build(),
  dtf
    .option()
    .id("status")
    .accessor((row: AgentExperiment) => row.status)
    .displayName("Status")
    .icon(CheckCircle)
    .build(),
  dtf
    .number()
    .id("approvalRate")
    .accessor((row: AgentExperiment) => row.current.approvalRate)
    .displayName("Approval Rate")
    .icon(ThumbsUp)
    .build(),
  dtf
    .number()
    .id("averageSteps")
    .accessor((row: AgentExperiment) => row.current.averageSteps)
    .displayName("Average Steps")
    .icon(GitBranch)
    .build(),
  dtf
    .text()
    .id("responseTime")
    .accessor((row: AgentExperiment) => row.current.responseTime)
    .displayName("Response Time")
    .icon(Clock)
    .build(),
  dtf
    .number()
    .id("costPerResolution")
    .accessor((row: AgentExperiment) => row.current.costPerResolution)
    .displayName("Cost per Resolution")
    .icon(DollarSign)
    .build(),
] as const;

// Model options
export const modelOptions: Array<{ label: string; value: string; icon: any }> =
  [
    { label: "OpenAI GPT-4o Mini", value: "openai-gpt40mini", icon: Brain },
    {
      label: "Google Gemini 2.5 Pro",
      value: "google-gemini2.5pro",
      icon: Brain,
    },
    {
      label: "Anthropic Claude 4 Sonnet",
      value: "anthropic-claude4sonnet",
      icon: Brain,
    },
  ];

// Channel options
export const channelOptions: Array<{
  label: string;
  value: string;
  icon: any;
}> = [
  { label: "GitHub", value: "github", icon: Github },
  { label: "Slack", value: "slack", icon: Slack },
  { label: "Email", value: "email", icon: Mail },
  { label: "Alerts", value: "alerts", icon: Server },
];

// Status options
export const statusOptions: Array<{ label: string; value: string; icon: any }> =
  [
    { label: "Active", value: "active", icon: Play },
    { label: "Testing", value: "testing", icon: CheckCircle },
    { label: "Paused", value: "paused", icon: Pause },
  ];

// Helper functions
const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "github":
      return <Github className="h-4 w-4 text-gray-700" />;
    case "slack":
      return <Slack className="h-4 w-4 text-purple-600" />;
    case "email":
      return <Mail className="h-4 w-4 text-blue-600" />;
    case "alerts":
      return <Server className="h-4 w-4 text-orange-600" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
};

const getUserTypeIcon = (userType: string) => {
  switch (userType) {
    case "Enterprise":
      return <Crown className="h-3 w-3 text-yellow-600" />;
    case "Paid":
      return <Shield className="h-3 w-3 text-blue-600" />;
    default:
      return <Users className="h-3 w-3 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "testing":
      return "bg-blue-100 text-blue-800";
    case "paused":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Play className="h-3 w-3" />;
    case "testing":
      return <CheckCircle className="h-3 w-3" />;
    case "paused":
      return <Pause className="h-3 w-3" />;
    default:
      return <AlertTriangle className="h-3 w-3" />;
  }
};

const formatImprovement = (value: number, type: string) => {
  const isPositive =
    type === "averageSteps" ||
    type === "responseTime" ||
    type === "costPerResolution"
      ? value < 0
      : value > 0;
  let displayValue;
  switch (type) {
    case "responseTime":
      displayValue = `${Math.abs(value)}m`;
      break;
    case "costPerResolution":
      displayValue = `$${Math.abs(value).toFixed(2)}`;
      break;
    default:
      displayValue = `${Math.abs(value)}%`;
  }
  const icon = isPositive ? (
    <TrendingUp className="h-3 w-3" />
  ) : (
    <TrendingDown className="h-3 w-3" />
  );
  const colorClass = isPositive ? "text-green-600" : "text-red-600";

  return (
    <div className={`flex items-center space-x-1 ${colorClass}`}>
      {icon}
      <span className="text-xs font-medium">{displayValue}</span>
    </div>
  );
};

const getModelDisplayName = (model: string) => {
  switch (model) {
    case "openai-gpt40mini":
      return "GPT-4o Mini";
    case "google-gemini2.5pro":
      return "Gemini 2.5 Pro";
    case "anthropic-claude4sonnet":
      return "Claude 4 Sonnet";
    default:
      return model;
  }
};

// Tooltip content for metrics
const getTooltipContent = (metric: string) => {
  switch (metric) {
    case "approvalRate":
      return "Percentage of agent responses that were approved by human reviewers without requiring modifications";
    case "averageSteps":
      return "Average number of steps or interactions required to resolve a task from start to completion";
    case "responseTime":
      return "Average time from when a request is received to when the agent provides its first response";
    case "costPerResolution":
      return "Total cost (API calls, compute, etc.) divided by the number of successfully resolved tasks";
    default:
      return "";
  }
};

interface AgentsTableProps {
  data: AgentExperiment[];
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
        model: modelOptions,
        channel: channelOptions,
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
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      Approval Rate
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTooltipContent("approvalRate")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      Avg Steps
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTooltipContent("averageSteps")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      Response Time
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTooltipContent("responseTime")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      Cost/Resolution
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTooltipContent("costPerResolution")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>Model</TableHead>
                <TableHead>MCPs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((experiment) => (
                <TableRow
                  key={experiment.id}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                  }
                  onClick={() => onRowClick?.(experiment.id)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{experiment.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {experiment.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getStatusColor(experiment.status)} border-0 flex items-center space-x-1 w-fit`}
                    >
                      {getStatusIcon(experiment.status)}
                      <span>{experiment.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {experiment.current.approvalRate}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {experiment.current.averageSteps}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {experiment.current.responseTime}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        ${experiment.current.costPerResolution.toFixed(2)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">
                        {getModelDisplayName(experiment.model)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {experiment.integrations
                        .slice(0, 3)
                        .map((integration, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-neutral-100 rounded px-2 py-1 border"
                          >
                            {integration}
                          </span>
                        ))}
                      {experiment.integrations.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{experiment.integrations.length - 3}
                        </span>
                      )}
                    </div>
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
