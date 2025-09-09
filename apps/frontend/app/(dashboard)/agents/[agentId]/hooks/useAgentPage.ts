"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions, Agent } from "@/hooks/use-workspace-scoped-actions";
import { getAgentTools, createAgentTool } from "@/app/actions/workflow";

export function useAgentPage(agentId: string) {
  const router = useRouter();
  const { isReady, workspaceId } = useDatabaseWorkspace();
  const { 
    updateAgent, 
    createAgent, 
    deleteAgent, 
    getAgentVersions, 
    getAgentById, 
    publishAgent, 
    archiveAgent 
  } = useWorkspaceScopedActions();

  // State for the individual agent
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Loading states for actions
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Track draft edits from AgentSetupTab
  const [draft, setDraft] = useState<{ 
    name: string; 
    description: string; 
    instructions: string; 
    model?: string; 
    reasoning_effort?: string 
  } | null>(null);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState("setup");

  // Fetch the agent by ID
  const fetchAgent = useCallback(async () => {
    if (!agentId || !isReady) return;
    
    setIsLoading(true);
    try {
      const result = await getAgentById(agentId);
      if (result.success && result.data) {
        setAgent(result.data);
      } else {
        console.error("Failed to fetch agent:", result.error);
        setAgent(null);
      }
    } catch (error) {
      console.error("Error fetching agent:", error);
      setAgent(null);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, getAgentById, isReady]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  // Memoize the onChange callback to prevent infinite re-renders
  const handleDraftChange = useCallback((d: { 
    name: string; 
    description: string; 
    instructions: string; 
    model?: string; 
    reasoning_effort?: string 
  }) => {
    setDraft(d);
  }, []);

  const handleSave = useCallback(async (agentData?: { 
    name: string; 
    description: string; 
    instructions: string; 
    model?: string; 
    reasoning_effort?: string 
  }) => {
    if (!agent) return;

    const dataToSave = agentData || {
      name: draft?.name ?? agent.name,
      description: draft?.description ?? agent.description,
      instructions: draft?.instructions ?? agent.instructions,
      model: draft?.model,
      reasoning_effort: draft?.reasoning_effort,
    };

    setIsSaving(true);
    try {
      // Use latest draft data merged with current agent data
      const latest = { ...(draft || {}), ...dataToSave };
      
      // If this is a published agent, create a new version (draft)
      if (agent.status === "published") {
        const rootAgentId = agent.parent_agent_id || agentId;
        
        const newAgentData = {
          workspace_id: workspaceId,
          name: latest.name,
          description: latest.description,
          instructions: latest.instructions,
          model: latest.model,
          reasoning_effort: latest.reasoning_effort,
          status: "draft" as const,
          parent_agent_id: rootAgentId,
        };

        const result = await createAgent(newAgentData);
        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newAgent: any = result.data;
          
          // Clone tools from current agent to new version
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolsRes: any = await getAgentTools(agentId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tools: any[] = toolsRes?.agent_tools || [];
            if (newAgent?.id && Array.isArray(tools) && tools.length > 0) {
              await Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tools.map((t: any) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const payload: any = {
                    agent_id: newAgent.id,
                    tool_type: t.tool_type,
                  };
                  if (t.tool_type === "mcp") {
                    if (t.mcp_server_id) payload.mcp_server_id = t.mcp_server_id;
                    if (t.allowed_tools?.length) payload.allowed_tools = t.allowed_tools;
                  }
                  if (t.tool_type === "custom") {
                    if (t.config) payload.config = t.config;
                  }
                  if (typeof t.execution_order === "number") payload.execution_order = t.execution_order;
                  return createAgentTool(payload);
                })
              );
            }
          } catch (e) {
            console.error("Failed to clone tools to new version", e);
          }
          
          // Navigate to the new agent (draft version)
          if (newAgent?.id) {
            router.push(`/agents/${newAgent.id}`);
            return;
          }
        } else {
          console.error("Failed to create new agent version:", result.error);
        }
      } else {
        // This is a draft or archived agent, just update it
        const updateData = {
          name: latest.name,
          description: latest.description,
          instructions: latest.instructions,
          model: latest.model,
          reasoning_effort: latest.reasoning_effort,
        };

        const result = await updateAgent(agentId, updateData);
        if (result.success && result.data) {
          setAgent(result.data);
        } else {
          console.error("Failed to update agent:", result.error);
        }
      }
    } catch (error) {
      console.error("Error saving agent:", error);
    } finally {
      setIsSaving(false);
    }
  }, [agent, draft, agentId, workspaceId, createAgent, updateAgent, router]);

  const handlePublish = useCallback(async () => {
    if (!agent) return;

    setIsPublishing(true);
    try {
      const result = await publishAgent(agentId);
      if (result.success && result.data) {
        const agentResult = await getAgentById(agentId);
        if (agentResult.success && agentResult.data) {
          setAgent(agentResult.data);
        }
      } else {
        console.error("Failed to publish agent:", result.error);
      }
    } catch (error) {
      console.error("Error publishing agent:", error);
    } finally {
      setIsPublishing(false);
    }
  }, [agent, agentId, publishAgent, getAgentById]);

  const handleDelete = useCallback(async () => {
    if (!agent) return;

    setIsDeleting(true);
    try {
      const result = await deleteAgent(agentId);
      if (result.success) {
        router.push("/agents");
      } else {
        console.error("Failed to delete agent:", result.error);
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [agent, agentId, deleteAgent, router]);

  const handleArchive = useCallback(async () => {
    if (!agent) return;

    setIsArchiving(true);
    try {
      const result = await archiveAgent(agentId);
      if (result.success && result.data) {
        const agentResult = await getAgentById(agentId);
        if (agentResult.success && agentResult.data) {
          setAgent(agentResult.data);
        }
      } else {
        console.error("Failed to archive agent:", result.error);
      }
    } catch (error) {
      console.error("Error archiving agent:", error);
    } finally {
      setIsArchiving(false);
    }
  }, [agent, agentId, archiveAgent, getAgentById]);

  return {
    // State
    agent,
    isLoading,
    isReady,
    workspaceId,
    activeTab,
    draft,
    
    // Loading states
    isSaving,
    isPublishing,
    isDeleting,
    isArchiving,
    
    // Actions
    setActiveTab,
    handleDraftChange,
    handleSave,
    handlePublish,
    handleDelete,
    handleArchive,
    getAgentVersions,
    
    // Utils
    fetchAgent,
  };
}
