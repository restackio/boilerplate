"use client";

/**
 * Agent State Hook
 * 
 * Manages two subscriptions for real-time agent interaction:
 * 1. State subscription - Persistent conversation state from backend
 * 2. Streaming subscription - Live character-by-character updates
 * 
 * Note: Subscription errors are expected for completed/failed tasks since
 * Temporal workflows no longer exist. These are gracefully handled.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { subscribeAgentState, subscribeAgentResponses } from "@restackio/react";
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
  taskStatus?: string; // Task status to determine if errors are expected
  onStateChange?: (state: AgentState) => void;
}

interface UseAgentStateReturn {
  responseState: unknown; // Unified persistent state (contains both messages and response items)
  agentResponses: unknown; // Live streaming responses
  loading: boolean;
  error: string | null;
  sendMessageToAgent: (message: string) => Promise<void>;
  startAgent: (taskDescription: string) => Promise<unknown>;
  stopAgent: () => Promise<void>;
}

export function useAgentState({ taskId, agentTaskId, runId, taskStatus }: UseAgentStateProps): UseAgentStateReturn {
  const [error, setError] = useState<string | null>(null);
  const [currentResponseState, setCurrentResponseState] = useState<unknown>(null);
  
  // Check if task is in a terminal state where subscription errors are expected
  const isTerminalState = useMemo(() => {
    return taskStatus === 'completed' || taskStatus === 'failed' || taskStatus === 'cancelled';
  }, [taskStatus]);

  // Suppress console errors from Restack SDK for terminal states
  useEffect(() => {
    if (!isTerminalState) return;

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      // Filter out expected Restack subscription errors for terminal states
      const message = String(args[0] || '');
      if (
        message.includes('Stream events encountered an error') ||
        message.includes('State subscription error') ||
        message.includes('Agent state subscription')
      ) {
        return; // Silently ignore
      }
      // Pass through other errors
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [isTerminalState]);
  
  const subscriptionParams = useMemo(() => ({
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    // Pass empty agentId for terminal states to prevent subscription attempts
    agentId: isTerminalState ? "" : (agentTaskId || ""),
    runId: isTerminalState ? "" : (runId || ""),
    stateName: "state_response" as const,
  }), [agentTaskId, runId, isTerminalState]);

  const handleStateMessage = useCallback((data: unknown) => {
    setCurrentResponseState(data);
  }, []);

  const handleStateError = useCallback((error: Error) => {
    // Subscription errors are expected for completed/failed tasks
    // since Temporal workflows no longer exist. Silently ignore these.
    if (isTerminalState) {
      return;
    }
    
    // Only log and set error for active tasks
    console.error("State subscription error:", error?.message || 'Unknown error');
    setError(error.message || "Failed to subscribe to response state");
  }, [isTerminalState]);

  const stateOptions = useMemo(() => ({
    onMessage: handleStateMessage,
    onError: handleStateError,
  }), [handleStateMessage, handleStateError]);
  
  // Subscribe to state (will be disabled via empty agentId for terminal states)
  subscribeAgentState({
    ...subscriptionParams,
    options: stateOptions,
  });

  const handleResponseMessage = useCallback((data: unknown) => {
    // Streaming data handled by Restack SDK
  }, []);

  const handleResponseError = useCallback((error: Error) => {
    // Streaming errors are expected for completed/failed tasks
    // since Temporal workflows no longer exist. Silently ignore these.
    void error; // Explicitly void to avoid unused variable warning
  }, []);

  const responseOptions = useMemo(() => ({
    onMessage: handleResponseMessage,
    onError: handleResponseError,
  }), [handleResponseMessage, handleResponseError]);

  // Subscribe to streaming responses (will be disabled via empty agentId for terminal states)
  const agentResponses = subscribeAgentResponses({
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    // Pass empty agentId for terminal states to prevent subscription attempts
    agentId: isTerminalState ? "" : (agentTaskId || ""),
    runId: isTerminalState ? "" : (runId || ""),
    options: responseOptions,
  });

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
    responseState: currentResponseState,
    agentResponses,
    loading: false,
    error,
    sendMessageToAgent,
    startAgent: startAgentExecution,
    stopAgent: stopAgentExecution,
  };
} 