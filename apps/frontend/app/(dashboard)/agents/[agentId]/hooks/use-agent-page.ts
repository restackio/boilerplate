"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions, Agent } from "@/hooks/use-workspace-scoped-actions";
import { AgentConfigData } from "../components/agent-configuration-form";

export function useAgentPage(agentId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady, workspaceId } = useDatabaseWorkspace();
  const { 
    updateAgent, 
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

  // Tab navigation state - read from URL parameter
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "setup");

  // Update activeTab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch the agent by ID
  const fetchAgent = useCallback(async () => {
    if (!agentId || !isReady) return;
    
    setIsLoading(true);
    try {
      const result = await getAgentById(agentId);
      if (result.success && result.data) {
        setAgent(result.data);
        setDraft({
          name: result.data.name,
          description: result.data.description,
          instructions: result.data.instructions,
          model: result.data.model || "gpt-5.2",
          reasoning_effort: result.data.reasoning_effort || "medium",
        });
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
  const handleDraftChange = useCallback((d: Partial<AgentConfigData>) => {
    setDraft(prev => {
      if (!prev) {
        // If no previous draft, we shouldn't update until agent is loaded
        return null;
      }
      return { ...prev, ...d };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!agent) return;

    // Use draft if available, otherwise fall back to agent's current values
    const currentDraft = draft || {
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      model: agent.model || "gpt-5.2",
      reasoning_effort: agent.reasoning_effort || "medium",
    };

    const dataToSave = {
      name: currentDraft.name,
      description: currentDraft.description,
      instructions: currentDraft.instructions,
      model: currentDraft.model,
      reasoning_effort: currentDraft.reasoning_effort,
    };

    setIsSaving(true);
    try {
      // If this is a published agent, create a new version (draft)
      if (agent.status === "published") {
        const cloneData = {
          ...dataToSave,
          type: agent.type, 
          status: "draft" as const,
        };

        const result = await cloneAgent(agent.parent_agent_id || agent.id, cloneData);
        
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
        const result = await updateAgent(agentId, dataToSave);
        
        if (result.success && result.data) {
          setAgent(result.data);
          // Also update draft to reflect the saved state
          setDraft({
            name: result.data.name,
            description: result.data.description,
            instructions: result.data.instructions,
            model: result.data.model || "gpt-5.2",
            reasoning_effort: result.data.reasoning_effort || "medium",
          });
        } else {
          console.error("Failed to update agent:", result.error);
        }
      }
    } catch (error) {
      console.error("Error saving agent:", error);
    } finally {
      setIsSaving(false);
    }
  }, [agent, draft, agentId, updateAgent, router, cloneAgent]);

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
