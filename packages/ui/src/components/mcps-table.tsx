"use client";

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
  Package,
  Shield,
  Monitor,
  Workflow,
  HelpCircle,
  Eye,
  Edit,
  ExternalLink,
  Wrench,
} from "lucide-react";
import Link from "next/link";

export interface MCP {
  id: string;
  name: string;
  server_url?: string;
  local?: boolean;
  tools_count?: number;
  description: string;
  lastUpdated: string;
}

interface MCPsTableProps {
  data: MCP[];
  onEditMCP?: (mcpId: string) => void;
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
    .id("server_url")
    .accessor((row: MCP) => row.server_url)
    .displayName("Server URL")
    .icon(Globe)
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

export function MCPsTable({ data, onEditMCP }: MCPsTableProps) {

  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: mcpColumnsConfig,
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

      <div className="w-full overflow-hidden">
        <div className="rounded-md border overflow-x-auto max-w-full">
          <Table className="w-full" style={{ tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">MCP</TableHead>
                <TableHead className="hidden sm:table-cell">Server URL</TableHead>
                <TableHead className="hidden md:table-cell">Tools</TableHead>
                <TableHead className="hidden lg:table-cell">Updated at</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredData.map((mcp) => {
              return (
                <TableRow key={mcp.id}>
                  <TableCell>
                    <Link href="/agents/mcps" className="block">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2 hover:underline">
                        {mcp.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                         {mcp.description}
                        </div>
                        {/* Show server URL and tools info on mobile when columns are hidden */}
                        <div className="sm:hidden flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                          {mcp.local ? (
                            <Badge variant="secondary" className="text-xs w-fit">Local</Badge>
                          ) : mcp.server_url && (
                            <div className="flex items-center gap-1 min-w-0">
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{mcp.server_url}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3 flex-shrink-0" />
                            <span>{mcp.tools_count || 0} tools</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {mcp.local ? (
                      <Badge variant="secondary">Local</Badge>
                    ) : mcp.server_url ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Link href={mcp.server_url} target="_blank" className="truncate block max-w-full hover:underline">
                          {mcp.server_url}
                        </Link>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{mcp.tools_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {new Date(mcp.lastUpdated || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!mcp.local && mcp.server_url && (
                        <Link href={mcp.server_url} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <span>
                              <ExternalLink className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Visit</span>
                            </span>
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditMCP?.(mcp.id)}
                      >
                        <Edit className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
