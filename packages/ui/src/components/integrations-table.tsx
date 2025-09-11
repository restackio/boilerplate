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
  Plug,
  Globe,
  Lock,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Settings,
  ExternalLink,
  Users,
  Shield,
} from "lucide-react";
import Link from "next/link";

export interface Integration {
  id: string;
  integration_name: string;
  provider_name: string;
  integration_type: string;
  enabled: boolean;
  oauth_authorization_url?: string;
  oauth_scopes?: string[];
  required_role: string;
  allow_user_connections: boolean;
  auto_refresh_tokens: boolean;
  connected_users_count?: number;
  created_at: string;
  updated_at: string;
}

interface IntegrationsTableProps {
  data: Integration[];
  onEditIntegration?: (integrationId: string) => void;
  onConnectIntegration?: (integrationId: string) => void;
  onManageConnections?: (integrationId: string) => void;
}

// Column configuration helper
const dtf = createColumnConfigHelper<Integration>();

// Column configurations
export const integrationColumnsConfig = [
  dtf
    .text()
    .id("integration_name")
    .accessor((row: Integration) => row.integration_name)
    .displayName("Integration Name")
    .icon(Plug)
    .build(),
  dtf
    .option()
    .id("provider_name")
    .accessor((row: Integration) => row.provider_name)
    .displayName("Provider")
    .icon(Globe)
    .build(),
  dtf
    .option()
    .id("integration_type")
    .accessor((row: Integration) => row.integration_type)
    .displayName("Type")
    .icon(Settings)
    .build(),
  dtf
    .option()
    .id("enabled")
    .accessor((row: Integration) => row.enabled ? "enabled" : "disabled")
    .displayName("Status")
    .icon(CheckCircle)
    .build(),
] as const;

// Status options
export const statusOptions: Array<{
  label: string;
  value: string;
  icon: any;
}> = [
  { label: "Enabled", value: "enabled", icon: CheckCircle },
  { label: "Disabled", value: "disabled", icon: AlertCircle },
];

// Provider icons mapping
const getProviderIcon = (provider: string) => {
  switch (provider.toLowerCase()) {
    case "notion":
      return "📋";
    case "github":
      return "🐙";
    case "slack":
      return "💬";
    case "linear":
      return "📊";
    case "figma":
      return "🎨";
    default:
      return "🔗";
  }
};

// Integration type badges
const getIntegrationTypeBadge = (type: string) => {
  switch (type) {
    case "oauth_mcp":
      return <Badge variant="default" className="text-xs">OAuth MCP</Badge>;
    case "api_key":
      return <Badge variant="secondary" className="text-xs">API Key</Badge>;
    case "webhook":
      return <Badge variant="outline" className="text-xs">Webhook</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>;
  }
};

export function IntegrationsTable({ 
  data, 
  onEditIntegration, 
  onConnectIntegration,
  onManageConnections 
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
                <TableHead className="w-1/3">Integration</TableHead>
                <TableHead className="hidden sm:table-cell w-1/6">Type</TableHead>
                <TableHead className="hidden md:table-cell w-1/6">Status</TableHead>
                <TableHead className="hidden lg:table-cell w-1/6">Connections</TableHead>
                <TableHead className="hidden xl:table-cell w-1/6">Updated</TableHead>
                <TableHead className="w-1/6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((integration) => {
                const isOAuthType = integration.integration_type === "oauth_mcp";
                return (
                  <TableRow 
                    key={integration.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onEditIntegration?.(integration.id)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          <span className="text-lg">{getProviderIcon(integration.provider_name)}</span>
                          <span>{integration.integration_name}</span>
                          {!integration.enabled && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {integration.provider_name}
                          {integration.oauth_scopes && integration.oauth_scopes.length > 0 && (
                            <span className="ml-2">
                              • {integration.oauth_scopes.join(", ")}
                            </span>
                          )}
                        </div>
                        {/* Show type and status on mobile when columns are hidden */}
                        <div className="sm:hidden flex flex-col gap-1 mt-2 text-xs">
                          <div className="flex items-center gap-2">
                            {getIntegrationTypeBadge(integration.integration_type)}
                            {integration.enabled ? (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getIntegrationTypeBadge(integration.integration_type)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {integration.enabled ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {isOAuthType && integration.allow_user_connections ? (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {integration.connected_users_count || 0} connected
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Admin only</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(integration.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isOAuthType && integration.allow_user_connections && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConnectIntegration?.(integration.id);
                            }}
                          >
                            <Plug className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Connect</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditIntegration?.(integration.id);
                          }}
                        >
                          <Settings className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Settings</span>
                        </Button>
                        {isOAuthType && integration.allow_user_connections && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onManageConnections?.(integration.id);
                            }}
                          >
                            <Users className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Connections</span>
                          </Button>
                        )}
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
