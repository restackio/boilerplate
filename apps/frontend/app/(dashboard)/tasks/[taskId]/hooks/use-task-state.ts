import { useState, useEffect, useRef } from "react";
import { ConversationItem } from "../types";

interface ResponseStateItem {
  id: string;
  type: string;
  content: string;
  timestamp?: string;
  status?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  toolOutput?: unknown;
  serverLabel?: string;
  [key: string]: unknown;
}

interface UseTaskStateProps {
  responseState?: ResponseStateItem[] | { data: ResponseStateItem[] } | ResponseStateItem; // Unified persistent state from agent
  taskAgentTaskId?: string | null;
  persistedMessages?: any[];
}

export function useTaskState({ responseState, taskAgentTaskId, persistedMessages }: UseTaskStateProps) {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const persistentItemIds = useRef(new Set<string>());

  useEffect(() => {
    if (taskAgentTaskId) {
      setConversation([]);
      persistentItemIds.current.clear();
    }
  }, [taskAgentTaskId]);

  // Load persisted messages for completed tasks (when there's no active response state)
  useEffect(() => {
    if (persistedMessages && persistedMessages.length > 0 && !responseState) {
      const persistedItems: ConversationItem[] = persistedMessages.map((item: any) => ({
        id: item.id,
        type: item.type as ConversationItem['type'],
        content: item.content,
        timestamp: item.timestamp || new Date().toISOString(),
        toolName: item.toolName,
        toolArguments: item.toolArguments,
        toolOutput: item.toolOutput || item.result,
        serverLabel: item.serverLabel,
        status: item.status as ConversationItem['status'],
        rawData: item
      }));
      
      const sortedItems = persistedItems.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setConversation(sortedItems);
      
      // Mark all as persistent items
      const itemIds = new Set(persistedItems.map(item => item.id));
      persistentItemIds.current = itemIds;
      
      return;
    }
  }, [persistedMessages, responseState]);

  useEffect(() => {
    if (!responseState || !taskAgentTaskId) {
      return;
    }


    let conversationItems = null;
    if (Array.isArray(responseState)) {
      conversationItems = responseState;
    } else if (responseState?.data && Array.isArray(responseState.data)) {
      conversationItems = responseState.data;
    } else if (responseState && 'id' in responseState && 'type' in responseState && 'content' in responseState) {
      // Handle single conversation item
      conversationItems = [responseState];
    }

    if (!conversationItems || !Array.isArray(conversationItems)) {
      return;
    }

    const persistentItems: ConversationItem[] = [];
    const currentItemIds = new Set<string>();

    conversationItems.forEach((item: ResponseStateItem) => {
      if (item.type === "developer" || item.type === "system") {
        return;
      }
      
      if (!item.id || !item.type || item.content === undefined) {
        return;
      }
      
      const conversationItem: ConversationItem = {
        id: item.id,
        type: item.type as ConversationItem['type'],
        content: item.content,
        timestamp: item.timestamp || new Date().toISOString(),
        toolName: item.toolName,
        toolArguments: item.toolArguments,
        toolOutput: (item.toolOutput as string | object) || undefined,
        serverLabel: item.serverLabel,
        status: item.status as ConversationItem['status'],
        rawData: item
      };
      
      persistentItems.push(conversationItem);
      currentItemIds.add(item.id);
    });

    persistentItemIds.current = currentItemIds;
    
    const sortedItems = persistentItems.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    setConversation(sortedItems);
  }, [responseState, taskAgentTaskId]);

  const addUserMessage = (content: string) => {
    const userMessage: ConversationItem = {
      id: `user_${Date.now()}_${Math.random()}`,
      type: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    

    setConversation(prev => {
      const updatedConversation = [...prev, userMessage];
      const sorted = updatedConversation.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      return sorted;
    });
  };

  const addThinkingMessage = () => {
    const thinkingMessage: ConversationItem = {
      id: `thinking_${Date.now()}_${Math.random()}`,
      type: "thinking",
      content: "Agent is thinking...",
      timestamp: new Date().toISOString(),
    };
    
    setConversation(prev => {
      const updatedConversation = [...prev, thinkingMessage];
      return updatedConversation.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  };

  const updateConversationItemStatus = (itemId: string, status: ConversationItem['status']) => {
    setConversation(prev => 
      prev.map(item => {
        // Check if this is the item to update by matching the ID or the original itemId in rawData
        const rawData = item.rawData as any;
        const isTargetItem = item.id === itemId || 
                            rawData?.item?.id === itemId || 
                            rawData?.item_id === itemId;
        
        if (isTargetItem) {
          return { ...item, status };
        }
        return item;
      })
    );
  };

  return {
    conversation,
    persistentItemIds: persistentItemIds.current,
    addUserMessage,
    addThinkingMessage,
    updateConversationItemStatus,
  };
}