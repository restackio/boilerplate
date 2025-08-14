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
  Trash2,
  ExternalLink,
  Wrench,
} from "lucide-react";
import Link from "next/link";

export interface MCP {
  id: string;
  name: string;
  server_url?: string;
  tools_count?: number;
  description: string;
  lastUpdated: string;
}

interface MCPsTableProps {
  data: MCP[];
  onDeleteMCP?: (mcpId: string) => void;
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

export function MCPsTable({ data, onDeleteMCP }: MCPsTableProps) {

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MCP</TableHead>
              <TableHead>Server URL</TableHead>
              <TableHead>Tools</TableHead>
              <TableHead>Updated at</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((mcp) => {
              return (
                <TableRow key={mcp.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                      {mcp.name}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-60 truncate">
                       {mcp.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {mcp.server_url ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Link href={mcp.server_url} target="_blank">
                          {mcp.server_url}
                        </Link>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{mcp.tools_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(mcp.lastUpdated || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteMCP?.(mcp.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
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
