import { useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { ConversationItem } from '../types';
import { conversationStore, StreamEvent } from '../stores/conversation-store';

interface UseRxjsConversationProps {
  responseState?: any;
  agentResponses?: any[];
  taskAgentTaskId?: string | null;
  persistedMessages?: any[];
}

/**
 * Simple React hook for RxJS-based conversation management
 */
export function useRxjsConversation({
  responseState,
  agentResponses = [],
  taskAgentTaskId,
  persistedMessages
}: UseRxjsConversationProps) {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  // Subscribe to the RxJS store
  useEffect(() => {
    const subscription: Subscription = conversationStore.state$.subscribe(
      (state) => {
        setConversation(state.mergedConversation);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Update state items from responseState
  useEffect(() => {
    
    if (persistedMessages?.length && !responseState) {
      // Use persisted messages when no active responseState
      const items: ConversationItem[] = persistedMessages
        .filter(msg => msg.id && msg.type)
        .map(msg => ({
          id: msg.id,
          type: msg.type,
          timestamp: msg.timestamp || new Date().toISOString(),
          openai_output: msg.openai_output || msg,
          openai_event: msg.openai_event || { sequence_number: 0 },
          isStreaming: false,
        }));
      
      conversationStore.updateStateItems(items);
      return;
    }

    if (!responseState || !responseState?.events || !taskAgentTaskId) {
      conversationStore.updateStateItems([]);
      return;
    }

    // Collect user messages, AI responses, and loading indicators separately, then interleave
    const userMessages: ConversationItem[] = [];
    const aiResponses: ConversationItem[] = [];
    const loadingIndicators: ConversationItem[] = [];
    
    // Step 1: Collect user messages in chronological order
    responseState.events.forEach((event: any) => {
      if (event.type === 'response.output_item.done' && 
          event.item?.type === 'message' && 
          event.item?.role === 'user') {
        userMessages.push({
          id: event.item.id,
          type: event.item.type,
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: event.item,
          openai_event: event,
          isStreaming: false,
        });
      }
    });
    
    // Step 2: Collect response.created events for loading indicators
    responseState.events
      .filter((event: any) => event.type === 'response.created')
      .forEach((event: any) => {
        loadingIndicators.push({
          id: `${event.response.id}_created`,
          type: 'response_status',
          timestamp: event.timestamp || new Date().toISOString(),
          openai_output: null,
          openai_event: event,
          isStreaming: true,
        });
      });
    
    // Step 3: Collect AI responses from completed responses (in chronological order)
    responseState.events
      .filter((event: any) => event.type === 'response.completed')
      .forEach((event: any) => {
        (event.response?.output || []).forEach((outputItem: any) => {
          aiResponses.push({
            id: outputItem.id,
            type: outputItem.type,
            timestamp: event.timestamp || new Date().toISOString(),
            openai_output: outputItem,
            openai_event: event,
            isStreaming: false,
          });
        });
      });
    
    // Step 4: Interleave user messages with loading indicators and AI responses
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
    
    // Convert to arrays
    const aiGroups = Array.from(responseGroups.values());
    
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
  }, [responseState, taskAgentTaskId, persistedMessages]);

  // Update stream events from agentResponses
  useEffect(() => {
    if (!agentResponses?.length) {
      conversationStore.updateStreamEvents([]);
      return;
    }

    // Convert to simple StreamEvent format
    const streamEvents: StreamEvent[] = agentResponses
      .map(response => ({
        type: response.type,
        sequence_number: response.sequence_number || 0,
        item_id: response.item_id,
        delta: response.delta,
        text: response.text,
        item: response.item,
      }));

    conversationStore.updateStreamEvents(streamEvents);
  }, [agentResponses]);

  // Clear streaming state when task changes
  useEffect(() => {
    if (taskAgentTaskId) {
      conversationStore.clearStreamingState();
    }
  }, [taskAgentTaskId]);

  const updateConversationItemStatus = (itemId: string, status: string) => {
    const updatedItems = conversation.map(item => 
      item.id === itemId 
        ? { ...item, openai_output: { ...item.openai_output, status } }
        : item
    );
    conversationStore.updateStateItems(updatedItems.filter(item => !item.isStreaming));
  };

  return {
    conversation,
    updateConversationItemStatus,
  };
}