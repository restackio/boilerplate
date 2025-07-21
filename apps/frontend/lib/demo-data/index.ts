export type { WorkspaceData } from "./types";
export { demoCompanyData } from "./demo-company";
export { emptyWorkspaceData } from "./empty-workspace";

import { demoCompanyData } from "./demo-company";

import { emptyWorkspaceData } from "./empty-workspace";
import { WorkspaceData } from "./types";

export const workspaces = {
  "demo-company": demoCompanyData,
  empty: emptyWorkspaceData,
} as const;

export type WorkspaceKey = keyof typeof workspaces;

// Helper function to get current workspace data
// In a real app, this would be based on URL params, user selection, etc.
export function getCurrentWorkspaceData(
  workspaceKey: WorkspaceKey = "demo-company"
): WorkspaceData {
  return workspaces[workspaceKey];
}

// Get all available workspaces for the workspace switcher
export function getAllWorkspaces() {
  return Object.entries(workspaces).map(([key, data]) => ({
    key: key as WorkspaceKey,
    name: data.workspace.name,
    logo: data.workspace.logo,
    plan: data.workspace.plan,
  }));
}
