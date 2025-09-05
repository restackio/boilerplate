"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@workspace/ui/components/ui/button";

import { Badge } from "@workspace/ui/components/ui/badge";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { Plus, Trash2 } from "lucide-react";
import { McpServerDialog } from "./McpServerDialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { 
  createAgentTool,
  deleteAgentTool,
  getAgentTools,
} from "@/app/actions/workflow";

type ToolType = 'web_search_preview'|'mcp'|'code_interpreter'|'image_generation';

interface AgentToolRecord {
  id: string;
  agent_id: string;
  tool_type: ToolType;
  mcp_server_id?: string;
  config?: Record<string, unknown>;
  allowed_tools?: string[];
  execution_order?: number;
  enabled?: boolean;
  mcp_server_label?: string;
}

interface Props {
  agentId: string;
}

export function AgentToolsManager({ agentId }: Props) {
  const { mcpServers, fetchMcpServers } = useWorkspaceScopedActions();
  const [tools, setTools] = useState<AgentToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mcpServersLoading, setMcpServersLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Dialog state
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);

  const hasType = (type: ToolType) => tools.some(t => t.tool_type === type && type !== 'mcp');

  const fetchTools = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await getAgentTools(agentId);
      if (res && res.agent_tools) setTools(res.agent_tools);
    } catch (e) {
      console.error("Failed to load tools", e);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const loadMcpServersIfNeeded = useCallback(async () => {
    if (mcpServers && mcpServers.length > 0) {
      // Already loaded
      return;
    }
    
    setMcpServersLoading(true);
    try {
      await fetchMcpServers();
    } catch (e) {
      console.error("Failed to load MCP servers", e);
    } finally {
      setMcpServersLoading(false);
    }
  }, [mcpServers, fetchMcpServers]);

  const onChooseType = async (v: ToolType) => {
    if (v === "mcp") {
      // Load MCP servers only when needed
      await loadMcpServersIfNeeded();
      setMcpDialogOpen(true);
    } else {
      await handleCreateNonMcp(v);
    }
  };

  useEffect(() => {
    if (!agentId) return;
    
    // Only load agent tools on mount, MCP servers loaded on demand
    fetchTools();
  }, [agentId, fetchTools]);

  const mcpOptions = useMemo(() => mcpServers || [], [mcpServers]);

  const handleCreateNonMcp = async (toolType: ToolType) => {
    const payload = {
      agent_id: agentId,
      tool_type: toolType,
    };

    try {
      setIsCreating(true);
      await createAgentTool(payload);
      await fetchTools();
    } catch (e) {
      console.error("Failed to create tool", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateMcpTool = async (data: {
    agent_id: string;
    tool_type: 'mcp';
    mcp_server_id: string;
    allowed_tools?: string[];
  }) => {
    try {
      setIsCreating(true);
      await createAgentTool(data);
      await fetchTools();
      setMcpDialogOpen(false);
    } catch (e) {
      console.error("Failed to create MCP tool", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (toolId: string) => {
    try {
      await deleteAgentTool({ agent_tool_id: toolId });
      await fetchTools();
    } catch (e) {
      console.error("Failed to delete tool", e);
    }
  };

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
        <div className="space-y-2">
          {tools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tools configured</p>
          ) : (
            tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{tool.tool_type}</Badge>
                  {tool.tool_type === 'mcp' && tool.mcp_server_label && (
                    <span className="text-sm text-muted-foreground">
                      {tool.mcp_server_label}
                    </span>
                  )}
                  {tool.allowed_tools && tool.allowed_tools.length > 0 && (
                    <div className="flex gap-1">
                      {tool.allowed_tools.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tool.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add Tool Section */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(['web_search_preview', 'code_interpreter', 'image_generation'] as const).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => onChooseType(type)}
                disabled={hasType(type)}
                className="justify-start"
              >
                <Plus className="h-3 w-3 mr-1" />
                {type.replace('_', ' ')}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChooseType('mcp')}
              className="justify-start"
            >
              <Plus className="h-3 w-3 mr-1" />
              tool from MCP
            </Button>
          </div>
        </div>

        {/* MCP Server Dialog */}
        <McpServerDialog
          open={mcpDialogOpen}
          onOpenChange={setMcpDialogOpen}
          mcpServers={mcpOptions}
          loading={mcpServersLoading}
          onCreateTool={handleCreateMcpTool}
          agentId={agentId}
          isCreating={isCreating}
        />
    </>
  );
}
