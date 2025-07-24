"use client";

import { useState, useCallback } from "react";
import { subscribeAgentState } from "@restackio/react";
import { startAgent, sendAgentMessage, stopAgent } from "@/app/actions/agent";

interface AgentState {
  taskId: string;
  agentTaskId: string;
  status: "running" | "completed" | "failed" | "waiting";
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
  }>;
  progress?: number;
  error?: string;
}

interface UseAgentStateProps {
  taskId: string;
  agentTaskId?: string;
  runId?: string;
  onStateChange?: (state: AgentState) => void;
}

interface UseAgentStateReturn {
  state: any; // The subscription hook returns a complex type
  loading: boolean;
  error: string | null;
  sendMessageToAgent: (message: string) => Promise<void>;
  startAgent: (taskDescription: string) => Promise<any>;
  stopAgent: () => Promise<void>;
}

export function useAgentState({ taskId, agentTaskId, runId, onStateChange }: UseAgentStateProps): UseAgentStateReturn {
  const [error, setError] = useState<string | null>(null);

  // Subscribe to agent state using the official Restack React hook
  const agentState = subscribeAgentState({
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    agentId: agentTaskId || "",
    runId: runId || "",
    stateName: "state_messages",
    options: {
      onMessage: (data: any) => {
        const newState: AgentState = {
          taskId,
          agentTaskId: agentTaskId || "",
          status: data.status || "waiting",
          messages: data.messages || [],
          progress: data.progress,
          error: data.error,
        };
        onStateChange?.(newState);
      },
      onError: (error: any) => {
        setError(error.message || "Failed to subscribe to agent state");
      },
    },
  });

  // Send message to agent using server action
  const sendMessageToAgent = useCallback(async (message: string) => {
    if (!agentTaskId || !runId) {
      throw new Error("No agent task ID or run ID available");
    }

    try {
      const result = await sendAgentMessage({
        agentId: agentTaskId,
        runId: runId,
        message: message,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send message to agent");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to send message to agent");
    }
  }, [agentTaskId, runId]);

  // Start agent execution using server action
  const startAgentExecution = useCallback(async (taskDescription: string) => {
    if (!agentTaskId) {
      throw new Error("No agent task ID available");
    }

    try {
      const result = await startAgent({
        agentId: agentTaskId,
        taskDescription: taskDescription,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to start agent");
      }

      return result;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to start agent");
    }
  }, [agentTaskId]);

  // Stop agent execution using server action
  const stopAgentExecution = useCallback(async () => {
    if (!agentTaskId || !runId) {
      throw new Error("No agent task ID or run ID available");
    }

    try {
      const result = await stopAgent({
        agentId: agentTaskId,
        runId: runId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to stop agent");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to stop agent");
    }
  }, [agentTaskId, runId]);

  return {
    state: agentState,
    loading: false, // The subscription handles loading state internally
    error,
    sendMessageToAgent,
    startAgent: startAgentExecution,
    stopAgent: stopAgentExecution,
  };
} 