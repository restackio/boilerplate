"use client";

import { useEffect } from "react";
import { MCPsTable } from "@workspace/ui/components/mcps-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import AgentsTabs from "../AgentsTabs";
import { Plus } from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "@/hooks/use-workspace-scoped-actions";
import { useApiHealth } from "@/hooks/use-api-health";
import { Server, Globe, Lock } from "lucide-react";

// Map McpServer to MCP format for the table component
const mapMcpServerToMCP = (mcpServer: McpServer) => ({
  id: mcpServer.id,
  name: mcpServer.server_label,
  version: "v1.0", // Default version since we don't store this in the database
  visibility: mcpServer.require_approval === "always" ? "private" as const : "public" as const,
  description: mcpServer.server_description || "No description available",
  icon: Server, // Default icon
  category: "Integration", // Default category
  author: "System", // Default author
  downloads: "0", // Default downloads
  lastUpdated: mcpServer.updated_at || mcpServer.created_at || "",
  capabilities: [], // We don't store capabilities in the database
  mentions: [], // We don't store mentions in the database
  documentation: mcpServer.server_url, // Use server URL as documentation
  status: "active" as const, // Default status
});

export default function MCPsPage() {
  const router = useRouter();
  const { mcpServers, mcpServersLoading, fetchMcpServers } = useWorkspaceScopedActions();
  const { isHealthy, checkHealth } = useApiHealth();

  useEffect(() => {
    fetchMcpServers();
    checkHealth();
  }, [fetchMcpServers, checkHealth]);

  const handleViewMCP = (mcpId: string) => {
    router.push(`/mcps/${mcpId}`);
  };

  const handleRefresh = () => {
    fetchMcpServers();
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
      <Button size="sm" variant="ghost">
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
              {!isHealthy && " (API may be unavailable)"}
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
          <MCPsTable data={mcpData} onViewMCP={handleViewMCP} />
        )}
      </div>
    </div>
  );
}
