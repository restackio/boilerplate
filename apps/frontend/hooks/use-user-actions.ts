"use client";

import { useState, useCallback } from "react";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

// Types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Types for User data
export interface User {
  id: string;
  workspace_ids: string[];
  name: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Types for User creation
export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  avatar_url?: string;
}

// Types for User updates
export interface UserUpdateInput {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
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

    // Handle the response structure
    if (result && typeof result === 'object') {
      // For list responses (e.g., UsersReadWorkflow returns { users: [...] })
      if ('users' in result && Array.isArray(result.users)) {
        return {
          success: true,
          data: result.users as T,
          count: result.users.length,
        };
      }
      
      // For single responses (e.g., UsersCreateWorkflow returns { user: {...} })
      if ('user' in result && result.user) {
        return {
          success: true,
          data: result.user as T,
        };
      }
      
      // For delete responses (e.g., UsersDeleteWorkflow returns { success: boolean })
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
    console.error(`Workflow execution failed for ${workflowName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// User Actions Hook
export function useUserActions() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });

  const fetchUsers = useCallback(async () => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<User[]>("UsersReadWorkflow", {});
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to fetch users" });
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to fetch users" });
    }
    setLoading({ isLoading: false, error: null });
  }, []);

  const createUser = useCallback(async (userData: UserCreateInput) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<User>("UsersCreateWorkflow", userData);
      if (result.success) {
        await fetchUsers(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to create user" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to create user" });
      return { success: false, error: "Failed to create user" };
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<User>("UsersUpdateWorkflow", {
        user_id: userId,
        ...updates,
      });
      if (result.success) {
        await fetchUsers(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to update user" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to update user" });
      return { success: false, error: "Failed to update user" };
    }
  }, [fetchUsers]);

  const removeUser = useCallback(async (userId: string) => {
    setLoading({ isLoading: true, error: null });
    try {
      const result = await executeWorkflow<boolean>("UsersDeleteWorkflow", {
        user_id: userId,
      });
      if (result.success) {
        await fetchUsers(); // Refresh the list
        return result;
      } else {
        setLoading({ isLoading: false, error: result.error || "Failed to delete user" });
        return result;
      }
    } catch (error) {
      setLoading({ isLoading: false, error: "Failed to delete user" });
      return { success: false, error: "Failed to delete user" };
    }
  }, [fetchUsers]);

  const getUserById = useCallback(async (userId: string) => {
    try {
      const result = await executeWorkflow<User>("UsersGetByIdWorkflow", {
        user_id: userId,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get user" };
    }
  }, []);

  const getUserByEmail = useCallback(async (email: string) => {
    try {
      const result = await executeWorkflow<User>("UsersGetByEmailWorkflow", {
        email,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get user by email" };
    }
  }, []);

  const getUsersByWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const result = await executeWorkflow<User[]>("UsersGetByWorkspaceWorkflow", {
        workspace_id: workspaceId,
      });
      return result;
    } catch (error) {
      return { success: false, error: "Failed to get users by workspace" };
    }
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    removeUser,
    getUserById,
    getUserByEmail,
    getUsersByWorkspace,
  };
} 