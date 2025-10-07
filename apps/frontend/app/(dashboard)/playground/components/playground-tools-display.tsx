"use client";

import { McpServerDialog } from "@/app/(dashboard)/agents/[agentId]/components/mcp-server-dialog";
import { ToolsList } from "../../agents/[agentId]/components/tools-list";
import { ToolsActions } from "../../agents/[agentId]/components/tools-actions";
import { QuickToolToggles } from "../../agents/[agentId]/components/quick-tool-toggles";
import { useToolsManager } from "../../agents/[agentId]/hooks/use-tools-manager";
import { TableLoading } from "@workspace/ui/components/loading-states";

interface Props {
  agentId: string;
  workspaceId: string;
}

export function PlaygroundToolsDisplay({ agentId, workspaceId }: Props) {
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
  } = useToolsManager({ 
    agentId, 
    enrichWithMcpLabels: true // Playground needs server labels for better UX
  });

  if (loading) {
    return <TableLoading rows={4} />;
  }

  return (
    <>
      {/* Existing Tools */}
      <ToolsList 
        tools={tools}
        onToolsChange={fetchTools}
      />

      {/* Quick Tool Toggles */}
      {restackCoreMcpServerId && (
        <QuickToolToggles
          agentId={agentId}
          tools={tools}
          onToggle={handleQuickToolToggle}
          isCreating={isCreating}
          restackCoreMcpServerId={restackCoreMcpServerId}
        />
      )}

      {/* Add Tool Section - Optimized for narrow width */}
      <ToolsActions
        onChooseType={onChooseType}
        hasType={hasType}
        isCreating={isCreating}
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