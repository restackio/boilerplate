import { useState, useCallback, useEffect } from "react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { 
  createAgentTool,
  getAgentTools,
} from "@/app/actions/workflow";
import { AgentToolRecord, ToolType } from "@/components/shared/ToolsList";

interface UseToolsManagerProps {
  agentId: string;
  enrichWithMcpLabels?: boolean; // Whether to enrich MCP tools with server labels
}

export function useToolsManager({ agentId, enrichWithMcpLabels = false }: UseToolsManagerProps) {
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
        let processedTools = res.agent_tools;
        
        // Enrich MCP tools with server labels if requested
        if (enrichWithMcpLabels && mcpServers) {
          processedTools = res.agent_tools.map((tool: AgentToolRecord) => {
            if (tool.tool_type === 'mcp' && tool.mcp_server_id) {
              const server = mcpServers.find(s => s.id === tool.mcp_server_id);
              return { ...tool, mcp_server_label: server?.server_label || 'Unknown MCP Server' };
            }
            return tool;
          });
        }
        
        setTools(processedTools);
      }
    } catch (e) {
      console.error("Failed to load tools", e);
    } finally {
      setLoading(false);
    }
  }, [agentId, mcpServers, enrichWithMcpLabels]);

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

  const handleCreateNonMcp = async (toolType: ToolType) => {
    try {
      setIsCreating(true);
      await createAgentTool({
        agent_id: agentId,
        tool_type: toolType,
        enabled: true
      });
      await fetchTools();
    } catch (error) {
      console.error("Failed to create tool:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateMcpTool = async (data: {
    agent_id: string;
    tool_type: 'mcp';
    mcp_server_id: string;
    tool_name: string;
    custom_description?: string | null;
    require_approval?: boolean;
    enabled?: boolean;
  }) => {
    try {
      setIsCreating(true);
      await createAgentTool(data);
      await fetchTools();
      setMcpDialogOpen(false);
    } catch (error) {
      console.error("Failed to create MCP tool:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const onChooseType = async (type: ToolType) => {
    if (type === "mcp") {
      await loadMcpServersIfNeeded();
      setMcpDialogOpen(true);
    } else {
      await handleCreateNonMcp(type);
    }
  };

  // Load tools on mount and when dependencies change
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    // State
    tools,
    loading,
    mcpServersLoading,
    isCreating,
    mcpDialogOpen,
    setMcpDialogOpen,
    
    // Computed
    hasType,
    mcpOptions: mcpServers || [],
    
    // Actions
    fetchTools,
    onChooseType,
    handleCreateMcpTool,
  };
}
