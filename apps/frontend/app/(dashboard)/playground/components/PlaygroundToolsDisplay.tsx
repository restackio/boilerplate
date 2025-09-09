"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { Plus, Trash2, Wrench, Search, Code, Image, Server } from "lucide-react";
import { McpServerDialog } from "@/app/(dashboard)/agents/[agentId]/components/McpServerDialog";
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

const getToolIcon = (type: ToolType) => {
  switch (type) {
    case 'web_search_preview': return <Search className="h-3 w-3" />;
    case 'mcp': return <Server className="h-3 w-3" />;
    case 'code_interpreter': return <Code className="h-3 w-3" />;
    case 'image_generation': return <Image className="h-3 w-3" />;
    default: return <Wrench className="h-3 w-3" />;
  }
};

const getToolLabel = (type: ToolType) => {
  switch (type) {
    case 'web_search_preview': return 'Web Search';
    case 'code_interpreter': return 'Code';
    case 'image_generation': return 'Images';
    case 'mcp': return 'MCP';
    default: return type;
  }
};

export function PlaygroundToolsDisplay({ agentId }: Props) {
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
      if (res && res.agent_tools) {
        // Enrich MCP tools with server labels
        const enrichedTools = res.agent_tools.map((tool: AgentToolRecord) => {
          if (tool.tool_type === 'mcp' && tool.mcp_server_id && mcpServers) {
            const server = mcpServers.find(s => s.id === tool.mcp_server_id);
            return { ...tool, mcp_server_label: server?.server_label || 'Unknown MCP Server' };
          }
          return tool;
        });
        setTools(enrichedTools);
      }
    } catch (e) {
      console.error("Failed to load tools", e);
    } finally {
      setLoading(false);
    }
  }, [agentId, mcpServers]);

  const loadMcpServersIfNeeded = useCallback(async () => {
    if (mcpServers && mcpServers.length > 0) {
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
      await loadMcpServersIfNeeded();
      setMcpDialogOpen(true);
    } else {
      await handleCreateNonMcp(v);
    }
  };

  useEffect(() => {
    if (!agentId) return;
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
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Existing Tools */}
      <div className="space-y-2">
        {tools.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No tools configured</p>
        ) : (
          tools.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                  {getToolIcon(tool.tool_type)}
                  {getToolLabel(tool.tool_type)}
                </Badge>
                {tool.tool_type === 'mcp' && tool.mcp_server_label && (
                  <span className="text-sm text-muted-foreground truncate">
                    ({tool.mcp_server_label})
                  </span>
                )}
                {tool.allowed_tools && tool.allowed_tools.length > 0 && (
                  <div className="flex gap-1 min-w-0">
                    {tool.allowed_tools.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                    {tool.allowed_tools.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{tool.allowed_tools.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(tool.id)}
                className="text-destructive hover:text-destructive flex-shrink-0 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add Tool Section - Optimized for narrow width */}
      <div className="space-y-2">
        {/* Standard tools in a single column */}
        <div className="space-y-1">
          {(['web_search_preview', 'code_interpreter', 'image_generation'] as const).map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => onChooseType(type)}
              disabled={hasType(type) || isCreating}
              className="w-full justify-start h-8"
            >
              <Plus className="h-3 w-3 mr-2" />
              {getToolIcon(type)}
              <span className="ml-2">{getToolLabel(type)}</span>
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChooseType('mcp')}
            disabled={isCreating}
            className="w-full justify-start h-8"
          >
            <Plus className="h-3 w-3 mr-2" />
            <Server className="h-3 w-3" />
            <span className="ml-2">MCP Tool</span>
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