"use client";

import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { McpServerDialog } from "@/app/(dashboard)/agents/[agentId]/components/McpServerDialog";
import { ToolsList } from "@/components/shared/ToolsList";
import { ToolsActions } from "@/components/shared/ToolsActions";
import { useToolsManager } from "@/hooks/use-tools-manager";

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
    fetchTools,
    onChooseType,
    handleCreateMcpTool,
  } = useToolsManager({ 
    agentId, 
    enrichWithMcpLabels: true // Playground needs server labels for better UX
  });

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Existing Tools */}
      <ToolsList 
        tools={tools}
        onToolsChange={fetchTools}
      />

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