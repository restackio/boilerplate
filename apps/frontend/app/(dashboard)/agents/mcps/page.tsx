"use client";

import { useEffect, useState } from "react";
import { MCPsTable } from "@workspace/ui/components/mcps-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import AgentsTabs from "../AgentsTabs";
import { Plus } from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "@/hooks/use-workspace-scoped-actions";
import { CreateMcpServerDialog } from "../[agentId]/components/CreateMcpServerDialog";

// Map McpServer to MCP format for the table component
const mapMcpServerToMCP = (mcpServer: McpServer) => ({
  id: mcpServer.id,
  name: mcpServer.server_label,
  description: mcpServer.server_description || "No description available",
  server_url: mcpServer.server_url,
  tools_count: mcpServer.require_approval.always.tool_names.length + mcpServer.require_approval.never.tool_names.length,
  lastUpdated: mcpServer.updated_at || mcpServer.created_at || "",
});

export default function MCPsPage() {
  const { mcpServers, mcpServersLoading, fetchMcpServers } = useWorkspaceScopedActions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const handleDeleteMCP = (mcpId: string) => {
    alert(`TODO: Implement MCP deletion: ${mcpId}`);
  };

  const handleRefresh = () => {
    fetchMcpServers();
  };

  const handleAddMCPClick = () => {
    setIsCreateDialogOpen(true);
  };

  // Convert McpServer array to MCP array for the table
  const mcpData = mcpServers.map(mapMcpServerToMCP);

  const breadcrumbs = [{ label: "MCPs" }];

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
      <Button size="sm" variant="ghost" onClick={handleAddMCPClick}>
        <Plus className="h-4 w-4 mr-1" />
        Add MCP Server
      </Button>
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />
      <AgentsTabs />

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
              <p className="text-muted-foreground">Loading MCP servers...</p>
            </div>
          </div>
        ) : (
          <MCPsTable data={mcpData} onDeleteMCP={handleDeleteMCP} />
        )}
      </div>

      {/* MCP Server Creation Dialog */}
      <CreateMcpServerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
