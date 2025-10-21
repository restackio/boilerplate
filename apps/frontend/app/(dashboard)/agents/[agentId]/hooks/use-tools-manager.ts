import { useState, useCallback, useEffect } from "react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { 
  createAgentTool,
  getAgentTools,
} from "@/app/actions/workflow";
import { AgentToolRecord, ToolType } from "@/app/(dashboard)/agents/[agentId]/components/tools-list";

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

  const handleQuickToolToggle = async (groupId: string, enabled: boolean) => {
    // Find restack-core MCP server
    const restackCoreServer = mcpServers?.find(s => s.server_label === "restack-core");
    if (!restackCoreServer) {
      console.error("restack-core MCP server not found");
      return;
    }

    // Map of tool groups to their tool names
    const toolGroups: Record<string, string[]> = {
      "subtasks": ["createsubtask"],
      "todos": ["updatetodos"],
      "context-store": ["clickhouselisttables", "clickhouserunselectquery"]
    };

    const toolNames = toolGroups[groupId];
    if (!toolNames) {
      console.error("Unknown tool group:", groupId);
      return;
    }

    try {
      setIsCreating(true);

      if (enabled) {
        // Add all tools in the group
        for (const toolName of toolNames) {
          await createAgentTool({
            agent_id: agentId,
            tool_type: 'mcp',
            mcp_server_id: restackCoreServer.id,
            tool_name: toolName,
            require_approval: false,
            enabled: true
          });
        }
      } else {
        // Remove all tools in the group
        const toolsToRemove = tools.filter(
          tool => 
            tool.tool_type === 'mcp' && 
            tool.mcp_server_id === restackCoreServer.id &&
            toolNames.includes(tool.tool_name || '')
        );

        // Import deleteAgentTool dynamically to avoid circular deps
        const { deleteAgentTool } = await import("@/app/actions/workflow");
        
        for (const tool of toolsToRemove) {
          await deleteAgentTool({ agent_tool_id: tool.id });
        }
      }

      await fetchTools();
    } catch (error) {
      console.error("Failed to toggle tool group:", error);
      throw error; // Re-throw to allow UI to handle
    } finally {
      setIsCreating(false);
    }
  };

  // Load tools on mount and when dependencies change
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // Load MCP servers on mount for quick toggles
  useEffect(() => {
    if (!mcpServers || mcpServers.length === 0) {
      loadMcpServersIfNeeded();
    }
  }, [mcpServers, loadMcpServersIfNeeded]);

  // Find restack-core server ID
  const restackCoreServer = mcpServers?.find(s => s.server_label === "restack-core");

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
    restackCoreMcpServerId: restackCoreServer?.id || '',
    
    // Actions
    fetchTools,
    onChooseType,
    handleCreateMcpTool,
    handleQuickToolToggle,
  };
}
