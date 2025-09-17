"use client";

import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { McpServerDialog } from "./McpServerDialog";
import { ToolsList } from "@/components/shared/ToolsList";
import { ToolsActions } from "@/components/shared/ToolsActions";
import { useToolsManager } from "@/hooks/use-tools-manager";

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
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
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