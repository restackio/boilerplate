"use server";

import { runWorkflow, getWorkflowResult } from "./workflow";

export interface AgentVersion {
  id: string;
  name: string;
  description: string;
  parent_agent_id: string | null;
  created_at: string;
  status: "published" | "draft" | "archived";
}

export interface AgentPublishEvent {
  agentId: string;
  agentName: string;
  version: string;
  publishedAt: string;
  description?: string;
}

/**
 * Get agent version publish history for timeline annotations
 */
export async function getAgentPublishHistory(params: {
  workspaceId: string;
  agentId?: string | null;
  dateRange?: "1d" | "7d" | "30d" | "90d";
}): Promise<AgentPublishEvent[]> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "AgentsReadAllWorkflow",
      input: {
        workspace_id: params.workspaceId,
        published_only: true,
      },
    });

    const result = await getWorkflowResult({ workflowId, runId });

    if (!result || typeof result !== 'object' || !('agents' in result)) {
      return [];
    }

    const agents = result.agents as AgentVersion[];
    
    // Calculate date threshold
    const now = new Date();
    let daysAgo = 7; // default
    if (params.dateRange === "1d") daysAgo = 1;
    else if (params.dateRange === "30d") daysAgo = 30;
    else if (params.dateRange === "90d") daysAgo = 90;
    
    const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Filter agents published within date range
    const publishEvents = agents
      .filter((agent) => {
        // Only include agents with parent_agent_id (versions, not root agents)
        if (!agent.parent_agent_id) return false;
        
        // Filter by agentId if provided (match parent or self)
        if (params.agentId && agent.id !== params.agentId && agent.parent_agent_id !== params.agentId) {
          return false;
        }
        
        // Filter by date range
        const createdAt = new Date(agent.created_at);
        return createdAt >= threshold;
      })
      .map((agent) => ({
        agentId: agent.id,
        agentName: agent.name,
        version: `v${agent.id.substring(0, 8)}`,
        publishedAt: agent.created_at,
        description: agent.description,
      }))
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

    return publishEvents;
  } catch (error) {
    console.error("Error fetching agent publish history:", error);
    return [];
  }
}

