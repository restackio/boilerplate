"use server";

import { executeWorkflow } from "./workflow";

/**
 * Subagent information from the database
 */
export interface SubagentInfo {
  id: string;
  name: string;
  description: string | null;
  type: "interactive" | "pipeline";
  status: string;
  model: string;
  team_id: string | null;
}

/**
 * Available agent information with configuration status
 */
export interface AvailableAgentInfo extends SubagentInfo {
  is_configured: boolean;
}

/**
 * Get all subagents configured for a parent agent
 */
export async function getAgentSubagents(
  parentAgentId: string
): Promise<SubagentInfo[]> {
  try {
    const result = await executeWorkflow("AgentSubagentsReadWorkflow", {
      parent_agent_id: parentAgentId,
    });

    if (result.success && result.data) {
      return result.data.subagents || [];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching agent subagents:", error);
    return [];
  }
}

/**
 * Get all available agents that can be used as subagents
 */
export async function getAvailableAgents(
  workspaceId: string,
  parentAgentId?: string
): Promise<AvailableAgentInfo[]> {
  try {
    const result = await executeWorkflow("AgentSubagentsGetAvailableWorkflow", {
      workspace_id: workspaceId,
      parent_agent_id: parentAgentId || null,
    });

    if (result.success && result.data) {
      return result.data.agents || [];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching available agents:", error);
    return [];
  }
}

/**
 * Add a subagent to a parent agent
 */
export async function addAgentSubagent(
  parentAgentId: string,
  subagentId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await executeWorkflow("AgentSubagentsCreateWorkflow", {
      parent_agent_id: parentAgentId,
      subagent_id: subagentId,
    });

    return { success: result.success };
  } catch (error) {
    console.error("Error adding agent subagent:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add subagent",
    };
  }
}

/**
 * Remove a subagent from a parent agent
 */
export async function removeAgentSubagent(
  parentAgentId: string,
  subagentId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await executeWorkflow("AgentSubagentsDeleteWorkflow", {
      parent_agent_id: parentAgentId,
      subagent_id: subagentId,
    });

    if (result.success && result.data) {
      return { success: result.data.success };
    }
    
    return { success: false };
  } catch (error) {
    console.error("Error removing agent subagent:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove subagent",
    };
  }
}

/**
 * Toggle enabled status of a subagent relationship
 */
export async function toggleAgentSubagent(
  parentAgentId: string,
  subagentId: string,
  enabled: boolean
): Promise<{ success: boolean; enabled: boolean; message?: string }> {
  try {
    const result = await executeWorkflow("AgentSubagentsToggleWorkflow", {
      parent_agent_id: parentAgentId,
      subagent_id: subagentId,
      enabled,
    });

    if (result.success && result.data) {
      return { success: result.data.success, enabled: result.data.enabled };
    }
    
    return { success: false, enabled: !enabled };
  } catch (error) {
    console.error("Error toggling agent subagent:", error);
    return {
      success: false,
      enabled: !enabled,
      message:
        error instanceof Error ? error.message : "Failed to toggle subagent",
    };
  }
}

