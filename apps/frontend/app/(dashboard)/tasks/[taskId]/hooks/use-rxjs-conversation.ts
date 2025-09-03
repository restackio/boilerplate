import { useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { ConversationItem } from '../types';
import { conversationStore, ConversationState, StreamEvent } from '../stores/conversation-store';

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

    if (!responseState?.events || !taskAgentTaskId) {
      conversationStore.updateStateItems([]);
      return;
    }

    // Convert completed events to conversation items
    const items: ConversationItem[] = responseState.events
      .filter((event: any) => event.type?.includes('output_item.done') && event.item?.id)
      .sort((a: any, b: any) => (a.sequence_number || 0) - (b.sequence_number || 0))
      .map((event: any) => ({
        id: event.item.id,
        type: event.item.type,
        timestamp: event.timestamp || new Date().toISOString(),
        openai_output: event.item,
        openai_event: { ...event, sequence_number: event.sequence_number || 0 },
        isStreaming: false,
      }));
    
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
      .filter(response => response.sequence_number !== undefined)
      .map(response => ({
        type: response.type,
        sequence_number: response.sequence_number,
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

  // Helper functions
  const addUserMessage = (content: string) => {
    const timestamp = new Date().toISOString();
    const userMessage: ConversationItem = {
      id: `user_${Date.now()}`,
      type: "user",
      timestamp,
      openai_output: {
        id: `user_${Date.now()}`,
        type: "message",
        role: "user",
        status: "completed",
        content: [{ type: "input_text", text: content }],
      },
      openai_event: { sequence_number: Date.now() }, // Simple sequence for user messages
    };
    
    conversationStore.updateStateItems([...conversation.filter(item => item.type !== 'user' || item.id !== userMessage.id), userMessage]);
  };

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
    addUserMessage,
    updateConversationItemStatus,
  };
}