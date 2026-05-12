"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceActions, WorkspaceCreateInput } from "../hooks/use-workspace-actions";
import { User } from "../types/user";
import { Workspace } from "../hooks/use-workspace-actions";

interface DatabaseWorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  workspaceId: string | null; // Alias for currentWorkspaceId for convenience
  /** True when the current workspace is the admin workspace (e.g. build tasks stay in /tasks). */
  isAdminWorkspace: boolean;
  currentUser: User | null;
  currentUserId: string | null; // User ID for convenience
  loading: { isLoading: boolean; error: string | null };
  isReady: boolean;
  setCurrentWorkspaceId: (id: string) => void;
  setCurrentUser: (user: User) => void;
  refreshData: () => void;
  initialize: () => Promise<void>;
  createWorkspace: (workspaceData: WorkspaceCreateInput) => Promise<Workspace>;
}

const DatabaseWorkspaceContext = createContext<DatabaseWorkspaceContextType | undefined>(undefined);

export function DatabaseWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentWorkspaceId, setCurrentWorkspaceIdInternal] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wrap setCurrentWorkspaceId to persist to localStorage
  const setCurrentWorkspaceId = useCallback((id: string) => {
    setCurrentWorkspaceIdInternal(id);
    localStorage.setItem("currentWorkspaceId", id);
  }, []);

  const { workspaces, fetchWorkspaces, createWorkspace } = useWorkspaceActions(currentUser);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const storedUser = localStorage.getItem("currentUser");
      if (!storedUser) {
        setCurrentUser(null);
        setError("No user session found");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);
      if (!userData?.id) {
        setCurrentUser(null);
        setError("No valid user session found");
        setIsLoading(false);
        return;
      }

      setCurrentUser(userData);

      // Restore workspace from localStorage if available
      const storedWorkspaceId = localStorage.getItem("currentWorkspaceId");
      if (storedWorkspaceId) {
        setCurrentWorkspaceIdInternal(storedWorkspaceId);
      }

      // Note: fetchWorkspaces will be called in a separate useEffect when currentUser is set
    } catch (error) {
      console.error("Failed to initialize workspace", error);
      setCurrentUser(null);
      setError("Failed to initialize workspace");
      setIsLoading(false);
    }
  }, []);

  // Re-check local session on route changes so signup/login flows
  // update context state without requiring a full reload.
  useEffect(() => {
    void initialize();
  }, [initialize, pathname]);

  // Fetch workspaces when currentUser is set  
  useEffect(() => {
    if (currentUser && fetchWorkspaces) {
      const loadWorkspaces = async () => {
        try {
          await fetchWorkspaces(currentUser);
          setError(null);
        } catch (error) {
          console.error("Failed to fetch workspaces", error);
          setError("Failed to fetch workspaces");
        } finally {
          setIsLoading(false);
        }
      };
      loadWorkspaces();
    }
    // ESLint disable: fetchWorkspaces creates dependency loop if included
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Only depend on currentUser to avoid infinite loop

  // Auto-select workspace when available
  useEffect(() => {
    if (workspaces.length === 0) return;
    
    // If we have a current workspace ID, validate it exists in the workspace list
    if (currentWorkspaceId) {
      const workspaceExists = workspaces.find(w => w.id === currentWorkspaceId);
      if (!workspaceExists) {
        console.warn("Current workspace not found in workspace list, resetting...");
        // Current workspace doesn't exist anymore, clear it and fall through to auto-select
        setCurrentWorkspaceIdInternal(null);
        localStorage.removeItem("currentWorkspaceId");
      } else {
        // Workspace is valid, nothing to do
        return;
      }
    }
    
    // No current workspace or it's invalid, auto-select one
    // Check if there's a newly created workspace to navigate to
    const newWorkspaceId = sessionStorage.getItem("newWorkspaceId");

    if (newWorkspaceId) {
      // Clear the session storage
      sessionStorage.removeItem("newWorkspaceId");
      
      // Check if the new workspace exists in the list
      const newWorkspace = workspaces.find(w => w.id === newWorkspaceId);
      
      if (newWorkspace) {
        setCurrentWorkspaceId(newWorkspaceId);
        return;
      } else {
        console.warn("New workspace ID not found in workspaces list!");
      }
    }

    // Default to first workspace
    setCurrentWorkspaceId(workspaces[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, currentWorkspaceId]);

  // Simple ready state: not loading, no error, and have a workspace
  const isReady = !isLoading && !error && currentWorkspaceId && workspaces.length > 0;

  const isAdminWorkspace = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId)?.is_admin === true,
    [workspaces, currentWorkspaceId]
  );

  // Memoize loading object to prevent unnecessary re-renders
  const loading = useMemo(() => ({ isLoading, error }), [isLoading, error]);
  
  // Refresh function for manual data refresh
  const refreshData = useCallback(async () => {
    if (currentUser) {
      await fetchWorkspaces(currentUser);
    }
  }, [fetchWorkspaces, currentUser]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: DatabaseWorkspaceContextType = useMemo(() => ({
    workspaces,
    currentWorkspaceId,
    workspaceId: currentWorkspaceId, // Alias for currentWorkspaceId
    isAdminWorkspace,
    currentUser,
    currentUserId: currentUser?.id || null, // User ID for convenience
    loading,
    isReady,
    setCurrentWorkspaceId,
    setCurrentUser,
    refreshData,
    createWorkspace,
    initialize,
  }), [workspaces, currentWorkspaceId, isAdminWorkspace, currentUser, loading, isReady, setCurrentWorkspaceId, refreshData, createWorkspace, initialize]);

  return (
    <DatabaseWorkspaceContext.Provider value={value}>
      {children}
    </DatabaseWorkspaceContext.Provider>
  );
}

export function useDatabaseWorkspace() {
  const context = useContext(DatabaseWorkspaceContext);
  if (context === undefined) {
    throw new Error("useDatabaseWorkspace must be used within a DatabaseWorkspaceProvider");
  }
  return context;
} 
