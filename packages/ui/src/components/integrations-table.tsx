"use client";

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
  Plug,
  Globe,
  Key,
} from "lucide-react";

export interface Integration {
  id: string;
  integration_name: string;
  server_description?: string;
  server_url?: string;
  local: boolean;
  connected_users_count?: number;
  created_at: string;
  updated_at: string;
}

interface IntegrationsTableProps {
  data: Integration[];
  onEditIntegration?: (integrationId: string) => void;
  onConnectIntegration?: (integrationId: string) => void;
}

// Column configuration helper
const dtf = createColumnConfigHelper<Integration>();

// Column configurations
export const integrationColumnsConfig = [
  dtf
    .text()
    .id("integration_name")
    .accessor((row: Integration) => row.integration_name)
    .displayName("Integration")
    .icon(Plug)
    .build(),
  dtf
    .text()
    .id("server_url")
    .accessor((row: Integration) => row.server_url || (row.local ? "Local" : ""))
    .displayName("MCP Server URL")
    .icon(Globe)
    .build(),
  dtf
    .text()
    .id("connected_users_count")
    .accessor((row: Integration) => (row.connected_users_count || 0).toString())
    .displayName("Connections")
    .icon(Key)
    .build(),
] as const;

export function IntegrationsTable({ 
  data, 
  onEditIntegration,
  onConnectIntegration,
}: IntegrationsTableProps) {

  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: integrationColumnsConfig,
    });

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Plug className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No integrations configured</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          OAuth integrations allow agents to access external services on behalf of users. Configure integrations to enable seamless authentication flows.
        </p>
        <Button>
          <Plug className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>
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
                <TableHead className="w-1/2">Integration</TableHead>
                <TableHead className="hidden sm:table-cell w-1/4">MCP Server URL</TableHead>
                <TableHead className="hidden lg:table-cell w-1/8">Connections</TableHead>
                <TableHead className="w-1/6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((integration) => {
                return (
                  <TableRow 
                    key={integration.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onEditIntegration?.(integration.id)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          <span>{integration.integration_name}</span>
                        </div>
                        {integration.server_description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 truncate">
                            {integration.server_description}
                          </div>
                        )}
                        {/* Show additional info on mobile when columns are hidden */}
                        <div className="sm:hidden flex flex-col gap-1 mt-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{integration.server_url || (integration.local ? "Local" : "N/A")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{integration.connected_users_count || 0} connections</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate">
                          {integration.server_url || (integration.local ? "Local" : "N/A")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{integration.connected_users_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConnectIntegration?.(integration.id);
                          }}
                        >
                          <span>
                            Connect
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hidden sm:block"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditIntegration?.(integration.id);
                          }}
                        >
                          <span>Settings</span>
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
