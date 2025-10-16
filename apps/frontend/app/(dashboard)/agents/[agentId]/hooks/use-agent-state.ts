"use client";

/**
 * Agent State Hook
 * 
 * Provides access to agent streaming data from the AgentStreamProvider.
 * This hook must be used within an AgentStreamProvider context.
 * 
 * The provider manages subscriptions to ensure:
 * - Single EventSource connection per agent
 * - Proper cleanup when response completes
 * - No reconnection loops after completion
 */

import { useCallback } from "react";
import { startAgent, sendAgentMessage, stopAgent } from "@/app/actions/agent";
import { useAgentStream } from "../providers/agent-stream-provider";

interface UseAgentStateProps {
  taskId: string;
  agentTaskId?: string;
  runId?: string;
  taskStatus?: string;
}

interface UseAgentStateReturn {
  responseState: unknown;
  agentResponses: unknown;
  loading: boolean;
  error: string | null;
  sendMessageToAgent: (message: string) => Promise<void>;
  startAgent: (taskDescription: string) => Promise<unknown>;
  stopAgent: () => Promise<void>;
}

export function useAgentState({ agentTaskId }: UseAgentStateProps): UseAgentStateReturn {
  // Get streaming data from provider
  const { responseState, agentResponses, loading, error } = useAgentStream();

  const sendMessageToAgent = useCallback(async (message: string) => {
    if (!agentTaskId) throw new Error("No agent task ID available");

    const result = await sendAgentMessage({ agentId: agentTaskId, message });
    if (!result.success) throw new Error(result.error || "Failed to send message");
  }, [agentTaskId]);

  const startAgentExecution = useCallback(async (taskDescription: string) => {
    if (!agentTaskId) throw new Error("No agent task ID available");

    const result = await startAgent({ agentId: agentTaskId, taskDescription });
    if (!result.success) throw new Error(result.error || "Failed to start agent");
    return result;
  }, [agentTaskId]);

  const stopAgentExecution = useCallback(async () => {
    if (!agentTaskId) throw new Error("No agent task ID available");

    const result = await stopAgent({ agentId: agentTaskId });
    if (!result.success) throw new Error(result.error || "Failed to stop agent");
  }, [agentTaskId]);

  return {
    responseState,
    agentResponses,
    loading,
    error,
    sendMessageToAgent,
    startAgent: startAgentExecution,
    stopAgent: stopAgentExecution,
  };
} 