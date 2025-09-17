"use client";

import { McpServerDialog } from "./mcp-server-dialog";
import { ToolsList } from "./tools-list";
import { ToolsActions } from "./tools-actions";
import { useToolsManager } from "../hooks/use-tools-manager";
import { TableLoading } from "@workspace/ui/components/loading-states";

interface Props {
  agentId: string;
  workspaceId: string;
  agent?: {
    status: "published" | "draft" | "archived";
  };
}

export function AgentToolsManager({ agentId, workspaceId, agent }: Props) {
  const {
    tools,
    loading,
    mcpServersLoading,
    isCreating,
    mcpDialogOpen,
    setMcpDialogOpen,
    hasType,
    mcpOptions,
    fetchTools,
    onChooseType,
    handleCreateMcpTool,
  } = useToolsManager({ agentId });

  // Check if agent is published (read-only)
  const isReadOnly = agent?.status === "published";

  if (loading) {
    return <TableLoading rows={3} />;
  }

  return (
    <>
      {/* Existing Tools */}
      <ToolsList 
        tools={tools}
        onToolsChange={fetchTools}
        isReadOnly={isReadOnly}
      />

      {/* Add Tool Section */}
      <ToolsActions
        onChooseType={onChooseType}
        hasType={hasType}
        isCreating={isCreating}
        isReadOnly={isReadOnly}
      />

      {/* MCP Server Dialog */}
      <McpServerDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        mcpServers={mcpOptions}
        loading={mcpServersLoading}
        onCreateTool={handleCreateMcpTool}
        agentId={agentId}
        workspaceId={workspaceId}
        isCreating={isCreating}
      />
    </>
  );
}