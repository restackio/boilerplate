import { useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { ConversationItem, OpenAIEvent } from '../types';
import { ConversationStore, StateEvent } from '../stores/conversation-store';

interface UseRxjsConversationProps {
  responseState?: { events: OpenAIEvent[]; [key: string]: unknown } | false;
  agentResponses?: { events?: OpenAIEvent[]; [key: string]: unknown }[];
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
  storeKey?: string;
}

export function useRxjsConversation({
  responseState,
  agentResponses = [],
  persistedState,
  storeKey = 'default'
}: UseRxjsConversationProps) {
  void storeKey;
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [conversationStore] = useState(() => new ConversationStore());

  useEffect(() => {
    const subscription: Subscription = conversationStore.state$.subscribe(
      (state) => {
        setConversation(state.mergedConversation);
      }
    );
    return () => subscription.unsubscribe();
  }, [conversationStore]);

  useEffect(() => {
    // Use persisted state if we have it and responseState is empty/missing
    const hasResponseEvents = responseState && Array.isArray(responseState?.events) && responseState.events.length > 0;
    const hasPersistedEvents = persistedState?.events?.length;
    
    if (hasPersistedEvents && !hasResponseEvents) {
      // Process persisted events (with backend timestamps) to calculate durations
      const stateEvents: StateEvent[] = persistedState.events.map(event => ({
        type: event.type,
        item: event.item,
        item_id: event.item_id || event.item?.id,
        sequence_number: event.sequence_number || 0,
        timestamp: event.timestamp,
        summary_index: typeof event.summary_index === 'number' ? event.summary_index : undefined,
        part: event.part && typeof event.part === 'object' && 'type' in event.part && 'text' in event.part 
          ? event.part as { type: string; text: string } 
          : undefined,
        text: event.text,
        delta: event.delta,
      }));
      
      // Extract items from output_item.done events since they have complete data
      const items: ConversationItem[] = persistedState.events
        .filter(event => 
          event.type === 'response.output_item.done' && 
          event.item?.id && 
          event.item?.type
        )
        .map(event => ({
          id: event.item.id as string,
          type: event.item.type,
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: event.item || null,
          openai_event: event,
          isStreaming: false,
        }));
      
      // Process events through the store to calculate durations
      conversationStore.updateConversation(items, stateEvents);
      return;
    }

    if (!hasResponseEvents) {
      // Only clear if we don't have persisted state to fall back on
      if (!hasPersistedEvents) {
        conversationStore.updateStateItems([]);
      }
      return;
    }

    const items: ConversationItem[] = [];
    const processedEventIds = new Set<string>();
    
    const isDisplayableEvent = (event: OpenAIEvent): boolean => {
      return event.type !== 'response.in_progress';
    };
    
    const extractItemFromEvent = (event: OpenAIEvent): ConversationItem | ConversationItem[] | null => {
      const eventType = event.type;
      
      if (eventType === 'error' && (event as any).error) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const errorEvent = event as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
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
        };
      }
      
      if (eventType === 'response.created') {
        return null;
      }
      
      if (eventType === 'response.output_item.added' && event.item) {
        const itemId = event.item.id;
        if (!itemId) return null;
        
        const hasCompletedVersion = responseState.events.some((e: OpenAIEvent) => 
          (e.type === 'response.output_item.done' && e.item?.id === itemId) ||
          (e.type === 'response.mcp_list_tools.failed' && e.item_id === itemId) ||
          (e.type === 'response.mcp_call.failed' && e.item_id === itemId)
        );
        
        if (hasCompletedVersion) return null;
        
        return {
          id: itemId,
          type: event.item.type || 'unknown',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: {
            ...event.item,
            status: 'in-progress',
            content: event.item.content || [],
            summary: event.item.summary || []
          },
          openai_event: event,
          isStreaming: true,
        };
      }
      
      if (eventType === 'response.output_item.done' && event.item) {
        return {
          id: event.item.id,
          type: event.item.type || 'unknown',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: event.item,
          openai_event: event,
          isStreaming: false,
        };
      }
      
      if (eventType === 'response.completed') {
        const outputs: ConversationItem[] = [];
        
        const outputMessages = Array.isArray(event.response?.output) ? event.response.output : [];
        outputMessages.forEach((outputItem: unknown) => {
          const item = outputItem as { id: string; type: string; role?: string; [key: string]: unknown };
          if (item.id && !processedEventIds.has(item.id)) {
            outputs.push({
              id: item.id,
              type: item.type,
              timestamp: event.timestamp || new Date().toISOString(),
              openai_output: item,
              openai_event: event,
              isStreaming: false,
            });
            processedEventIds.add(item.id);
          }
        });
        
        return outputs.length > 0 ? outputs : null;
      }
      
      if (eventType === 'response.mcp_call.failed') {
        return {
          id: event.item_id || `failed_mcp_${event.sequence_number}`,
          type: 'mcp_call',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: {
            id: event.item_id || `failed_mcp_${event.sequence_number}`,
            type: 'mcp_call',
            status: 'failed',
            error: event.error || { message: 'MCP call failed', type: 'mcp_error' }
          },
          openai_event: event,
          isStreaming: false,
        };
      }
      
      if (eventType === 'response.mcp_list_tools.failed') {
        return {
          id: event.item_id || `mcp_list_failed_${event.sequence_number}`,
          type: 'mcp_list_tools',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: {
            id: event.item_id || `mcp_list_failed_${event.sequence_number}`,
            type: 'mcp_list_tools',
            status: 'failed',
            server_label: (event as any).item?.server_label || (event as any).server_label || 'unknown', // eslint-disable-line @typescript-eslint/no-explicit-any
            error: event.error || { message: 'Failed to list MCP tools', type: 'mcp_list_tools_error' }
          },
          openai_event: event,
          isStreaming: false,
        };
      }
      
      return null;
    };
    
    responseState.events.forEach((event: OpenAIEvent) => {
      if (!isDisplayableEvent(event)) return;
      
      const result = extractItemFromEvent(event);
      const itemsToAdd = Array.isArray(result) ? result : (result ? [result] : []);
      
      itemsToAdd.forEach(item => {
        if (item.id && processedEventIds.has(item.id)) return;
        items.push(item);
        if (item.id) processedEventIds.add(item.id);
      });
    });
    
    // Extract state events (with backend timestamps) to calculate durations
    const stateEvents: StateEvent[] = (responseState.events || []).map((event: OpenAIEvent) => ({
      type: event.type,
      item: event.item,
      item_id: event.item_id || event.item?.id,
      sequence_number: event.sequence_number || 0,
      timestamp: event.timestamp, // Backend timestamp for accurate duration calculation
      summary_index: typeof event.summary_index === 'number' ? event.summary_index : undefined,
      part: event.part && typeof event.part === 'object' && 'type' in event.part && 'text' in event.part 
        ? event.part as { type: string; text: string } 
        : undefined,
      text: event.text,
      delta: event.delta,
    }));
    
    conversationStore.updateConversation(items, stateEvents);
  }, [responseState, persistedState, conversationStore]);

  useEffect(() => {
    if (!agentResponses || !Array.isArray(agentResponses) || agentResponses.length === 0) {
      conversationStore.updateStateEvents([]);
      return;
    }

    try {
      // @ts-expect-error - agentResponses has unknown properties
      const streamEvents: StateEvent[] = agentResponses
        .filter(response => response && typeof response === 'object')
        .map(response => ({
          type: response.type,
          sequence_number: response.sequence_number || 0,
          item_id: response.item_id,
          delta: response.delta,
          text: response.text,
          item: response.item,
          error: response.error,
          timestamp: response.timestamp, // Backend timestamp for duration calculation
          summary_index: typeof response.summary_index === 'number' ? response.summary_index : undefined,
          part: response.part && typeof response.part === 'object' && 'type' in response.part && 'text' in response.part 
            ? response.part as { type: string; text: string } 
            : undefined,
        }));

      if (streamEvents.length > 0) {
        conversationStore.updateStateEvents(streamEvents);
      }
    } catch {
      conversationStore.updateStateEvents([]);
    }
  }, [agentResponses, conversationStore]);

  useEffect(() => {
    return () => conversationStore.clearStreamingState();
  }, [conversationStore]);

  const updateConversationItemStatus = (itemId: string, status: string) => {
    conversationStore.updateItemStatus(itemId, status);
  };

  return {
    conversation,
    updateConversationItemStatus,
  };
}