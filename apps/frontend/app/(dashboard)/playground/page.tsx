"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { executeWorkflow } from "@/app/actions/workflow";
import { 
  PlaygroundHeader,
  PlaygroundLeftPanel,
  PlaygroundMiddlePanel,
  PlaygroundRightPanel
} from "./components";
import { Agent } from "@/hooks/use-workspace-scoped-actions";

export default function PlaygroundPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const { isReady, workspaceId } = useDatabaseWorkspace();
  const { getAgentById, fetchAgents, updateAgent } = useWorkspaceScopedActions();

  // State for the draft agent being edited
  const [draftAgent, setDraftAgent] = useState<Agent | null>(null);
  const [comparisonAgent, setComparisonAgent] = useState<Agent | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  
  // State for task creation
  const [taskDescription, setTaskDescription] = useState("");
  
  // State for task executions
  const [leftTaskId, setLeftTaskId] = useState<string | null>(null);
  const [rightTaskId, setRightTaskId] = useState<string | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  
  // UI states
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

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
          
          // Find the published version of this agent group
          const agentsResult = await fetchAgents();
          if (agentsResult.success && agentsResult.data) {
            setAvailableAgents(agentsResult.data);
            
            // Find published version in the same agent group
            const rootAgentId = agentResult.data.parent_agent_id || agentId;
            const publishedVersion = agentsResult.data.find(
              agent => 
                (agent.id === rootAgentId || agent.parent_agent_id === rootAgentId) && 
                agent.status === "published"
            );
            
            if (publishedVersion) {
              setComparisonAgent(publishedVersion);
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
  }, [isReady, agentId, getAgentById, fetchAgents]);

  const handleDraftAgentChange = (updates: Partial<Agent>) => {
    if (draftAgent) {
      setDraftAgent({ ...draftAgent, ...updates });
    }
  };

  const handleComparisonAgentChange = (agentId: string) => {
    const selectedAgent = availableAgents.find(agent => agent.id === agentId);
    if (selectedAgent) {
      setComparisonAgent(selectedAgent);
    }
  };

  const handleResetTasks = () => {
    setLeftTaskId(null);
    setRightTaskId(null);
    setTaskDescription("");
    setIsLeftPanelCollapsed(false);
  };

  const handleCreateTasks = async () => {
    if (!draftAgent || !comparisonAgent || !taskDescription.trim() || !workspaceId) {
      return;
    }

    // Auto-minimize left panel when creating tasks
    setIsLeftPanelCollapsed(true);
    
    setIsCreatingTasks(true);
    try {
      // Save all draft agent changes before creating tasks
      console.log("💾 Saving draft agent configuration...");
      const updateResult = await updateAgent(draftAgent.id, {
        // Only update fields that can be edited in the playground
        instructions: draftAgent.instructions,
        model: draftAgent.model,
        reasoning_effort: draftAgent.reasoning_effort,
        // Backend will filter out null values automatically
      });

      if (!updateResult.success) {
        throw new Error(`Failed to save draft agent changes: ${updateResult.error}`);
      }
      
      // Call our Python backend workflow to create dual tasks
      const result = await executeWorkflow("PlaygroundCreateDualTasksWorkflow", {
        workspace_id: workspaceId,
        task_description: taskDescription,
        draft_agent_id: draftAgent.id,
        comparison_agent_id: comparisonAgent.id,
      });

      if (result.success && result.data) {
        setLeftTaskId(result.data.draft_task_id);
        setRightTaskId(result.data.comparison_task_id);
      } else {
        throw new Error(`Task creation failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      // Reset the left panel collapse state on error
      setIsLeftPanelCollapsed(false);
      
      // Re-throw with more context for user feedback
      throw error;
    } finally {
      setIsCreatingTasks(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading playground...</p>
        </div>
      </div>
    );
  }

  if (!draftAgent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Agent not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <PlaygroundHeader 
        draftAgent={draftAgent}
        comparisonAgent={comparisonAgent}
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
          taskId={leftTaskId}
          title="Draft Version"
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
          taskId={rightTaskId}
          availableAgents={availableAgents.filter(a => a.status === "published" || a.status === "draft")}
          onAgentChange={handleComparisonAgentChange}
          title="Comparison Version"
          isLeftPanelCollapsed={isLeftPanelCollapsed}
        />
      </div>
    </div>
  );
}
