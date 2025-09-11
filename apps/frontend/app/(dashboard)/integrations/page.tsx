"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IntegrationsTable } from "@workspace/ui/components/integrations-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "../../../hooks/use-workspace-scoped-actions";

// Map McpServer to Integration format for the table component
const mapServerToIntegration = (server: McpServer) => ({
  id: server.id,
  integration_name: server.server_label,
  provider_name: server.server_label.split('-')[0] || server.server_label,
  integration_type: server.local ? "local" : "remote",
  enabled: true,
  oauth_authorization_url: server.server_url,
  oauth_scopes: [],
  required_role: "user",
  allow_user_connections: true,
  auto_refresh_tokens: true,
  connected_users_count: 0, // This will be populated by the table component if needed
  created_at: server.created_at || "",
  updated_at: server.updated_at || "",
});

export default function IntegrationsPage() {
  const router = useRouter();
  const { mcpServers, mcpServersLoading, fetchMcpServers } = useWorkspaceScopedActions();

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const handleEditIntegration = (integrationId: string) => {
    router.push(`/integrations/${integrationId}`);
  };

  const handleConnectIntegration = (integrationId: string) => {
    router.push(`/integrations/${integrationId}?tab=tokens`);
  };

  const handleManageConnections = (integrationId: string) => {
    router.push(`/integrations/${integrationId}?tab=tokens`);
  };

  const handleRefresh = () => {
    fetchMcpServers();
  };

  const handleAddIntegration = () => {
    router.push("/agents/mcps");
  };

  // Convert servers to integration format for the table
  const integrationData = mcpServers.map(mapServerToIntegration);

  const breadcrumbs = [{ label: "Integrations" }];

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleRefresh}
        disabled={mcpServersLoading.isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${mcpServersLoading.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button size="sm" variant="ghost" onClick={handleAddIntegration}>
        <Plus className="h-4 w-4 mr-1" />
        Add Integration
      </Button>
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />

      {/* Main Content - with top padding for fixed header */}
      <div className="pt-8 p-4">
        {mcpServersLoading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Error: {mcpServersLoading.error}
            </p>
          </div>
        )}
        {mcpServersLoading.isLoading && mcpServers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading integrations...</p>
            </div>
          </div>
        ) : (
          <IntegrationsTable 
            data={integrationData} 
            onEditIntegration={handleEditIntegration}
            onConnectIntegration={handleConnectIntegration}
            onManageConnections={handleManageConnections}
          />
        )}
      </div>
    </div>
  );
}