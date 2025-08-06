"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useWorkspaceActions } from "../hooks/use-workspace-actions";
import { User } from "../hooks/use-user-actions";
import { Workspace } from "../hooks/use-workspace-actions";

interface DatabaseWorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  workspaceId: string | null; // Alias for currentWorkspaceId for convenience
  currentUser: User | null;
  loading: { isLoading: boolean; error: string | null };
  isReady: boolean;
  setCurrentWorkspaceId: (id: string) => void;
  setCurrentUser: (user: User) => void;
  refreshData: () => void;
  initialize: () => Promise<void>;
}

const DatabaseWorkspaceContext = createContext<DatabaseWorkspaceContextType | undefined>(undefined);

export function DatabaseWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { workspaces, fetchWorkspaces } = useWorkspaceActions(currentUser, currentWorkspaceId);

  // Simple initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const storedUser = localStorage.getItem("currentUser");
        if (!storedUser) {
          setError("No user session found");
          return;
        }

        const userData = JSON.parse(storedUser);
        if (!userData?.id) {
          setError("No valid user session found");
          return;
        }

        setCurrentUser(userData);
        await fetchWorkspaces(userData);
      } catch (error) {
        console.error("Failed to initialize workspace", error);
        setError("Failed to initialize workspace");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []); // Empty dependency array - only run once

  // Auto-select first workspace when available
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId]);

  // Simple ready state: not loading, no error, and have a workspace
  const isReady = !isLoading && !error && currentWorkspaceId && workspaces.length > 0;
  
  // Refresh function for manual data refresh
  const refreshData = useCallback(async () => {
    if (currentUser) {
      await fetchWorkspaces(currentUser);
    }
  }, [fetchWorkspaces, currentUser]);

  const value: DatabaseWorkspaceContextType = {
    workspaces,
    currentWorkspaceId,
    workspaceId: currentWorkspaceId, // Alias for currentWorkspaceId
    currentUser,
    loading: { isLoading, error },
    isReady,
    setCurrentWorkspaceId,
    setCurrentUser,
    refreshData,
    initialize: async () => {}, // Simplified - no longer needed
  };

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