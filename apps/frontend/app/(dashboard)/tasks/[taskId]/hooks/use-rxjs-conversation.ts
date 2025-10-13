import { useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { ConversationItem, OpenAIEvent } from '../types';
import { ConversationStore, StreamEvent } from '../stores/conversation-store';

interface UseRxjsConversationProps {
  responseState?: { events: OpenAIEvent[]; [key: string]: unknown } | false;
  agentResponses?: { events?: OpenAIEvent[]; [key: string]: unknown }[];
  taskAgentTaskId?: string | null;
  persistedState?: {
    events?: OpenAIEvent[];
    todos?: unknown[];
    subtasks?: unknown[];
    messages?: unknown[];
    metadata?: {
      temporal_agent_id?: string;
      temporal_run_id?: string;
      response_count?: number;
      message_count?: number;
      [key: string]: unknown;
    };
  };
  storeKey?: string; // Unique key to create separate store instances
}

/**
 * Simple React hook for RxJS-based conversation management
 */
export function useRxjsConversation({
  responseState,
  agentResponses = [],
  taskAgentTaskId,
  persistedState,
  storeKey = 'default' // Note: currently unused but kept for future store differentiation
}: UseRxjsConversationProps) {
  void storeKey; // Suppress unused parameter warning
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  // Create a unique conversation store instance for this component
  // Use useState to ensure the store persists across re-renders
  const [conversationStore] = useState(() => new ConversationStore());

  // Subscribe to the RxJS store
  useEffect(() => {
    const subscription: Subscription = conversationStore.state$.subscribe(
      (state) => {
        setConversation(state.mergedConversation);
      }
    );
    return () => subscription.unsubscribe();
  }, [conversationStore]);

  // Update state items from responseState
  useEffect(() => {
    
    // Case 1: Task completed - use database snapshot (agent_state.events)
    // Load from persisted state when there's no active real-time state
    if (persistedState?.events?.length && !responseState) {
      const items: ConversationItem[] = persistedState.events
        .filter(event => event.id && event.type)
        .map(event => ({
          id: event.id as string,
          type: event.type,
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: event.item || null,
          openai_event: event,
          isStreaming: false, // Historical data never streams
        }));
      
      conversationStore.updateStateItems(items);
      console.log(`💾 Loaded ${items.length} events from database (task completed)`);
      return;
    }

    // Case 2: No active agent or state available
    if (!responseState || !responseState?.events || !taskAgentTaskId) {
      conversationStore.updateStateItems([]);
      return;
    }

    // Collect user messages, AI responses, and loading indicators separately, then interleave
    const userMessages: ConversationItem[] = [];
    const aiResponses: ConversationItem[] = [];
    const loadingIndicators: ConversationItem[] = [];
    
    // Step 0: Collect error events first
    responseState.events.forEach((event: OpenAIEvent) => {
      if (event.type === 'error' && (event as any).error) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const errorEvent = event as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        aiResponses.push({
          id: errorEvent.error.id,
          type: 'error',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: null,
          openai_event: event,
          error: {
            id: errorEvent.error.id as string,
            type: (errorEvent.error.type as string) || 'error',
            error_type: (errorEvent.error.error_type as string) || 'unknown',
            error_message: (errorEvent.error.message as string) || 'An error occurred',
            error_source: (errorEvent.error.error_source as "openai" | "mcp" | "backend" | "network") || 'backend',
            error_details: errorEvent.error
          },
          isStreaming: false,
        });
      }
    });

    // Step 1: Collect user messages and approval requests in chronological order
    responseState.events.forEach((event: OpenAIEvent) => {
      if (event.type === 'response.output_item.done' && event.item) {
        if (event.item.type === 'message' && event.item.role === 'user') {
          // User messages
          userMessages.push({
            id: event.item.id,
            type: event.item.type,
            timestamp: event.timestamp || new Date().toISOString(),
            openai_output: event.item,
            openai_event: event,
            isStreaming: false,
          });
        } else if (event.item.type === 'mcp_approval_request') {
          // MCP approval requests - only show if not fulfilled
          const approvalId = event.item.id;
          
          // Check if this approval has been fulfilled by looking for MCP calls
          const isFulfilled = responseState.events.some((e: OpenAIEvent) => 
            e.type === 'response.output_item.done' && 
            e.item?.type === 'mcp_call' && 
            (e.item as { approval_request_id?: string }).approval_request_id === approvalId
          );
          
          if (!isFulfilled) {
            aiResponses.push({
              id: event.item.id,
              type: event.item.type,
              timestamp: event.timestamp || new Date().toISOString(),
              openai_output: event.item,
              openai_event: event,
              isStreaming: false,
            });
          }
        }
      }
    });
    
    // Step 2: Collect response.created events for loading indicators
    responseState.events
      .filter((event: OpenAIEvent) => event.type === 'response.created')
      .forEach((event: OpenAIEvent) => {
        loadingIndicators.push({
          id: `${event.response?.id}_created`,
          type: 'response_status',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: null,
          openai_event: event,
          isStreaming: true,
        });
      });
    
    // Step 3: Collect AI responses from completed responses (in chronological order)
    responseState.events
      .filter((event: OpenAIEvent) => event.type === 'response.completed')
      .forEach((event: OpenAIEvent) => {
        (event.response?.output || []).forEach((outputItem: unknown) => {
          const item = outputItem as { id: string; type: string; [key: string]: unknown };
          aiResponses.push({
            id: item.id,
            type: item.type,
            timestamp: event.timestamp || new Date().toISOString(),
            openai_output: item,
            openai_event: event,
            isStreaming: false,
          });
        });
      });

    // Step 4: Collect completed MCP calls (these replace approval requests)
    responseState.events.forEach((event: OpenAIEvent) => {
      if (event.type === 'response.output_item.done' && event.item?.type === 'mcp_call') {
        aiResponses.push({
          id: event.item.id,
          type: event.item.type,
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: event.item,
          openai_event: event,
          isStreaming: false,
        });
      }
    });

    // Step 5: Collect failed MCP calls (these come as response.mcp_call.failed events)
    responseState.events.forEach((event: OpenAIEvent) => {
      if (event.type === 'response.mcp_call.failed') {
        aiResponses.push({
          id: event.item_id || `failed_${event.sequence_number}`,
          type: 'mcp_call',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: {
            id: event.item_id || `failed_${event.sequence_number}`,
            type: 'mcp_call',
            status: 'failed',
            error: event.error || { message: 'MCP call failed', type: 'mcp_error' }
          },
          openai_event: event,
          isStreaming: false,
        });
      }
    });
    
    // Step 6: Interleave user messages with loading indicators and AI responses
    const items: ConversationItem[] = [];
    
    // Group AI responses by response ID (each response has reasoning + message)
    const responseGroups = new Map<string, ConversationItem[]>();
    aiResponses.forEach(item => {
      const responseId = item.openai_event?.response?.id;
      if (responseId) {
        if (!responseGroups.has(responseId)) {
          responseGroups.set(responseId, []);
        }
        responseGroups.get(responseId)!.push(item);
      }
    });
    
    // Group loading indicators by response ID
    const loadingGroups = new Map<string, ConversationItem>();
    loadingIndicators.forEach(item => {
      const responseId = item.openai_event?.response?.id;
      if (responseId) {
        loadingGroups.set(responseId, item);
      }
    });
    
    // Interleave: user message → loading indicator → AI response group (or just loading if incomplete)
    for (let i = 0; i < userMessages.length; i++) {
      // Add user message
      items.push(userMessages[i]);
      
      // Try to find corresponding loading indicator and AI response
      if (i < loadingIndicators.length) {
        const loadingIndicator = loadingIndicators[i];
        const responseId = loadingIndicator.openai_event?.response?.id;
        
        // Check if we have completed response for this loading indicator
        if (responseId && responseGroups.has(responseId)) {
          // Response completed - show the actual AI response group
          items.push(...responseGroups.get(responseId)!);
        } else {
          // Response not completed yet - show loading indicator
          items.push(loadingIndicator);
        }
      }
    }
    
    conversationStore.updateStateItems(items);
  }, [responseState, taskAgentTaskId, persistedState, conversationStore]);

  // Update stream events from agentResponses
  useEffect(() => {
    if (!agentResponses?.length) {
      conversationStore.updateStreamEvents([]);
      return;
    }

    // Convert to simple StreamEvent format
    // @ts-expect-error - agentResponses has unknown properties but we're mapping to expected StreamEvent format
    const streamEvents: StreamEvent[] = agentResponses
      .map(response => ({
        type: response.type,
        sequence_number: response.sequence_number || 0,
        item_id: response.item_id,
        delta: response.delta,
        text: response.text,
        item: response.item,
        error: response.error,
      }));

    conversationStore.updateStreamEvents(streamEvents);
  }, [agentResponses, conversationStore]);

  // Clear streaming state when task changes
  useEffect(() => {
    if (taskAgentTaskId) {
      conversationStore.clearStreamingState();
    }
  }, [taskAgentTaskId, conversationStore]);

  const updateConversationItemStatus = (itemId: string, status: string) => {
    const updatedItems = conversation.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            openai_output: item.openai_output 
              ? { ...item.openai_output, status }
              : { id: itemId, type: item.type, status }
          }
        : item
    );
    conversationStore.updateStateItems(updatedItems.filter(item => !item.isStreaming));
  };

  return {
    conversation,
    updateConversationItemStatus,
  };
}