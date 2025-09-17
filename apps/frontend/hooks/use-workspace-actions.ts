"use client";

import { useState, useCallback } from "react";
import { runWorkflow, getWorkflowResult, testServerAction } from "@/app/actions/workflow";
import { User } from "../types/user";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

export interface Workspace {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceCreateInput {
  name: string;
}

async function executeWorkflow<T>(
  workflowName: string,
  input: any = {}
): Promise<ApiResponse<T>> {
  try {
    // Schedule the workflow
    const { workflowId, runId } = await runWorkflow({
      workflowName,
      input,
    });

    // Get the result
    const result = await getWorkflowResult({
      workflowId,
      runId,
    });
    
    if (result === null || result === undefined) {
      throw new Error('Workflow returned null or undefined result');
    }
    
    // Handle the response structure
    if (result && typeof result === 'object') {
      // For list responses (e.g., WorkspacesReadWorkflow returns { workspaces: [...] })
      if ('workspaces' in result && Array.isArray(result.workspaces)) {
        return {
          success: true,
          data: result.workspaces as T,
          count: result.workspaces.length,
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
      
      // For single responses (e.g., WorkspacesCreateWorkflow returns { workspace: {...} })
      if ('workspace' in result && result.workspace) {
        return {
          success: true,
          data: result.workspace as T,
        };
      }
      
      // For delete responses (e.g., WorkspacesDeleteWorkflow returns { success: boolean })
      if ('success' in result) {
        return {
          success: Boolean(result.success),
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
    console.error(`❌ Workflow execution failed for ${workflowName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function useWorkspaceActions(currentUser?: User | null, currentWorkspaceId?: string | null) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const fetchWorkspaces = useCallback(async (userOverride?: User) => {
    const user = userOverride || currentUser;
    
    if (!user) {
      return;
    }
    
    try {
      try {
        await testServerAction();
      } catch (testError) {
        console.error("Test server action failed:", testError);
      }
      
      const result = await executeWorkflow<Workspace[]>("WorkspacesReadWorkflow", {
        user_id: user.id
      });
      
      if (result.success && result.data) {
        setWorkspaces(result.data);
      } else {
        console.error("Failed to fetch workspaces:", result.error);
        throw new Error(result.error || "Failed to fetch workspaces");
      }
    } catch (error) {
      console.error("Exception fetching workspaces:", error);
      throw error;
    }
  }, [currentUser]);

  const createWorkspace = useCallback(async (workspaceData: WorkspaceCreateInput) => {
    try {
      const result = await executeWorkflow<Workspace>("WorkspacesCreateWorkflow", workspaceData);
      if (result.success) {
        await fetchWorkspaces();
        return result;
      } else {
        throw new Error(result.error || "Failed to create workspace");
      }
    } catch (error) {
      throw error;
    }
  }, [fetchWorkspaces]);

  const updateWorkspace = useCallback(async (workspaceId: string, updates: Partial<Workspace>) => {
    try {
      const result = await executeWorkflow<Workspace>("WorkspacesUpdateWorkflow", {
        workspace_id: workspaceId,
        ...updates,
      });
      if (result.success) {
        await fetchWorkspaces();
        return result;
      } else {
        throw new Error(result.error || "Failed to update workspace");
      }
    } catch (error) {
      throw error;
    }
  }, [fetchWorkspaces]);

  const removeWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const result = await executeWorkflow<boolean>("WorkspacesDeleteWorkflow", {
        workspace_id: workspaceId,
      });
      if (result.success) {
        await fetchWorkspaces();
        return result;
      } else {
        throw new Error(result.error || "Failed to delete workspace");
      }
    } catch (error) {
      throw error;
    }
  }, [fetchWorkspaces]);

  const getWorkspaceById = useCallback(async (workspaceId: string) => {
    try {
      const result = await executeWorkflow<Workspace>("WorkspacesGetByIdWorkflow", {
        workspace_id: workspaceId,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get workspace" };
    }
  }, []);

  return {
    workspaces,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    getWorkspaceById,
  };
} 