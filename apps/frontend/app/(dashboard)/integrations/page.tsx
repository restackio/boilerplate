"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IntegrationsTable } from "./components/integrations-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "../../../hooks/use-workspace-scoped-actions";
import { useOAuthFlow } from "../../../hooks/use-oauth-flow";
import { useDatabaseWorkspace } from "../../../lib/database-workspace-context";
import { AddMcpServerDialog } from "./components/add-mcp-server-dialog";
import { AddTokenDialog } from "./components/add-token-dialog";

// Map McpServer to Integration format for the table component
const mapServerToIntegration = (server: McpServer) => ({
  id: server.id,
  integration_name: server.server_label,
  server_description: server.server_description,
  server_url: server.server_url,
  local: server.local,
  connected_users_count: server.connections_count || 0,
  created_at: server.created_at || "",
  updated_at: server.updated_at || "",
});

export default function IntegrationsPage() {
  const router = useRouter();
  const { mcpServers, mcpServersLoading, fetchMcpServers, executeWorkflow } = useWorkspaceScopedActions();
  const { startOAuthFlow } = useOAuthFlow();
  const { currentUser } = useDatabaseWorkspace();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTokenDialogOpen, setAddTokenDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const handleEditIntegration = (integrationId: string) => {
    router.push(`/integrations/${integrationId}`);
  };

  const handleConnectIntegration = (integrationId: string) => {
    // Find the server
    const server = mcpServers.find(s => s.id === integrationId);
    if (!server) {
      console.error("Server not found");
      return;
    }

    // Open the unified token dialog
    setSelectedServer(server);
    setAddTokenDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchMcpServers();
  };

  const handleAddIntegration = () => {
    setAddDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchMcpServers(); // Refresh the list
  };

  const handleOAuthConnect = async () => {
    if (!selectedServer) {
      console.error("No server selected");
      return;
    }
    await startOAuthFlow(selectedServer);
  };

  const handleBearerTokenSave = async (token: string, name: string) => {
    if (!currentUser?.id || !selectedServer) {
      console.error("No current user or server available");
      return;
    }

    try {
      const result = await executeWorkflow("BearerTokenCreateWorkflow", {
        user_id: currentUser.id,
        workspace_id: selectedServer.workspace_id,
        mcp_server_id: selectedServer.id,
        bearer_token: token,
        token_name: name || undefined,
      });
      
      if (result.success) {
        fetchMcpServers(); // Refresh the list to update connection counts
      }
    } catch (error) {
      console.error("Failed to save bearer token:", error);
    }
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
      <Button size="sm" onClick={handleAddIntegration}>
        <Plus className="h-4 w-4 mr-1" />
        New Integration
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
          />
        )}
      </div>

      {/* Add Integration Dialog */}
      <AddMcpServerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Add Token Dialog */}
      <AddTokenDialog
        open={addTokenDialogOpen}
        onOpenChange={setAddTokenDialogOpen}
        server={selectedServer}
        onStartOAuth={handleOAuthConnect}
        onSaveBearerToken={handleBearerTokenSave}
        defaultTab="oauth"
      />

    </div>
  );
}