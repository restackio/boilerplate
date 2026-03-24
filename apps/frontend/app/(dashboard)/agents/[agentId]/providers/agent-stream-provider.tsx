"use client";

import React, { createContext, useContext, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { subscribeAgentState, subscribeAgentResponses } from "@restackio/react";

function countResponseCompletedEvents(
  state: unknown,
): number {
  const events = (state as { events?: Array<{ type?: string }> } | null)?.events;
  if (!Array.isArray(events)) return 0;
  return events.filter((e) => e?.type === "response.completed").length;
}

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
  /** Debounced (~1.2s) callback on any agent state message—use to refresh DB-backed UI while a turn is still streaming. */
  onAgentStateUpdated?: () => void;
  children: React.ReactNode;
}

interface AgentStreamActiveProviderProps {
  agentTaskId: string;
  runId?: string;
  initialState?: unknown;
  onResponseComplete?: () => void;
  onAgentStateUpdated?: () => void;
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
const AGENT_STATE_REFETCH_DEBOUNCE_MS = 1200;

function AgentStreamActiveProvider({ 
  agentTaskId, 
  runId,
  initialState,
  onResponseComplete,
  onAgentStateUpdated,
  children 
}: AgentStreamActiveProviderProps) {
  // Initialize with persisted state from database if available
  const [currentResponseState, setCurrentResponseState] = useState<unknown>(initialState || null);
  const [error, setError] = useState<string | null>(null);
  /** Baseline + stream: only fire onResponseComplete when this count increases (each new assistant turn). */
  const lastCompletedCountRef = useRef(0);
  /** First subscription payload: without DB baseline, treat as sync (avoid N refreshes for history). */
  const isFirstStateMessageRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const n = countResponseCompletedEvents(initialState);
    lastCompletedCountRef.current = Math.max(lastCompletedCountRef.current, n);
  }, [initialState]);

  useLayoutEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const rawApiAddress = process.env.NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS || "http://localhost:9233";

  // Normalize API address to ensure it has a protocol (prevents relative URL issues)
  const apiAddress = useMemo(() => {
    if (!rawApiAddress) return "http://localhost:9233";
    
    // If it already has a protocol, use as-is
    if (rawApiAddress.startsWith("http://") || rawApiAddress.startsWith("https://")) {
      return rawApiAddress;
    }
    
    // Add https:// for production domains, http:// for localhost
    const isLocalhost = rawApiAddress.includes("localhost") || rawApiAddress.includes("127.0.0.1");
    return isLocalhost ? `http://${rawApiAddress}` : `https://${rawApiAddress}`;
  }, [rawApiAddress]);

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

    const completedCount = countResponseCompletedEvents(data);

    if (isFirstStateMessageRef.current) {
      isFirstStateMessageRef.current = false;
      const prevSync = lastCompletedCountRef.current;
      if (prevSync === 0 && completedCount > 0) {
        lastCompletedCountRef.current = completedCount;
        return;
      }
    }

    const prev = lastCompletedCountRef.current;
    if (completedCount > prev) {
      lastCompletedCountRef.current = completedCount;
      const delta = completedCount - prev;
      if (onResponseComplete) {
        for (let i = 0; i < delta; i++) {
          onResponseComplete();
        }
      }
    }

    if (onAgentStateUpdated) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        onAgentStateUpdated();
      }, AGENT_STATE_REFETCH_DEBOUNCE_MS);
    }
  }, [onResponseComplete, onAgentStateUpdated]);

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
  onAgentStateUpdated,
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
      onAgentStateUpdated={onAgentStateUpdated}
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

