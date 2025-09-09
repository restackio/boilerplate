"use client";

import { useState, useCallback, useMemo } from "react";
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
  responseState: any; // Unified persistent state (contains both messages and response items)
  agentResponses: any; // Live streaming responses
  loading: boolean;
  error: string | null;
  sendMessageToAgent: (message: string) => Promise<void>;
  startAgent: (taskDescription: string) => Promise<any>;
  stopAgent: () => Promise<void>;
}

export function useAgentState({ taskId, agentTaskId, runId, onStateChange }: UseAgentStateProps): UseAgentStateReturn {
  const [error, setError] = useState<string | null>(null);
  const [currentResponseState, setCurrentResponseState] = useState<any>(null);
  


  // Subscribe to response state for persistent response items with state replacement
  // Only subscribe if we have agentTaskId (runId is optional)
  const subscriptionParams = {
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    agentId: agentTaskId || `task_agent_${taskId}`,
    runId: runId || "",
    stateName: "state_response",
  };
  
  
  subscribeAgentState({
    ...subscriptionParams,
    options: {
      onMessage: (data: any) => {
        // Only process messages if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        try {
          // Always replace the state with the latest data, don't accumulate
          if (Array.isArray(data)) {
            setCurrentResponseState(data);
          } else {
            setCurrentResponseState(data);
          }
        } catch (err) {
          console.error("Error processing agent state message:", err);
          setError("Failed to process agent state update");
        }
      },
      onError: (error: any) => {
        // Only process errors if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        console.error("subscribeResponseState error:", error);
        setError(error.message || "Failed to subscribe to response state");
      },
    },
  });

  // Subscribe to agent responses using the official Restack React hook
  // Use a valid agent ID that should exist in the system
  const agentResponses = subscribeAgentResponses({
    apiAddress: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233",
    apiToken: process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_KEY,
    agentId: agentTaskId || `task_agent_${taskId}`,
    runId: runId || "",
    options: {
      onMessage: (data: any) => {
        // Only process messages if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        try {
          // Process agent responses safely
          // The data is already processed by the Restack hook
        } catch (err) {
          console.error("Error processing agent responses message:", err);
          setError("Failed to process agent responses update");
        }
      },
      onError: (error: any) => {
        // Only process errors if we have a valid agentTaskId
        if (!agentTaskId) return;
        
        console.error("subscribeAgentResponses error:", error);
        setError(error.message || "Failed to subscribe to agent responses");
      },
    },
  });

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
  }, [agentTaskId]);

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

  // Use the manually managed state that replaces rather than accumulates
  const cleanResponseState = useMemo(() => {
    if (!agentTaskId || !currentResponseState) {
      return null;
    }
    
    return currentResponseState;
  }, [currentResponseState, agentTaskId]);

  return {
    responseState: cleanResponseState, // Return cleaned unified response state
    agentResponses: agentTaskId ? agentResponses : null, // Return agentResponses separately
    loading: false, // The subscription handles loading state internally
    error,
    sendMessageToAgent,
    startAgent: startAgentExecution,
    stopAgent: stopAgentExecution,
  };
} 