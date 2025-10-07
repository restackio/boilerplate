"use client";

import { McpServerDialog } from "./mcp-server-dialog";
import { ToolsList } from "./tools-list";
import { ToolsActions } from "./tools-actions";
import { QuickToolToggles } from "./quick-tool-toggles";
import { useToolsManager } from "../hooks/use-tools-manager";
import { TableLoading } from "@workspace/ui/components/loading-states";

interface Props {
  agentId: string;
  workspaceId: string;
  agent?: {
    status: "published" | "draft" | "archived";
    type?: "interactive" | "pipeline";
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
    restackCoreMcpServerId,
    fetchTools,
    onChooseType,
    handleCreateMcpTool,
    handleQuickToolToggle,
  } = useToolsManager({ agentId });

  // Check if agent is published (read-only)
  const isReadOnly = agent?.status === "published";

  if (loading) {
    return <TableLoading rows={3} />;
  }

  return (
    <>
      {/* Existing Tools (includes inline subagents manager) */}
      <ToolsList 
        tools={tools}
        onToolsChange={fetchTools}
        isReadOnly={isReadOnly}
        agentType={agent?.type}
        agentId={agentId}
        workspaceId={workspaceId}
      />

      {/* Quick Tool Toggles */}
      {restackCoreMcpServerId && (
        <QuickToolToggles
          agentId={agentId}
          tools={tools}
          onToggle={handleQuickToolToggle}
          isCreating={isCreating}
          isReadOnly={isReadOnly}
          restackCoreMcpServerId={restackCoreMcpServerId}
        />
      )}

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