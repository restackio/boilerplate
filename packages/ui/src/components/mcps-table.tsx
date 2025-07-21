"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { EmptyState } from "./ui/empty-state";
import {
  Github,
  Activity,
  Clock,
  Database,
  MessageSquare,
  Server,
  CheckCircle,
  User,
  Globe,
  Lock,
  ExternalLink,
  Settings,
  Package,
  Shield,
  Monitor,
  Workflow,
  HelpCircle,
} from "lucide-react";

export interface MCP {
  id: string;
  name: string;
  version: string;
  visibility: "public" | "private";
  description: string;
  icon: any;
  category: string;
  author: string;
  downloads: string;
  lastUpdated: string;
  capabilities: string[];
  mentions: string[];
  documentation: string;
  status: "active" | "beta" | "deprecated";
}

interface MCPsTableProps {
  data: MCP[];
  onViewMCP?: (mcpId: string) => void;
}

// Column configuration helper
const dtf = createColumnConfigHelper<MCP>();

// Column configurations
export const mcpColumnsConfig = [
  dtf
    .text()
    .id("name")
    .accessor((row: MCP) => row.name)
    .displayName("MCP Name")
    .icon(Package)
    .build(),
  dtf
    .option()
    .id("visibility")
    .accessor((row: MCP) => row.visibility)
    .displayName("Visibility")
    .icon(Globe)
    .build(),
  dtf
    .option()
    .id("category")
    .accessor((row: MCP) => row.category)
    .displayName("Category")
    .icon(Shield)
    .build(),
  dtf
    .option()
    .id("status")
    .accessor((row: MCP) => row.status)
    .displayName("Status")
    .icon(CheckCircle)
    .build(),
  dtf
    .text()
    .id("author")
    .accessor((row: MCP) => row.author)
    .displayName("Author")
    .icon(User)
    .build(),
] as const;

// Visibility options
export const visibilityOptions: Array<{
  label: string;
  value: string;
  icon: any;
}> = [
  { label: "Public", value: "public", icon: Globe },
  { label: "Private", value: "private", icon: Lock },
];

// Category options
export const categoryOptions: Array<{
  label: string;
  value: string;
  icon: any;
}> = [
  { label: "Development", value: "Development", icon: Github },
  { label: "Communication", value: "Communication", icon: MessageSquare },
  { label: "Monitoring", value: "Monitoring", icon: Monitor },
  { label: "Workflow", value: "Workflow", icon: Workflow },
  { label: "CRM", value: "CRM", icon: Database },
  { label: "Support", value: "Support", icon: HelpCircle },
  { label: "Infrastructure", value: "Infrastructure", icon: Server },
  { label: "Security", value: "Security", icon: Shield },
  { label: "Internal", value: "Internal", icon: Lock },
];

// Status options
export const mcpStatusOptions: Array<{
  label: string;
  value: string;
  icon: any;
}> = [
  { label: "Active", value: "active", icon: CheckCircle },
  { label: "Beta", value: "beta", icon: Clock },
  { label: "Deprecated", value: "deprecated", icon: Activity },
];

// Helper functions
const getVisibilityIcon = (visibility: string) => {
  return visibility === "private" ? (
    <Lock className="h-4 w-4 text-muted-foreground" />
  ) : (
    <Globe className="h-4 w-4 text-muted-foreground" />
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "beta":
      return "bg-blue-100 text-blue-800";
    case "deprecated":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function MCPsTable({ data, onViewMCP }: MCPsTableProps) {
  const [selectedMCP, setSelectedMCP] = useState<MCP | null>(null);

  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: mcpColumnsConfig,
      options: {
        visibility: visibilityOptions,
        category: categoryOptions,
        status: mcpStatusOptions,
      },
    });

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="No MCPs available"
        description="Model Control Protocols will appear here when they are configured. MCPs help extend agent capabilities with external tools and services."
      />
    );
  }

  return (
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
              <TableHead>MCP</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((mcp) => {
              const IconComponent = mcp.icon;
              return (
                <TableRow key={mcp.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{mcp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          by {mcp.author}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{mcp.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getVisibilityIcon(mcp.visibility)}
                      <span className="capitalize">{mcp.visibility}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{mcp.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate" title={mcp.description}>
                      {mcp.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getStatusColor(mcp.status)} border-0 w-fit`}
                    >
                      {mcp.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMCP(mcp)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <IconComponent className="h-5 w-5" />
                            {mcp.name} {mcp.version}
                          </DialogTitle>
                          <DialogDescription>
                            {mcp.description}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Author:
                                  </span>
                                  <span>{mcp.author}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Category:
                                  </span>
                                  <Badge variant="outline">
                                    {mcp.category}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Visibility:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {getVisibilityIcon(mcp.visibility)}
                                    <span className="capitalize">
                                      {mcp.visibility}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Status:
                                  </span>
                                  <Badge
                                    className={`${getStatusColor(mcp.status)} border-0 w-fit`}
                                  >
                                    {mcp.status}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Downloads:
                                  </span>
                                  <span>{mcp.downloads}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Last Updated:
                                  </span>
                                  <span>{mcp.lastUpdated}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Capabilities</h4>
                              <div className="flex flex-wrap gap-1">
                                {mcp.capabilities.map((capability) => (
                                  <Badge
                                    key={capability}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {capability.replace("_", " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">
                              Available Mentions
                            </h4>
                            <div className="space-y-1">
                              {mcp.mentions.map((mention) => (
                                <code
                                  key={mention}
                                  className="block text-xs bg-muted p-2 rounded"
                                >
                                  {mention}
                                </code>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={mcp.documentation}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Documentation
                              </a>
                            </Button>
                            <Button size="sm">
                              <Settings className="h-4 w-4 mr-1" />
                              Configure
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
