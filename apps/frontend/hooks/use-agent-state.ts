"use client";

import { useState, useCallback } from "react";
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
  onStateChange?: (state: AgentState) => void;
}

interface UseAgentStateReturn {
  state: any; // The subscription hook returns a complex type
  agentResponses: any; // Add agentResponses to the return type
  loading: boolean;
  error: string | null;
  sendMessageToAgent: (message: string) => Promise<void>;
  startAgent: (taskDescription: string) => Promise<any>;
  stopAgent: () => Promise<void>;
}

export function useAgentState({ taskId, agentTaskId, runId, onStateChange }: UseAgentStateProps): UseAgentStateReturn {
  const [error, setError] = useState<string | null>(null);

  // Subscribe to agent state using the official Restack React hook
  // Use a valid agent ID that should exist in the system
  const agentState = subscribeAgentState({
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    agentId: agentTaskId || `task_agent_${taskId}`, // Use task-based agent ID format from backend
    runId: runId || "",
    stateName: "state_messages",
    options: {
      onMessage: (data: any) => {
        // Only process messages if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        console.log("subscribeAgentState onMessage received:", data);
        console.log("Raw message data type:", typeof data);
        console.log("Raw message data:", data);
        console.log("Data keys:", Object.keys(data));
        console.log("Data.messages:", data.messages);
        
        const newState: AgentState = {
          taskId,
          agentTaskId: agentTaskId,
          status: data.status || "waiting",
          messages: data.messages || [],
          progress: data.progress,
          error: data.error,
        };
        console.log("Created new state:", newState);
        onStateChange?.(newState);
      },
      onError: (error: any) => {
        // Only process errors if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        console.error("subscribeAgentState error:", error);
        setError(error.message || "Failed to subscribe to agent state");
      },
    },
  });

  // Subscribe to agent responses using the official Restack React hook
  // Use a valid agent ID that should exist in the system
  const agentResponses = subscribeAgentResponses({
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    agentId: agentTaskId || `task_agent_${taskId}`, // Use task-based agent ID format from backend
    options: {
      onMessage: (data: any) => {
        // Only process messages if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        console.log("subscribeAgentResponses onMessage received:", data);
        console.log("Raw response data type:", typeof data);
        console.log("Raw response data:", data);
        console.log("Response data keys:", Object.keys(data));
        console.log("Response data structure:", JSON.stringify(data, null, 2));
      },
      onError: (error: any) => {
        // Only process errors if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        console.error("subscribeAgentResponses error:", error);
        setError(error.message || "Failed to subscribe to agent responses");
      },
    },
  });

  console.log("subscribeAgentState hook result:", agentState);
  console.log("subscribeAgentResponses hook result:", agentResponses);
  console.log("agentTaskId:", agentTaskId, "runId:", runId);

  // Send message to agent using server action
  const sendMessageToAgent = useCallback(async (message: string) => {
    if (!agentTaskId) {
      throw new Error("No agent task ID available");
    }

    try {
      const result = await sendAgentMessage({
        agentId: agentTaskId,
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
    if (!agentTaskId) {
      throw new Error("No agent task ID available");
    }

    try {
      const result = await stopAgent({
        agentId: agentTaskId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to stop agent");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to stop agent");
    }
  }, [agentTaskId, runId]);

  return {
    state: agentTaskId ? agentState : null,
    agentResponses: agentTaskId ? agentResponses : null, // Return agentResponses separately
    loading: false, // The subscription handles loading state internally
    error,
    sendMessageToAgent,
    startAgent: startAgentExecution,
    stopAgent: stopAgentExecution,
  };
} 