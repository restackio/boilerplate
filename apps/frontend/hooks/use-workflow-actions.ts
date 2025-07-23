"use client";

import { useState, useCallback } from "react";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

// Types for API responses - updated to match new workflow response structure
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Types for Agent and Task data
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
  created_at?: string;
  updated_at?: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status: "open" | "active" | "waiting" | "closed" | "completed";
  agent_id: string;
  assigned_to_id: string;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Helper function to execute workflow and get result
async function executeWorkflow<T>(
  workflowName: string,
  input: any = {}
): Promise<ApiResponse<T>> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName,
      input,
    });

    // Wait for the workflow to complete and get the result
    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    // Handle the new response structure
    if (result && typeof result === 'object') {
      // For list responses (e.g., AgentsReadWorkflow/TasksReadWorkflow returns { agents/tasks: [...] })
      if ('agents' in result && Array.isArray(result.agents)) {
        return {
          success: true,
          data: result.agents as T,
          count: result.agents.length,
        };
      }
      
      if ('tasks' in result && Array.isArray(result.tasks)) {
        return {
          success: true,
          data: result.tasks as T,
          count: result.tasks.length,
        };
      }
      
      // For single responses (e.g., AgentsCreateWorkflow/TasksCreateWorkflow returns { agent/task: {...} })
      if ('agent' in result && result.agent) {
        return {
          success: true,
          data: result.agent as T,
        };
      }
      
      if ('task' in result && result.task) {
        return {
          success: true,
          data: result.task as T,
        };
      }
      
      // For delete responses (e.g., AgentsDeleteWorkflow/TasksDeleteWorkflow returns { success: boolean })
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

// Agent Actions Hook
export function useAgentActions() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });

  const fetchAgents = useCallback(async () => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<Agent[]>("AgentsReadWorkflow", {});
      if (result.success && result.data) {
        setAgents(result.data);
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to fetch agents" });
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to fetch agents" });
    }
    setLoading({ isLoading: false, error: null });
  }, []);

  const createAgent = useCallback(async (agentData: Omit<Agent, "id" | "created_at" | "updated_at">) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<Agent>("AgentsCreateWorkflow", agentData);
      if (result.success) {
        await fetchAgents(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to create agent" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to create agent" });
      return { success: false, error: "Failed to create agent" };
    }
  }, [fetchAgents]);

  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<Agent>("AgentsUpdateWorkflow", {
        agent_id: agentId,
        ...updates,
      });
      if (result.success) {
        await fetchAgents(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to update agent" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to update agent" });
      return { success: false, error: "Failed to update agent" };
    }
  }, [fetchAgents]);

  const removeAgent = useCallback(async (agentId: string) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<boolean>("AgentsDeleteWorkflow", {
        agent_id: agentId,
      });
      if (result.success) {
        await fetchAgents(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to delete agent" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to delete agent" });
      return { success: false, error: "Failed to delete agent" };
    }
  }, [fetchAgents]);

  const getAgentById = useCallback(async (agentId: string) => {
    try {
      const result = await executeWorkflow<Agent>("AgentsGetByIdWorkflow", {
        agent_id: agentId,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get agent" };
    }
  }, []);

  const getAgentsByStatus = useCallback(async (status: string) => {
    try {
      const result = await executeWorkflow<Agent[]>("AgentsGetByStatusWorkflow", {
        status,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get agents by status" };
    }
  }, []);

  const getAgentVersions = useCallback(async (parentAgentId: string) => {
    try {
      const result = await executeWorkflow<Agent[]>("AgentsGetVersionsWorkflow", {
        parent_agent_id: parentAgentId,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get agent versions" };
    }
  }, []);

  return {
    agents,
    loading,
    fetchAgents,
    createAgent,
    updateAgent,
    removeAgent,
    getAgentById,
    getAgentsByStatus,
    getAgentVersions,
  };
}

// Task Actions Hook
export function useTaskActions() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });

  const fetchTasks = useCallback(async () => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<Task[]>("TasksReadWorkflow", {});
      if (result.success && result.data) {
        setTasks(result.data);
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to fetch tasks" });
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to fetch tasks" });
    }
    setLoading({ isLoading: false, error: null });
  }, []);

  const createTask = useCallback(async (taskData: TaskCreateInput) => {
    setLoading({ isLoading: true, error: null });
    try {
      // Map frontend field names to backend field names
      const backendTaskData = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        agent_id: taskData.agent_id,
        assigned_to: taskData.assigned_to_id, // Map assigned_to_id to assigned_to
      };
      
      const result = await executeWorkflow<Task>("TasksCreateWorkflow", backendTaskData);
      if (result.success) {
        await fetchTasks(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to create task" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to create task" });
      return { success: false, error: "Failed to create task" };
    }
  }, [fetchTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setLoading({ isLoading: true, error: null });
    try {
      // Map frontend field names to backend field names
      const backendUpdates: any = {
        task_id: taskId,
      };
      
      // Only include fields that are actually being updated
      if (updates.title !== undefined) backendUpdates.title = updates.title;
      if (updates.description !== undefined) backendUpdates.description = updates.description;
      if (updates.status !== undefined) backendUpdates.status = updates.status;
      if (updates.agent_id !== undefined) backendUpdates.agent_id = updates.agent_id;
      if (updates.assigned_to_id !== undefined) backendUpdates.assigned_to = updates.assigned_to_id;
      
      const result = await executeWorkflow<Task>("TasksUpdateWorkflow", backendUpdates);
      if (result.success) {
        await fetchTasks(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to update task" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to update task" });
      return { success: false, error: "Failed to update task" };
    }
  }, [fetchTasks]);

  const removeTask = useCallback(async (taskId: string) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<boolean>("TasksDeleteWorkflow", {
        task_id: taskId,
      });
      if (result.success) {
        await fetchTasks(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to delete task" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to delete task" });
      return { success: false, error: "Failed to delete task" };
    }
  }, [fetchTasks]);

  const getTaskById = useCallback(async (taskId: string) => {
    try {
      const result = await executeWorkflow<Task>("TasksGetByIdWorkflow", {
        task_id: taskId,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get task" };
    }
  }, []);

  const getTasksByStatus = useCallback(async (status: string) => {
    try {
      const result = await executeWorkflow<Task[]>("TasksGetByStatusWorkflow", {
        status,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get tasks by status" };
    }
  }, []);

  return {
    tasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    removeTask,
    getTaskById,
    getTasksByStatus,
  };
}

// API Health Hook
export function useApiHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  const checkHealth = useCallback(async () => {
    try {
      // Try to run a simple workflow to test connectivity
      const { workflowId, runId } = await runWorkflow({
        workflowName: "AgentsReadWorkflow",
        input: {},
      });
      
      // Try to get the result with a timeout
      await Promise.race([
        getWorkflowResult({ workflowId, runId }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        )
      ]);
      
      setIsHealthy(true);
    } catch (error) {
      console.error("API health check failed:", error);
      setIsHealthy(false);
    }
  }, []);

  return {
    isHealthy,
    checkHealth,
  };
} 