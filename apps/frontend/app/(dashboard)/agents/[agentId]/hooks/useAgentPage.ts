"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions, Agent } from "@/hooks/use-workspace-scoped-actions";
import { getAgentTools, createAgentTool } from "@/app/actions/workflow";
import { AgentConfigData } from "@/components/shared/AgentConfigurationForm";

export function useAgentPage(agentId: string) {
  const router = useRouter();
  const { isReady, workspaceId } = useDatabaseWorkspace();
  const { 
    updateAgent, 
    createAgent,
    cloneAgent, 
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
  const [draft, setDraft] = useState<AgentConfigData | null>(null);

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
  const handleDraftChange = useCallback((d: AgentConfigData) => {
    setDraft(d);
  }, []);

  const handleSave = useCallback(async (agentData?: AgentConfigData) => {
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
        
        const cloneData = {
          name: latest.name,
          description: latest.description,
          instructions: latest.instructions,
          model: latest.model,
          reasoning_effort: latest.reasoning_effort,
          status: "draft" as const,
        };

        const result = await cloneAgent(agentId, cloneData);
        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newAgent: any = result.data;
          
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
