"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { WorkspaceKey, WorkspaceData, workspaces } from "./demo-data";

interface WorkspaceContextType {
  currentWorkspaceKey: WorkspaceKey;
  currentWorkspace: WorkspaceData;
  switchWorkspace: (key: WorkspaceKey) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Initialize workspace from localStorage or default to demo-company
  const [currentWorkspaceKey, setCurrentWorkspaceKey] = useState<WorkspaceKey>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("currentWorkspace");
        if (saved && saved in workspaces) {
          return saved as WorkspaceKey;
        }
      }
      return "demo-company";
    }
  );

  const switchWorkspace = (key: WorkspaceKey) => {
    setCurrentWorkspaceKey(key);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("currentWorkspace", key);
    }
  };

  const currentWorkspace = workspaces[currentWorkspaceKey];

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspaceKey,
        currentWorkspace,
        switchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
