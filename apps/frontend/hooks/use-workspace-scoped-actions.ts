"use client";

import { useCallback, useState, useEffect } from "react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface Agent {
  id: string;
  name: string;
  version: string;
  description?: string;
  instructions: string;
  status: "active" | "inactive";
  parent_agent_id?: string;
  created_at?: string;
  updated_at?: string;
  version_count?: number;
  latest_version?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "open" | "active" | "waiting" | "closed" | "completed";
  agent_id: string;
  agent_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  agent_task_id?: string; 
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string; // Icon name from lucide-react
  created_at?: string;
  updated_at?: string;
}

async function executeWorkflow<T>(
  workflowName: string,
  input: any = {}
): Promise<ApiResponse<T>> {
  console.log(`🔄 [executeWorkflow] Starting ${workflowName} with input:`, input);
  const startTime = Date.now();
  
  try {
    console.log(`🔄 [executeWorkflow] Running workflow ${workflowName}...`);
    const runWorkflowStartTime = Date.now();
    
    const { workflowId, runId } = await runWorkflow({
      workflowName,
      input,
    });
    
    const runWorkflowEndTime = Date.now();
    console.log(`✅ [executeWorkflow] runWorkflow completed in ${runWorkflowEndTime - runWorkflowStartTime}ms`);
    console.log(`✅ [executeWorkflow] Workflow ID: ${workflowId}, Run ID: ${runId}`);

    // Get the result
    console.log(`🔄 [executeWorkflow] Getting workflow result...`);
    const getResultStartTime = Date.now();
    
    const result = await getWorkflowResult({
      workflowId,
      runId,
    });
    
    const getResultEndTime = Date.now();
    console.log(`✅ [executeWorkflow] getWorkflowResult completed in ${getResultEndTime - getResultStartTime}ms`);
    console.log(`✅ [executeWorkflow] Raw result:`, result);
    
    if (result === null || result === undefined) {
      throw new Error('Workflow returned null or undefined result');
    }
    
    // Handle the response structure
    if (result && typeof result === 'object') {
      // For list responses (e.g., AgentsReadWorkflow returns { agents: [...] })
      if ('agents' in result && Array.isArray(result.agents)) {
        return {
          success: true,
          data: result.agents as T,
          count: result.agents.length,
        };
      }
      
      // For tasks list responses
      if ('tasks' in result && Array.isArray(result.tasks)) {
        return {
          success: true,
          data: result.tasks as T,
          count: result.tasks.length,
        };
      }
      
      // For teams list responses
      if ('teams' in result && Array.isArray(result.teams)) {
        return {
          success: true,
          data: result.teams as T,
          count: result.teams.length,
        };
      }
      
      // Handle case where the result is directly an array
      if (Array.isArray(result)) {
        return {
          success: true,
          data: result as T,
          count: result.length,
        };
      }
      
      // For single responses (e.g., AgentsCreateWorkflow returns { agent: {...} })
      if ('agent' in result && result.agent) {
        return {
          success: true,
          data: result.agent as T,
        };
      }
      
      // For task single responses
      if ('task' in result && result.task) {
        return {
          success: true,
          data: result.task as T,
        };
      }
      
      // For team single responses
      if ('team' in result && result.team) {
        return {
          success: true,
          data: result.team as T,
        };
      }
      
      // For delete responses (e.g., AgentsDeleteWorkflow returns { success: boolean })
      if ('success' in result) {
        return {
          success: result.success,
          data: result.success as T,
        };
      }
      
      // For other responses, return as is
      return {
        success: true,
        data: result as T,
      };
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ [executeWorkflow] ${workflowName} total execution time: ${totalTime}ms`);
    
    return {
      success: true,
      data: result as T,
    };
  } catch (error) {
    console.error(`❌ Workflow execution failed for ${workflowName}:`, error);
    const totalTime = Date.now() - startTime;
    console.log(`❌ [executeWorkflow] ${workflowName} failed after ${totalTime}ms`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function useWorkspaceScopedActions() {
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });
  const [teamsCache, setTeamsCache] = useState<Record<string, Team[]>>({});

  // Agents actions
  const fetchAgents = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot fetch agents: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Agent[]>("AgentsReadWorkflow", {
        workspace_id: currentWorkspaceId
      });
      
      if (result.success && result.data) {
        setAgents(result.data);
        setAgentsLoading({ isLoading: false, error: null });
      } else {
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to fetch agents" });
      }
    } catch (error) {
      setAgentsLoading({ isLoading: false, error: "Failed to fetch agents" });
    }
    return result;
  }, [currentWorkspaceId, isReady]);

  const createAgent = useCallback(async (agentData: any) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot create agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Agent>("AgentsCreateWorkflow", {
        ...agentData,
        workspace_id: currentWorkspaceId
      });
      
      if (result.success) {
        await fetchAgents();
      } else {
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to create agent" });
      }
    } catch (error) {
      setAgentsLoading({ isLoading: false, error: "Failed to create agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  const updateAgent = useCallback(async (agentId: string, updates: any) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot update agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Agent>("AgentsUpdateWorkflow", {
        agent_id: agentId,
        workspace_id: currentWorkspaceId,
        ...updates
      });
      
      if (result.success) {
        await fetchAgents();
      } else {
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to update agent" });
      }
    } catch (error) {
      setAgentsLoading({ isLoading: false, error: "Failed to update agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  const deleteAgent = useCallback(async (agentId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot delete agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<boolean>("AgentsDeleteWorkflow", {
        agent_id: agentId,
        workspace_id: currentWorkspaceId
      });
      
      if (result.success) {
        await fetchAgents();
      } else {
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to delete agent" });
      }
    } catch (error) {
      setAgentsLoading({ isLoading: false, error: "Failed to delete agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  const getAgentVersions = useCallback(async (parentAgentId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot get agent versions: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await executeWorkflow<Agent[]>("AgentsGetVersionsWorkflow", {
        parent_agent_id: parentAgentId,
        workspace_id: currentWorkspaceId
      });
      return result;
    } catch (error) {
      console.error("❌ Failed to get agent versions:", error);
      return { success: false, error: "Failed to get agent versions" };
    }
  }, [currentWorkspaceId, isReady]);

  // Tasks actions
  const fetchTasks = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot fetch tasks: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTasksLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Task[]>("TasksReadWorkflow", {
        workspace_id: currentWorkspaceId
      });
      
      if (result.success && result.data) {
        setTasks(result.data);
      } else {
        setTasksLoading({ isLoading: false, error: result.error || "Failed to fetch tasks" });
      }
    } catch (error) {
      setTasksLoading({ isLoading: false, error: "Failed to fetch tasks" });
    }
    setTasksLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady]);

  const createTask = useCallback(async (taskData: any) => {
    console.log("🔄 [useWorkspaceScopedActions] createTask called with:", taskData);
    const startTime = Date.now();
    
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot create task: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTasksLoading({ isLoading: true, error: null });
    let result;
    try {
      console.log("🔄 [useWorkspaceScopedActions] Executing TasksCreateWorkflow...");
      const workflowStartTime = Date.now();
      
      result = await executeWorkflow<Task>("TasksCreateWorkflow", {
        ...taskData,
        workspace_id: currentWorkspaceId
      });
      
      const workflowEndTime = Date.now();
      console.log(`✅ [useWorkspaceScopedActions] TasksCreateWorkflow completed in ${workflowEndTime - workflowStartTime}ms`);
      console.log("✅ [useWorkspaceScopedActions] Workflow result:", result);
      
      if (result.success) {
        console.log("✅ [useWorkspaceScopedActions] Task created successfully");
        // Don't update local state since we're navigating to the task detail page
        // The task detail page will fetch the specific task by ID
      } else {
        setTasksLoading({ isLoading: false, error: result.error || "Failed to create task" });
      }
    } catch (error) {
      console.error("❌ [useWorkspaceScopedActions] Error in createTask:", error);
      setTasksLoading({ isLoading: false, error: "Failed to create task" });
    }
    setTasksLoading({ isLoading: false, error: null });
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [useWorkspaceScopedActions] createTask total time: ${totalTime}ms`);
    return result;
  }, [currentWorkspaceId, isReady, fetchTasks]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot update task: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTasksLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Task>("TasksUpdateWorkflow", {
        task_id: taskId,
        workspace_id: currentWorkspaceId,
        ...updates
      });
      
      if (result.success) {
        await fetchTasks();
      } else {
        setTasksLoading({ isLoading: false, error: result.error || "Failed to update task" });
      }
    } catch (error) {
      setTasksLoading({ isLoading: false, error: "Failed to update task" });
    }
    setTasksLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchTasks]);

  const getTaskById = useCallback(async (taskId: string) => {
    console.log("🔄 [useWorkspaceScopedActions] getTaskById called with:", taskId);
    const startTime = Date.now();
    
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot get task: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      console.log("🔄 [useWorkspaceScopedActions] Executing TasksGetByIdWorkflow...");
      const workflowStartTime = Date.now();
      
      const result = await executeWorkflow<Task>("TasksGetByIdWorkflow", {
        task_id: taskId,
        workspace_id: currentWorkspaceId
      });
      
      const workflowEndTime = Date.now();
      console.log(`✅ [useWorkspaceScopedActions] TasksGetByIdWorkflow completed in ${workflowEndTime - workflowStartTime}ms`);
      console.log("✅ [useWorkspaceScopedActions] getTaskById result:", result);
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [useWorkspaceScopedActions] getTaskById total time: ${totalTime}ms`);
      
      return result;
    } catch (error) {
      console.error("❌ [useWorkspaceScopedActions] Error in getTaskById:", error);
      const totalTime = Date.now() - startTime;
      console.log(`❌ [useWorkspaceScopedActions] getTaskById failed after ${totalTime}ms`);
      return { success: false, error: "Failed to get task" };
    }
  }, [currentWorkspaceId, isReady]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot delete task: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTasksLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<boolean>("TasksDeleteWorkflow", {
        task_id: taskId,
        workspace_id: currentWorkspaceId
      });
      
      if (result.success) {
        await fetchTasks();
      } else {
        setTasksLoading({ isLoading: false, error: result.error || "Failed to delete task" });
      }
    } catch (error) {
      setTasksLoading({ isLoading: false, error: "Failed to delete task" });
    }
    setTasksLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchTasks]);

  // Teams actions
  const fetchTeams = useCallback(async (forceRefresh = false) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot fetch teams: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh && teamsCache[currentWorkspaceId]) {
      setTeams(teamsCache[currentWorkspaceId]);
      return { success: true, data: teamsCache[currentWorkspaceId] };
    }

    setTeamsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Team[]>("TeamsReadWorkflow", {
        workspace_id: currentWorkspaceId
      });
      
      if (result.success && result.data) {
        setTeams(result.data);
        // Cache the results
        setTeamsCache(prev => ({ ...prev, [currentWorkspaceId]: result.data }));
        setTeamsLoading({ isLoading: false, error: null });
      } else {
        setTeamsLoading({ isLoading: false, error: result.error || "Failed to fetch teams" });
      }
    } catch (error) {
      setTeamsLoading({ isLoading: false, error: "Failed to fetch teams" });
    }
    return result;
  }, [currentWorkspaceId, isReady, teamsCache]);

  const createTeam = useCallback(async (teamData: { name: string; description?: string; icon?: string }) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot create team: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTeamsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Team>("TeamsCreateWorkflow", {
        ...teamData,
        workspace_id: currentWorkspaceId
      });
      
      if (result.success) {
        await fetchTeams(true); // Force refresh to get updated data
      } else {
        setTeamsLoading({ isLoading: false, error: result.error || "Failed to create team" });
      }
    } catch (error) {
      setTeamsLoading({ isLoading: false, error: "Failed to create team" });
    }
    setTeamsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchTeams]);

  const updateTeam = useCallback(async (teamId: string, updates: { name?: string; description?: string; icon?: string }) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot update team: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTeamsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Team>("TeamsUpdateWorkflow", {
        team_id: teamId,
        workspace_id: currentWorkspaceId,
        ...updates
      });
      
      if (result.success) {
        await fetchTeams(true); // Force refresh to get updated data
      } else {
        setTeamsLoading({ isLoading: false, error: result.error || "Failed to update team" });
      }
    } catch (error) {
      setTeamsLoading({ isLoading: false, error: "Failed to update team" });
    }
    setTeamsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchTeams]);

  const deleteTeam = useCallback(async (teamId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot delete team: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTeamsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<boolean>("TeamsDeleteWorkflow", {
        team_id: teamId,
        workspace_id: currentWorkspaceId
      });
      
      if (result.success) {
        await fetchTeams();
      } else {
        setTeamsLoading({ isLoading: false, error: result.error || "Failed to delete team" });
      }
    } catch (error) {
      setTeamsLoading({ isLoading: false, error: "Failed to delete team" });
    }
    setTeamsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchTeams]);

  const getTeamById = useCallback(async (teamId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("❌ Cannot get team: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await executeWorkflow<Team>("TeamsGetByIdWorkflow", {
        team_id: teamId,
        workspace_id: currentWorkspaceId
      });
      return result;
    } catch (error) {
      console.error("❌ Failed to get team:", error);
      return { success: false, error: "Failed to get team" };
    }
  }, [currentWorkspaceId, isReady]);

  return {
    currentWorkspaceId,
    isReady,
    
    agents,
    agentsLoading,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentVersions,
    
    tasks,
    tasksLoading,
    fetchTasks,
    createTask,
    updateTask,
    getTaskById,
    deleteTask,
    
    teams,
    teamsLoading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
  };
} 