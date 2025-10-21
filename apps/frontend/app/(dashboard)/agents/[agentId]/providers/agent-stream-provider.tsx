"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { subscribeAgentState, subscribeAgentResponses } from "@restackio/react";

interface AgentStreamContextType {
  responseState: unknown;
  agentResponses: unknown;
  loading: boolean;
  error: string | null;
}

const AgentStreamContext = createContext<AgentStreamContextType | undefined>(undefined);

interface AgentStreamProviderProps {
  agentTaskId: string;
  runId?: string;
  taskStatus?: string;
  initialState?: unknown;
  onResponseComplete?: () => void;
  children: React.ReactNode;
}

interface AgentStreamActiveProviderProps {
  agentTaskId: string;
  runId?: string;
  initialState?: unknown;
  onResponseComplete?: () => void;
  children: React.ReactNode;
}

// Mock provider for terminal states - no subscriptions
function AgentStreamMockProvider({ children }: { children: React.ReactNode }) {
  const value: AgentStreamContextType = useMemo(() => ({
    responseState: null,
    agentResponses: [],
    loading: false,
    error: null,
  }), []);

  return (
    <AgentStreamContext.Provider value={value}>
      {children}
    </AgentStreamContext.Provider>
  );
}

// Real provider with active subscriptions
// NOTE: This component should ONLY be mounted when we want active subscriptions
// The parent AgentStreamProvider handles the routing logic
function AgentStreamActiveProvider({ 
  agentTaskId, 
  runId,
  initialState,
  onResponseComplete,
  children 
}: AgentStreamActiveProviderProps) {
  // Initialize with persisted state from database if available
  const [currentResponseState, setCurrentResponseState] = useState<unknown>(initialState || null);
  const [error, setError] = useState<string | null>(null);
  const hasCompletedRef = useRef(false);

  const apiAddress = process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233";

  // Prepare subscription parameters (always subscribe in this component)
  const subscriptionParams = useMemo(() => ({
    apiAddress,
    agentId: agentTaskId, // Always use the provided agentTaskId
    runId: runId || "",
    stateName: "state_response" as const,
  }), [apiAddress, agentTaskId, runId]);

  const handleStateMessage = useCallback((data: unknown) => {
    // Always process state messages (todos, subtasks, metadata updates)
    // State updates should continue even after response completes
    setCurrentResponseState(data);
    
    // Check if this state contains a completed response
    const responseData = data as { events?: Array<{ type: string }> };
    const isCompleted = responseData?.events?.some((e) => e.type === 'response.completed');
    
    if (isCompleted && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Trigger callback to refresh metrics or perform other actions
      if (onResponseComplete) {
        onResponseComplete();
      }
    }
  }, [onResponseComplete]);

  const handleStateError = useCallback((error: Error) => {
    console.error("State subscription error:", error?.message || 'Unknown error');
    setError(error.message || "Failed to subscribe to response state");
  }, []);

  const stateOptions = useMemo(() => ({
    onMessage: handleStateMessage,
    onError: handleStateError,
  }), [handleStateMessage, handleStateError]);

  // State subscription (hooks must be called at top level)
  subscribeAgentState({
    ...subscriptionParams,
    options: stateOptions,
  });

  const handleResponseMessage = useCallback(() => {
    // Streaming data handled by Restack SDK
  }, []);

  const handleResponseError = useCallback((error: Error) => {
    console.error("Response subscription error:", error?.message || 'Unknown error');
  }, []);

  const responseOptions = useMemo(() => ({
    onMessage: handleResponseMessage,
    onError: handleResponseError,
  }), [handleResponseMessage, handleResponseError]);

  // Response subscription (hooks must be called at top level)
  const agentResponses = subscribeAgentResponses({
    apiAddress,
    agentId: agentTaskId,
    runId: runId || "",
    options: responseOptions,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup subscriptions
      hasCompletedRef.current = false;
    };
  }, []);

  // Create context value without memoization to allow agentResponses updates to flow through
  // The agentResponses array is managed by the subscription hook and needs to trigger re-renders
  const value: AgentStreamContextType = {
    responseState: currentResponseState,
    agentResponses,
    loading: false,
    error,
  };

  return (
    <AgentStreamContext.Provider value={value}>
      {children}
    </AgentStreamContext.Provider>
  );
}

// Smart provider that chooses between active and mock based on conditions
export function AgentStreamProvider({ 
  agentTaskId, 
  runId, 
  taskStatus,
  initialState,
  onResponseComplete,
  children 
}: AgentStreamProviderProps) {
  // Check conditions - use mock provider if ANY condition fails
  const isTerminalState = taskStatus === 'completed' || taskStatus === 'failed' || taskStatus === 'closed';
  const hasValidAgentId = agentTaskId && agentTaskId.trim() !== '';
  
  // Use mock provider (no subscriptions) if:
  // 1. No valid agentTaskId
  // 2. Task is in terminal state
  if (!hasValidAgentId || isTerminalState) {
    return <AgentStreamMockProvider>{children}</AgentStreamMockProvider>;
  }

  // Use active provider (real subscriptions)
  // NOTE: The active provider will handle its own subscription lifecycle
  return (
    <AgentStreamActiveProvider 
      agentTaskId={agentTaskId} 
      runId={runId}
      initialState={initialState}
      onResponseComplete={onResponseComplete}
      key={agentTaskId} // Key ensures we don't reuse provider when agentTaskId changes
    >
      {children}
    </AgentStreamActiveProvider>
  );
}

export function useAgentStream() {
  const context = useContext(AgentStreamContext);
  
  // Return default values if not in provider
  if (context === undefined) {
    return {
      responseState: null,
      agentResponses: [],
      loading: false,
      error: null,
    };
  }
  
  return context;
}

