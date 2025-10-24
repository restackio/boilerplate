"use client";

import { useCallback, useState } from "react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

export interface ApiResponse<T = any> {
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
  description?: string;
  instructions: string;
  model?: string;
  reasoning_effort?: string;
  status: "published" | "draft" | "archived";
  parent_agent_id?: string;
  type?: "interactive" | "pipeline";
  team_id?: string;
  team_name?: string;
  created_at?: string;
  updated_at?: string;
  version_count?: number;
  published_version_id?: string;
  published_version_short?: string;
  draft_count?: number;
  latest_draft_version_id?: string;
  latest_draft_version_short?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "in_progress" | "in_review" | "closed" | "completed" | "failed";
  agent_id: string;
  agent_name: string;
  parent_agent_id?: string; // Parent agent ID for child agents (versions)
  type?: "interactive" | "pipeline";
  assigned_to_id: string;
  assigned_to_name: string;
  team_id?: string;
  team_name?: string;
  temporal_agent_id?: string; 
  agent_state?: {
    events?: any[];
    todos?: any[];
    subtasks?: any[];
    messages?: any[];
    metadata?: {
      temporal_agent_id?: string;
      temporal_run_id?: string;
      response_count?: number;
      message_count?: number;
    };
  };
  // Schedule-related fields
  schedule_spec?: any;
  schedule_task_id?: string;
  is_scheduled?: boolean;
  schedule_status?: "active" | "inactive" | "paused";
  restack_schedule_id?: string;
  // Creation tracking
  created_by_id?: string; // ID of user who created the task
  created_by_name?: string; // Name of user who created the task
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
}

export interface McpApprovalToolFilter {
  tool_names: string[];
}

export interface McpRequireApproval {
  never: McpApprovalToolFilter;
  always: McpApprovalToolFilter;
}

export interface McpServer {
  id: string;
  workspace_id: string;
  server_label: string;
  server_url?: string;
  local: boolean;
  server_description?: string;
  headers?: Record<string, string>;
  require_approval: McpRequireApproval;
  connections_count?: number;
  created_at?: string;
  updated_at?: string;
}

async function executeWorkflow<T>(
  workflowName: string,
  input: any = {}
): Promise<ApiResponse<T>> {

  try {

    const { workflowId, runId } = await runWorkflow({
      workflowName,
      input,
    });
    
 
    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    
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
      
      // For MCP servers list responses
      if ('mcp_servers' in result && Array.isArray(result.mcp_servers)) {
        return {
          success: true,
          data: result.mcp_servers as T,
          count: result.mcp_servers.length,
        };
      }
      
      // For datasets list responses
      if ('datasets' in result && Array.isArray(result.datasets)) {
        return {
          success: true,
          data: result.datasets as T,
          count: result.datasets.length,
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
      
      // For MCP server single responses
      if ('mcp_server' in result && result.mcp_server) {
        return {
          success: true,
          data: result.mcp_server as T,
        };
      }
      
      // For dataset single responses
      if ('dataset' in result && result.dataset) {
        return {
          success: true,
          data: result.dataset as T,
        };
      }
      
      // For dataset events responses (QueryDatasetEventsWorkflow)
      if ('events' in result && Array.isArray(result.events)) {
        return {
          success: true,
          data: result as T,
        };
      }
      
      // For OAuth responses (e.g., McpOAuthInitializeWorkflow returns { success: true, authorization_url: "..." })
      if ('success' in result && 'authorization_url' in result) {
        return {
          success: Boolean(result.success),
          data: result as T,
        };
      }
      
      // For delete responses (e.g., AgentsDeleteWorkflow returns { success: boolean })
      if ('success' in result && typeof result.success === 'boolean') {
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

    return {
      success: true,
      data: result as T,
    };
  } catch (error) {
    console.error(`Workflow execution failed for ${workflowName}:`, error);
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

  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpServersLoading, setMcpServersLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });

  // Agents actions
  const fetchAgents = useCallback(async (options?: { publishedOnly?: boolean }) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot fetch agents: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      // Use the enhanced table workflow to get version information
      result = await executeWorkflow<Agent[]>("AgentsReadTableWorkflow", {
        workspace_id: currentWorkspaceId,
        published_only: options?.publishedOnly || false
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
    const startTime = Date.now();
    
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot create agent: no valid workspace context");
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
        console.error("[createAgent] Workflow failed:", result.error);
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to create agent" });
      }
    } catch (error) {
      console.error("[createAgent] Exception in createAgent:", error);
      setAgentsLoading({ isLoading: false, error: "Failed to create agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  const cloneAgent = useCallback(async (sourceAgentId: string, agentData: any) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot clone agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<Agent>("AgentsCloneWorkflow", {
        source_agent_id: sourceAgentId,
        workspace_id: currentWorkspaceId,
        ...agentData
      });
      
      if (result.success) {
        await fetchAgents();
      } else {
        console.error("[cloneAgent] Workflow failed:", result.error);
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to clone agent" });
      }
    } catch (error) {
      console.error("[cloneAgent] Exception in cloneAgent:", error);
      setAgentsLoading({ isLoading: false, error: "Failed to clone agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  const updateAgent = useCallback(async (agentId: string, updates: any) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot update agent: no valid workspace context");
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
      console.error("Cannot delete agent: no valid workspace context");
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

  const getAgentById = useCallback(async (agentId: string) => {
    const startTime = Date.now();
    
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot get agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {

      const result = await executeWorkflow<Agent>("AgentsGetByIdWorkflow", {
        agent_id: agentId,
        workspace_id: currentWorkspaceId
      });

      
      return result;
    } catch (error) {
      console.error("[useWorkspaceScopedActions] Error in getAgentById:", error);
      return { success: false, error: "Failed to get agent" };
    }
  }, [currentWorkspaceId, isReady]);

  const getAgentVersions = useCallback(async (parentAgentId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot get agent versions: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await executeWorkflow<Agent[]>("AgentsGetVersionsWorkflow", {
        parent_agent_id: parentAgentId,
        workspace_id: currentWorkspaceId
      });
      return result;
    } catch (error) {
      console.error("Failed to get agent versions:", error);
      return { success: false, error: "Failed to get agent versions" };
    }
  }, [currentWorkspaceId, isReady]);

  const publishAgent = useCallback(async (agentId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot publish agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      // Update the agent status to 'published' directly
      result = await executeWorkflow<Agent>("AgentsUpdateWorkflow", {
        agent_id: agentId,
        workspace_id: currentWorkspaceId,
        status: "published"
      });
      
      if (result.success) {
        await fetchAgents();
      } else {
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to publish agent" });
      }
    } catch (error) {
      setAgentsLoading({ isLoading: false, error: "Failed to publish agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  const archiveAgent = useCallback(async (agentId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot archive agent: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setAgentsLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<{ agent: Agent }>("AgentsArchiveWorkflow", {
        agent_id: agentId,
      });
      
      if (result.success) {
        await fetchAgents();
      } else {
        setAgentsLoading({ isLoading: false, error: result.error || "Failed to archive agent" });
      }
    } catch (error) {
      setAgentsLoading({ isLoading: false, error: "Failed to archive agent" });
    }
    setAgentsLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchAgents]);

  // Tasks actions
  const fetchTasks = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot fetch tasks: no valid workspace context");
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
    const startTime = Date.now();
    
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot create task: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setTasksLoading({ isLoading: true, error: null });
    let result;
    try {

      result = await executeWorkflow<Task>("TasksCreateWorkflow", {
        ...taskData,
        workspace_id: currentWorkspaceId
      });
      

      
      if (result.success) {
        // Don't update local state since we're navigating to the task detail page
        // The task detail page will fetch the specific task by ID
      } else {
        setTasksLoading({ isLoading: false, error: result.error || "Failed to create task" });
      }
    } catch (error) {
      console.error("[useWorkspaceScopedActions] Error in createTask:", error);
      setTasksLoading({ isLoading: false, error: "Failed to create task" });
    }
    setTasksLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot update task: no valid workspace context");
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
    if (!isReady || !currentWorkspaceId) {
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await executeWorkflow<Task>("TasksGetByIdWorkflow", {
        task_id: taskId,
        workspace_id: currentWorkspaceId
      });
      
      return result;
    } catch (error) {
      console.error("[useWorkspaceScopedActions] Error in getTaskById:", error);
      return { success: false, error: "Failed to get task" };
    }
  }, [currentWorkspaceId, isReady]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot delete task: no valid workspace context");
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
      console.error("Cannot fetch teams: no valid workspace context");
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
      console.error("Cannot create team: no valid workspace context");
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
      console.error("Cannot update team: no valid workspace context");
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
      console.error("Cannot delete team: no valid workspace context");
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
      console.error("Cannot get team: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await executeWorkflow<Team>("TeamsGetByIdWorkflow", {
        team_id: teamId,
        workspace_id: currentWorkspaceId
      });
      return result;
    } catch (error) {
      console.error("Failed to get team:", error);
      return { success: false, error: "Failed to get team" };
    }
  }, [currentWorkspaceId, isReady]);

  // MCP Servers actions
  const fetchMcpServers = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot fetch MCP servers: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setMcpServersLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<McpServer[]>("McpServersReadWorkflow", {
        workspace_id: currentWorkspaceId
      });
      
      if (result.success && result.data) {
        setMcpServers(result.data);
        setMcpServersLoading({ isLoading: false, error: null });
      } else {
        setMcpServersLoading({ isLoading: false, error: result.error || "Failed to fetch MCP servers" });
      }
    } catch (error) {
      setMcpServersLoading({ isLoading: false, error: "Failed to fetch MCP servers" });
    }
    return result;
  }, [currentWorkspaceId, isReady]);

  const createMcpServer = useCallback(async (data: {
    server_label: string;
    server_url?: string;
    local?: boolean;
    server_description?: string;
    headers?: Record<string, string>;
    require_approval?: McpRequireApproval;
  }) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot create MCP server: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setMcpServersLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<McpServer>("McpServersCreateWorkflow", {
        ...data,
        workspace_id: currentWorkspaceId
      });
      
      if (result.success) {
        await fetchMcpServers();
      } else {
        setMcpServersLoading({ isLoading: false, error: result.error || "Failed to create MCP server" });
      }
    } catch (error) {
      setMcpServersLoading({ isLoading: false, error: "Failed to create MCP server" });
    }
    setMcpServersLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchMcpServers]);

  const updateMcpServer = useCallback(async (id: string, data: {
    server_label?: string;
    server_url?: string;
    local?: boolean;
    server_description?: string;
    headers?: Record<string, string>;
    require_approval?: McpRequireApproval;
  }) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot update MCP server: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setMcpServersLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<McpServer>("McpServersUpdateWorkflow", {
        mcp_server_id: id,
        ...data,
      });
      
      if (result.success) {
        await fetchMcpServers();
      } else {
        setMcpServersLoading({ isLoading: false, error: result.error || "Failed to update MCP server" });
      }
    } catch (error) {
      setMcpServersLoading({ isLoading: false, error: "Failed to update MCP server" });
    }
    setMcpServersLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchMcpServers]);

  const deleteMcpServer = useCallback(async (id: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot delete MCP server: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    setMcpServersLoading({ isLoading: true, error: null });
    let result;
    try {
      result = await executeWorkflow<boolean>("McpServersDeleteWorkflow", {
        mcp_server_id: id,
      });
      
      if (result.success) {
        await fetchMcpServers();
      } else {
        setMcpServersLoading({ isLoading: false, error: result.error || "Failed to delete MCP server" });
      }
    } catch (error) {
      setMcpServersLoading({ isLoading: false, error: "Failed to delete MCP server" });
    }
    setMcpServersLoading({ isLoading: false, error: null });
    return result;
  }, [currentWorkspaceId, isReady, fetchMcpServers]);

  const getMcpServerById = useCallback(async (id: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot get MCP server: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await executeWorkflow<McpServer>("McpServersGetByIdWorkflow", {
        mcp_server_id: id,
      });
      return result;
    } catch (error) {
      console.error("Failed to get MCP server:", error);
      return { success: false, error: "Failed to get MCP server" };
    }
  }, [currentWorkspaceId, isReady]);

  const refreshMcpTools = useCallback(async (mcpServerId: string) => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot refresh MCP tools: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await runWorkflow({
        workflowName: "McpToolsRefreshWorkflow", 
        input: { mcp_server_id: mcpServerId }
      });
      return { success: true, data: result };
    } catch (error) {
      console.error("Failed to refresh MCP tools:", error);
      return { success: false, error: "Failed to refresh MCP tools" };
    }
  }, [currentWorkspaceId, isReady]);

  const refreshAllMcpTools = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) {
      console.error("Cannot refresh all MCP tools: no valid workspace context");
      return { success: false, error: "No valid workspace context" };
    }

    try {
      const result = await runWorkflow({
        workflowName: "McpToolsRefreshAllWorkflow",
        input: { workspace_id: currentWorkspaceId }
      });
      return { success: true, data: result };
    } catch (error) {
      console.error("Failed to refresh all MCP tools:", error);
      return { success: false, error: "Failed to refresh all MCP tools" };
    }
  }, [currentWorkspaceId, isReady]);


  return {
    currentWorkspaceId,
    isReady,
    
    // Core workflow execution
    executeWorkflow,
    
    agents,
    agentsLoading,
    fetchAgents,
    createAgent,
    cloneAgent,
    updateAgent,
    deleteAgent,
    getAgentById,
    getAgentVersions,
    publishAgent,
    archiveAgent,
    
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
    
    mcpServers,
    mcpServersLoading,
    fetchMcpServers,
    createMcpServer,
    updateMcpServer,
    deleteMcpServer,
    getMcpServerById,
    refreshMcpTools,
    refreshAllMcpTools,
  };
} 