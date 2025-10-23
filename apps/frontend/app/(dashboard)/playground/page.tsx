"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { executeWorkflow } from "@/app/actions/workflow";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { 
  PlaygroundHeader,
  PlaygroundLeftPanel,
  PlaygroundMiddlePanel,
  PlaygroundRightPanel
} from "./components";
import type { Agent } from "@/hooks/use-workspace-scoped-actions";

export default function PlaygroundPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = searchParams.get("agentId");
  const { isReady, workspaceId } = useDatabaseWorkspace();
  const { getAgentById, getAgentVersions, updateAgent } = useWorkspaceScopedActions();

  // State for the draft agent being edited
  const [draftAgent, setDraftAgent] = useState<Agent | null>(null);
  const [comparisonAgent, setComparisonAgent] = useState<Agent | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  
  // State for task creation
  const [taskDescription, setTaskDescription] = useState("");
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  
  // UI states
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  
  // Read task IDs directly from URL (single source of truth)
  const draftTaskId = searchParams.get("draftTaskId");
  const comparisonTaskId = searchParams.get("comparisonTaskId");

  // Load initial agent data
  useEffect(() => {
    const loadAgentData = async () => {
      if (!isReady || !agentId) return;

      try {
        setIsLoading(true);
        
        // Load the specific agent
        const agentResult = await getAgentById(agentId);
        if (agentResult.success && agentResult.data) {
          setDraftAgent(agentResult.data);
          
          // Get the parent agent ID (or use current id if it's a parent)
          const rootAgentId = agentResult.data.parent_agent_id || agentId;
          
          // Fetch all versions for this agent group (more efficient than fetching all workspace agents)
          const versionsResult = await getAgentVersions(rootAgentId);
          
          if (versionsResult.success && versionsResult.data) {
            const allVersions = versionsResult.data as Agent[];
            setAvailableAgents(allVersions);
            
            // Find the latest published version
            const publishedVersions = allVersions.filter(
              agent => agent.status === "published"
            );
            
            // Sort by updated_at and get the most recent
            if (publishedVersions.length > 0) {
              const latestPublished = publishedVersions.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.created_at || '1970-01-01').getTime();
                const dateB = new Date(b.updated_at || b.created_at || '1970-01-01').getTime();
                return dateB - dateA;
              })[0];
              setComparisonAgent(latestPublished);
            }
          }
        }
      } catch (error) {
        console.error("Error loading agent data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgentData();
  }, [isReady, agentId, getAgentById, getAgentVersions]);

  // Auto-collapse left panel when tasks are loaded
  useEffect(() => {
    if (draftTaskId && comparisonTaskId) {
      setIsLeftPanelCollapsed(true);
    } else {
      setIsLeftPanelCollapsed(false);
    }
  }, [draftTaskId, comparisonTaskId]);

  const handleDraftAgentChange = useCallback((updates: Partial<Agent>) => {
    if (draftAgent) {
      setDraftAgent({ ...draftAgent, ...updates });
    }
  }, [draftAgent]);

  const handleComparisonAgentChange = useCallback((agentId: string) => {
    const selectedAgent = availableAgents.find(agent => agent.id === agentId);
    if (selectedAgent) {
      setComparisonAgent(selectedAgent);
    }
  }, [availableAgents]);

  const handleResetTasks = () => {
    setTaskDescription("");
    
    // Remove task IDs from URL - this will trigger re-render with null task IDs
    const params = new URLSearchParams(searchParams.toString());
    params.delete("draftTaskId");
    params.delete("comparisonTaskId");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCreateTasks = async () => {
    if (!draftAgent || !comparisonAgent || !taskDescription.trim() || !workspaceId) {
      return;
    }
    
    setIsCreatingTasks(true);
    try {
      // Save all draft agent changes before creating tasks
      const updateResult = await updateAgent(draftAgent.id, {
        instructions: draftAgent.instructions,
        model: draftAgent.model,
        reasoning_effort: draftAgent.reasoning_effort,
      });

      if (!updateResult.success) {
        throw new Error(`Failed to save draft agent changes: ${updateResult.error}`);
      }
      
      // Call workflow to create dual tasks
      const result = await executeWorkflow("PlaygroundCreateDualTasksWorkflow", {
        workspace_id: workspaceId,
        task_description: taskDescription,
        draft_agent_id: draftAgent.id,
        comparison_agent_id: comparisonAgent.id,
      });

      if (result.success && result.data) {
        const data = result.data as { 
          draft_task_id: string; 
          comparison_task_id: string;
        };
        
        // Update URL with new task IDs - this will trigger component re-renders
        const params = new URLSearchParams(searchParams.toString());
        params.set("draftTaskId", data.draft_task_id);
        params.set("comparisonTaskId", data.comparison_task_id);
        router.push(`?${params.toString()}`, { scroll: false });
      } else {
        throw new Error(`Task creation failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error("Error creating tasks:", error);
      throw error;
    } finally {
      setIsCreatingTasks(false);
    }
  };

  // Note: Loading state is now handled by loading.tsx
  if (isLoading) {
    return null; // Next.js loading.tsx will handle the loading state
  }

  if (!draftAgent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <EmptyState
          title="Agent not found"
          description="The agent you're looking for could not be loaded."
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <PlaygroundHeader
        draftAgent={draftAgent}
        comparisonAgent={comparisonAgent}
        draftTaskId={draftTaskId}
        comparisonTaskId={comparisonTaskId}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Agent Editor */}
        <PlaygroundLeftPanel
          agent={draftAgent}
          onAgentChange={handleDraftAgentChange}
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          workspaceId={workspaceId}
        />

        {/* Middle Panel - Draft Agent Execution */}
        <PlaygroundMiddlePanel
          agent={draftAgent}
          taskId={draftTaskId}
          title="Draft version"
          taskDescription={taskDescription}
          onTaskDescriptionChange={setTaskDescription}
          onCreateTasks={handleCreateTasks}
          onResetTasks={handleResetTasks}
          isCreatingTasks={isCreatingTasks}
          canCreateTasks={!!comparisonAgent && taskDescription.trim().length > 0}
          isLeftPanelCollapsed={isLeftPanelCollapsed}
        />

        {/* Right Panel - Comparison Agent Execution */}
        <PlaygroundRightPanel
          agent={comparisonAgent}
          taskId={comparisonTaskId}
          availableAgents={Array.isArray(availableAgents) ? availableAgents.filter(a => a.status === "published" || a.status === "draft") : []}
          onAgentChange={handleComparisonAgentChange}
          title="Compare to"
          isLeftPanelCollapsed={isLeftPanelCollapsed}
        />
      </div>
    </div>
  );
}
