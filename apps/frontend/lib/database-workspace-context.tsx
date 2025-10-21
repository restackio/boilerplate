"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useWorkspaceActions } from "../hooks/use-workspace-actions";
import { User } from "../types/user";
import { Workspace } from "../hooks/use-workspace-actions";

interface DatabaseWorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  workspaceId: string | null; // Alias for currentWorkspaceId for convenience
  currentUser: User | null;
  currentUserId: string | null; // User ID for convenience
  loading: { isLoading: boolean; error: string | null };
  isReady: boolean;
  setCurrentWorkspaceId: (id: string) => void;
  setCurrentUser: (user: User) => void;
  refreshData: () => void;
  initialize: () => Promise<void>;
}

const DatabaseWorkspaceContext = createContext<DatabaseWorkspaceContextType | undefined>(undefined);

export function DatabaseWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspaceId, setCurrentWorkspaceIdInternal] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wrap setCurrentWorkspaceId to add logging
  const setCurrentWorkspaceId = useCallback((id: string) => {
    setCurrentWorkspaceIdInternal(id);
  }, []);

  const { workspaces, fetchWorkspaces } = useWorkspaceActions(currentUser, currentWorkspaceId);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const initialize = () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const storedUser = localStorage.getItem("currentUser");
        if (!storedUser) {
          setError("No user session found");
          setIsLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);
        if (!userData?.id) {
          setError("No valid user session found");
          setIsLoading(false);
          return;
        }

        setCurrentUser(userData);
        // Note: fetchWorkspaces will be called in a separate useEffect when currentUser is set
      } catch (error) {
        console.error("Failed to initialize workspace", error);
        setError("Failed to initialize workspace");
        setIsLoading(false);
      }
    };

    initialize();
  }, []); // Empty dependency array - only run once on mount

  // Fetch workspaces when currentUser is set  
  useEffect(() => {
    if (currentUser && fetchWorkspaces) {
      const loadWorkspaces = async () => {
        try {
          await fetchWorkspaces(currentUser);
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
    if (workspaces.length > 0 && !currentWorkspaceId) {
      // Check if there's a newly created workspace to navigate to
      const newWorkspaceId = sessionStorage.getItem("newWorkspaceId");

      if (newWorkspaceId) {
        // Clear the session storage
        sessionStorage.removeItem("newWorkspaceId");
        console.log("Cleared newWorkspaceId from sessionStorage");
        
        // Check if the new workspace exists in the list
        const newWorkspace = workspaces.find(w => w.id === newWorkspaceId);
        console.log("Looking for workspace with ID:", newWorkspaceId, "Found:", !!newWorkspace);
        
        if (newWorkspace) {
          setCurrentWorkspaceId(newWorkspaceId);
          return;
        } else {
          console.warn("New workspace ID not found in workspaces list!");
        }
      }

      setCurrentWorkspaceId(workspaces[0].id);
    }
    // setCurrentWorkspaceId is stable (useCallback with empty deps), so it's safe to exclude
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, currentWorkspaceId]);

  // Simple ready state: not loading, no error, and have a workspace
  const isReady = !isLoading && !error && currentWorkspaceId && workspaces.length > 0;
  
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
    currentUser,
    currentUserId: currentUser?.id || null, // User ID for convenience
    loading,
    isReady,
    setCurrentWorkspaceId,
    setCurrentUser,
    refreshData,
    initialize: async () => {}, // Simplified - no longer needed
  }), [workspaces, currentWorkspaceId, currentUser, loading, isReady, setCurrentWorkspaceId, refreshData]);

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