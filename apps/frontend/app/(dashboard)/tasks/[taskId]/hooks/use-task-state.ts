import { useState, useEffect, useRef } from "react";
import { ConversationItem } from "../types";

interface UseTaskStateProps {
  responseState?: any; // Unified persistent state from agent
  taskAgentTaskId?: string | null;
}

export function useTaskState({ responseState, taskAgentTaskId }: UseTaskStateProps) {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const persistentItemIds = useRef(new Set<string>());

  useEffect(() => {
    if (taskAgentTaskId) {
      console.log("💾 TASK STATE: Clearing for new task:", taskAgentTaskId);
      setConversation([]);
      persistentItemIds.current.clear();
    }
  }, [taskAgentTaskId]);

  useEffect(() => {
    if (!responseState || !taskAgentTaskId) {
      return;
    }

    console.log("💾 TASK STATE: Processing persistent state:", responseState);
    
    let conversationItems = null;
    if (Array.isArray(responseState)) {
      conversationItems = responseState;
      console.log("💾 TASK STATE: Using conversation array directly:", conversationItems.length, "items");
    } else if (responseState?.data && Array.isArray(responseState.data)) {
      conversationItems = responseState.data;
    } else if (responseState && responseState.id && responseState.type && responseState.content !== undefined) {
      // Handle single conversation item
      conversationItems = [responseState];
      console.log("💾 TASK STATE: Converting single response to array:", conversationItems);
    }

    if (!conversationItems || !Array.isArray(conversationItems)) {
      console.log("💾 TASK STATE: No valid conversation items in persistent state");
      return;
    }

    const persistentItems: ConversationItem[] = [];
    const currentItemIds = new Set<string>();

    conversationItems.forEach((item: any) => {
      if (item.type === "developer" || item.type === "system") {
        return;
      }
      
      if (!item.id || !item.type || item.content === undefined) {
        return;
      }
      
      const conversationItem: ConversationItem = {
        id: item.id,
        type: item.type,
        content: item.content,
        timestamp: item.timestamp || new Date().toISOString(),
        toolName: item.toolName,
        toolArguments: item.toolArguments,
        toolOutput: item.toolOutput,
        serverLabel: item.serverLabel,
        status: item.status,
        rawData: item
      };
      
      persistentItems.push(conversationItem);
      currentItemIds.add(item.id);
    });

    persistentItemIds.current = currentItemIds;
    
    const sortedItems = persistentItems.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log("💾 TASK STATE: Updated conversation:", 
      sortedItems.map(item => ({
        id: item.id,
        type: item.type,
        content: item.content.substring(0, 30) + "..."
      }))
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
    
    console.log("💾 TASK STATE: Adding user message:", userMessage);
    
    setConversation(prev => {
      const updatedConversation = [...prev, userMessage];
      const sorted = updatedConversation.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log("💾 TASK STATE: Updated conversation after user message:", 
        sorted.map(item => ({ id: item.id, type: item.type, content: item.content.substring(0, 30) + "..." }))
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

  return {
    conversation,
    persistentItemIds: persistentItemIds.current,
    addUserMessage,
    addThinkingMessage,
  };
}