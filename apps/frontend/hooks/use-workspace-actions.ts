"use client";

import { useState, useCallback } from "react";
import { executeWorkflow } from "@/app/actions/workflow";
import { User } from "../types/user";

export interface Workspace {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceCreateInput {
  name: string;
  created_by_user_id: string;
}

export function useWorkspaceActions(currentUser?: User | null) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);  

  const fetchWorkspaces = useCallback(async (userOverride?: User) => {
    const user = userOverride || currentUser;
    
    if (!user) {
      return;
    }
    
    try {
      const result = await executeWorkflow("WorkspacesReadWorkflow", {
        user_id: user.id
      });

      if (result.success && result.data) {
        setWorkspaces(result.data.workspaces);
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
    const result = await executeWorkflow("WorkspacesCreateWorkflow", workspaceData);
    if (result.success) {
      await fetchWorkspaces();
      return result.data.workspace;
    } else {
      throw new Error(result.error || "Failed to create workspace");
    }
  }, [fetchWorkspaces]);

  const updateWorkspace = useCallback(async (workspaceId: string, updates: Partial<Workspace>) => {
    const result = await executeWorkflow("WorkspacesUpdateWorkflow", {
      workspace_id: workspaceId,
      ...updates,
    });
    if (result.success) {
      await fetchWorkspaces();
      return result.data.workspace;
    } else {
      throw new Error(result.error || "Failed to update workspace");
    }
  }, [fetchWorkspaces]);

  const removeWorkspace = useCallback(async (workspaceId: string) => {
    const result = await executeWorkflow("WorkspacesDeleteWorkflow", {
      workspace_id: workspaceId,
    });
    if (result.success) {
      await fetchWorkspaces();
      return result.data.workspace;
    } else {
      throw new Error(result.error || "Failed to delete workspace");
    }
  }, [fetchWorkspaces]);

  const getWorkspaceById = useCallback(async (workspaceId: string) => {
    try {
      const result = await executeWorkflow("WorkspacesGetByIdWorkflow", {
        workspace_id: workspaceId,
      });
      return result.data.workspace;
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
