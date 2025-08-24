import { useState, useEffect, useRef } from "react";
import { ConversationItem } from "../types";

interface UseTaskStateProps {
  responseState?: any;
  taskAgentTaskId?: string | null;
  persistedMessages?: any[];
}

export function useTaskState({ responseState, taskAgentTaskId, persistedMessages }: UseTaskStateProps) {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const persistentItemIds = useRef(new Set<string>());

  // Helper function to convert any item to ConversationItem
  const toConversationItem = (item: any): ConversationItem | null => {
    if (!item?.id || !item?.type) return null;
    
    return {
      id: item.id,
      type: item.type,
      timestamp: item.timestamp || new Date().toISOString(),
      openai_output: item.openai_output || {
        id: item.id,
        type: item.type,
        role: item.type === "user" ? "user" : "assistant",
        status: item.status || "completed",
        content: item.content ? [{ type: "output_text", text: item.content }] : undefined,
        name: item.toolName || item.name,
        arguments: item.toolArguments || item.arguments,
        output: item.toolOutput || item.output || item.result,
        server_label: item.serverLabel || item.server_label,
        tools: item.tools,
        action: item.action,
        summary: item.summary,
      },
      isStreaming: false,
    };
  };

  // Helper function to extract array from any responseState structure
  const extractItems = (state: any): any[] => {
    if (!state) return [];
    
    // Handle nested arrays (flatten them)
    if (Array.isArray(state)) {
      const flattened: any[] = [];
      state.forEach(item => {
        if (Array.isArray(item)) {
          flattened.push(...item);
        } else {
          flattened.push(item);
        }
      });
      return flattened;
    }
    
    if (state.data && Array.isArray(state.data)) return state.data;
    if (state.id && state.type) return [state]; // Single item
    return [];
  };

  useEffect(() => {
    if (taskAgentTaskId) {
      setConversation([]);
      persistentItemIds.current.clear();
    }
  }, [taskAgentTaskId]);

  useEffect(() => {
    // Handle persisted messages (completed tasks)
    if (persistedMessages?.length && !responseState) {
      const items = persistedMessages
        .map(toConversationItem)
        .filter(Boolean) as ConversationItem[];
      
      setConversation(items.sort((a, b) => 
        new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
      ));
      
      persistentItemIds.current = new Set(items.map(item => item.id));
      return;
    }

    // Handle active responseState
    if (!responseState || !taskAgentTaskId) {
      return;
    }

    const rawItems = extractItems(responseState);
    
    // Enhanced deduplication by ID and content signature
    const uniqueItems = rawItems.reduce((acc: any[], item: any) => {
      if (!item?.id) return acc;
      
      // Create a content signature for better deduplication
      const contentSignature = JSON.stringify({
        id: item.id,
        type: item.type,
        name: item.name || item.toolName,
        timestamp: item.timestamp
      });
      
      // Check if we already have this item by ID or content signature
      const isDuplicate = acc.find(existing => 
        existing.id === item.id || 
        JSON.stringify({
          id: existing.id,
          type: existing.type,
          name: existing.name || existing.toolName,
          timestamp: existing.timestamp
        }) === contentSignature
      );
      
      if (!isDuplicate) {
        acc.push(item);
      }
      return acc;
    }, []);
    
    const items = uniqueItems
      .filter(item => item?.type !== "developer" && item?.type !== "system") // Skip internal types
      .map(toConversationItem)
      .filter(Boolean) as ConversationItem[];

    setConversation(items.sort((a, b) => 
      new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
    ));
    
    // Track multiple ID patterns for better deduplication with streaming items
    const allIds = new Set<string>();
    items.forEach(item => {
      allIds.add(item.id);
      if (item.openai_output?.id) {
        allIds.add(item.openai_output.id);
      }
      // Add prefixed variants that streaming items might use
      allIds.add(`msg_${item.id}`);
      allIds.add(`tool_${item.id}`);
      allIds.add(`approval_${item.id}`);
      allIds.add(`tools_${item.id}`);
      allIds.add(`websearch_${item.id}`);
      allIds.add(`reasoning_${item.id}`);
    });
    
    persistentItemIds.current = allIds;
  }, [responseState, taskAgentTaskId, persistedMessages]);

  const addUserMessage = (content: string) => {
    const userMessage: ConversationItem = {
      id: `user_${Date.now()}_${Math.random()}`,
      type: "user",
      timestamp: new Date().toISOString(),
      openai_output: {
        id: `user_${Date.now()}_${Math.random()}`,
        type: "message",
        role: "user",
        status: "completed",
        content: [{ type: "input_text", text: content }],
      },
    };
    

    setConversation(prev => {
      const updatedConversation = [...prev, userMessage];
      const sorted = updatedConversation.sort((a, b) => 
        new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
      );
      
      return sorted;
    });
  };

  const addThinkingMessage = () => {
    const thinkingMessage: ConversationItem = {
      id: `thinking_default`,
      type: "reasoning",
      timestamp: new Date().toISOString(),
      openai_output: {
        id: `thinking_default`,
        type: "reasoning",
        status: "in-progress",
        summary: [{ type: "summary_text", text: "Agent is thinking..." }],
      },
      isStreaming: false,
    };
    
    setConversation(prev => {
      const updatedConversation = [...prev, thinkingMessage];
      return updatedConversation.sort((a, b) => 
        new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
      );
    });
  };

  const updateConversationItemStatus = (itemId: string, status: string) => {
    setConversation(prev => 
      prev.map(item => {
        // Check if this is the item to update by matching the ID or the openai_output ID
        const isTargetItem = item.id === itemId || 
                            item.openai_output?.id === itemId;
        
        if (isTargetItem) {
          return { 
            ...item, 
            openai_output: {
              ...item.openai_output,
              status
            }
          };
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