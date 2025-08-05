import { useState, useEffect } from "react";
import { ConversationItem } from "../types";

interface UseConversationProps {
  agentResponses: any[];
  agentState: any;
  taskAgentTaskId?: string | null;
}

export function useConversation({ agentResponses, agentState, taskAgentTaskId }: UseConversationProps) {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  // Clear conversation when agent task ID changes (new agent session)
  useEffect(() => {
    if (taskAgentTaskId) {
      console.log("Clearing conversation due to new agent task ID:", taskAgentTaskId);
      setConversation([]);
    }
  }, [taskAgentTaskId]);

  // Process agent state messages and convert them to conversation items
  useEffect(() => {
    if (!agentState || !taskAgentTaskId) {
      return;
    }

    console.log("Processing agent state:", agentState);
    console.log("Agent state JSON:", JSON.stringify(agentState, null, 2));

    // Extract messages from agent state - handle different data structures
    let stateMessages = null;
    
    // Try different possible structures
    if (Array.isArray(agentState)) {
      // If agentState is an array, check if it's nested
      if (agentState.length === 1 && Array.isArray(agentState[0])) {
        // Handle nested array structure like [Array(2)] - extract the inner array
        stateMessages = agentState[0];
      } else {
        // If agentState is an array, it might be the messages directly
        stateMessages = agentState;
      }
    } else if (agentState?.data && Array.isArray(agentState.data)) {
      stateMessages = agentState.data;
    } else if (agentState?.messages && Array.isArray(agentState.messages)) {
      stateMessages = agentState.messages;
    } else if (agentState?.data && Array.isArray(agentState.data[0])) {
      // Handle nested array structure like [Array(2), Array(2)]
      stateMessages = agentState.data.flat();
    } else if (agentState && typeof agentState === 'object') {
      // The agent state might be the messages array directly
      // Check if it has the structure we expect from the backend
      const keys = Object.keys(agentState);
      console.log("Agent state keys:", keys);
      
      // If the agent state is the messages array directly (from state_messages)
      if (keys.length === 0 || (keys.length === 1 && keys[0] === '0')) {
        // This might be the messages array directly
        stateMessages = Object.values(agentState);
      }
    }

    if (!stateMessages || !Array.isArray(stateMessages)) {
      console.log("No valid state messages found in agent state");
      return;
    }

    console.log("Found state messages:", stateMessages);
    console.log("State messages type:", typeof stateMessages);
    console.log("State messages length:", stateMessages.length);
    console.log("First state message:", stateMessages[0]);
    console.log("Second state message:", stateMessages[1]);

    const newItems: ConversationItem[] = [];

    stateMessages.forEach((message: any, index: number) => {
      console.log(`Processing message ${index}:`, message);
      console.log(`Message type:`, typeof message);
      console.log(`Message keys:`, message ? Object.keys(message) : 'null');
      
      if (message && message.role && message.content) {
        console.log(`Message has role and content:`, message.role, message.content);
        // Skip developer/system messages as they're not user-facing
        if (message.role === "developer" || message.role === "system") {
          console.log(`Skipping ${message.role} message`);
          return;
        }
        
        const conversationItem: ConversationItem = {
          id: `state_msg_${index}_${Date.now()}`,
          type: message.role === "user" ? "user" : "assistant",
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          rawData: message
        };
        console.log(`Created conversation item:`, conversationItem);
        newItems.push(conversationItem);
      } else {
        console.log(`Message does not have required fields:`, message);
      }
    });

    console.log("Created conversation items from state:", newItems);

    // Update conversation with state messages, but only if we don't have streaming responses
    setConversation(prev => {
      // Only add state messages if we don't have any streaming responses or completed streaming messages
      const hasStreamingResponses = prev.some(item => item.isStreaming);
      const hasCompletedStreamingMessages = prev.some(item => !item.isStreaming && item.id.startsWith('msg_'));
      
      if (hasStreamingResponses || hasCompletedStreamingMessages) {
        console.log("Skipping state messages because we have streaming responses or completed streaming messages");
        return prev;
      }
      
      const existingIds = new Set(prev.map(item => item.id));
      const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
      const updatedConversation = [...prev, ...uniqueNewItems];
      
      // Sort by timestamp to maintain chronological order
      const sortedConversation = updatedConversation.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      console.log("State messages - Updated conversation:", sortedConversation.map(item => ({
        id: item.id,
        type: item.type,
        timestamp: item.timestamp,
        content: item.content.substring(0, 50) + "..."
      })));
      return sortedConversation;
    });
  }, [agentState, taskAgentTaskId]);

  // Process agent responses and convert them to conversation items
  useEffect(() => {
    if (!agentResponses || !Array.isArray(agentResponses) || !taskAgentTaskId) {
      return;
    }

    const newItems: ConversationItem[] = [];
    const messageMap = new Map(); // Track streaming messages by item_id
    const processedIds = new Set(); // Track processed item IDs to avoid duplicates
    const streamingMessageIds = new Set(); // Track which messages are currently streaming
    const deltaOrderMap = new Map(); // Track delta order for each message

    agentResponses.forEach((response: any) => {
      // Skip completed responses to avoid duplicates with streaming
      if (response.type === "response.completed") {
        return;
      }
      
      if (response.type === "response.output_text.delta" && response.delta) {
        // Handle streaming text deltas - accumulate the text in real-time
        const itemId = response.item_id;
        streamingMessageIds.add(itemId);
        
        if (!messageMap.has(itemId)) {
          messageMap.set(itemId, {
            id: `stream_${itemId}`,
            type: "assistant" as const,
            content: "",
            timestamp: new Date().toISOString(),
            isStreaming: true,
            rawData: response
          });
        }
        
        // Accumulate the delta text for real-time streaming
        const message = messageMap.get(itemId);
        
        // Validate the delta to prevent corruption
        if (response.delta && typeof response.delta === 'string' && response.delta.trim().length > 0) {
          // Track delta order to detect reverse ordering
          if (!deltaOrderMap.has(itemId)) {
            deltaOrderMap.set(itemId, []);
          }
          deltaOrderMap.get(itemId).push(response.delta);
          
          // For now, just append normally and let the final text from response.output_text.done handle the correct order
          message.content += response.delta;
          message.timestamp = new Date().toISOString();
          
          console.log(`Streaming delta for ${itemId}:`, JSON.stringify(response.delta));
          console.log(`Delta count: ${deltaOrderMap.get(itemId).length}`);
          console.log(`Updated content:`, message.content);
        } else {
          console.warn(`Invalid delta received for ${itemId}:`, response.delta);
        }
      } else if (response.type === "response.output_item.added" && response.item && response.item.type === "message" && response.item.role === "assistant") {
        // Create a streaming message when a new assistant message starts
        const itemId = response.item.id;
        if (!messageMap.has(itemId)) {
          messageMap.set(itemId, {
            id: `stream_${itemId}`,
            type: "assistant" as const,
            content: "",
            timestamp: new Date().toISOString(),
            isStreaming: true,
            rawData: response
          });
        }
      } else if (response.type === "response.output_text.done" && response.text) {
        // Finalize streaming message with complete text
        const itemId = response.item_id;
        streamingMessageIds.delete(itemId);
        
        // Always create a new completed message, don't update streaming ones
        newItems.push({
          id: `msg_${itemId}`,
          type: "assistant",
          content: response.text,
          timestamp: new Date().toISOString(),
          isStreaming: false,
          rawData: response
        });
        processedIds.add(itemId);
        
        // Remove the streaming version from the map
        messageMap.delete(itemId);
      } else if (response.type === "response.output_item.added" && response.item) {
        // Handle new output items (tool calls, tool lists, messages)
        const item = response.item;
        
        // Skip if already processed
        if (processedIds.has(item.id)) {
          return;
        }
        
        if (item.type === "mcp_call") {
          // Tool call started
          newItems.push({
            id: `tool_${item.id}`,
            type: "tool-call",
            content: `Tool call: ${item.name}${item.arguments ? `(${item.arguments})` : ''}`,
            timestamp: new Date().toISOString(),
            toolName: item.name,
            status: "in-progress",
            rawData: response
          });
          processedIds.add(item.id);
        } else if (item.type === "mcp_list_tools") {
          // Tool list started
          newItems.push({
            id: `tools_${item.id}`,
            type: "tool-list",
            content: "Fetching available tools...",
            timestamp: new Date().toISOString(),
            status: "in-progress",
            rawData: response
          });
          processedIds.add(item.id);
        } else if (item.type === "message" && item.role === "assistant") {
          // Assistant message started - handled above with streaming
          processedIds.add(item.id);
        }
      } else if (response.type === "response.output_item.done" && response.item) {
        // Handle completed output items
        const item = response.item;
        
        // Skip if already processed
        if (processedIds.has(item.id)) {
          return;
        }
        
        if (item.type === "mcp_call") {
          // Tool call completed
          newItems.push({
            id: `tool_${item.id}`,
            type: "tool-call",
            content: `Tool call: ${item.name}${item.arguments ? `(${item.arguments})` : ''}`,
            timestamp: new Date().toISOString(),
            toolName: item.name,
            toolOutput: item.output,
            status: "completed",
            rawData: response
          });
          processedIds.add(item.id);
        } else if (item.type === "mcp_list_tools") {
          // Tool list completed
          if (item.tools && item.tools.length > 0) {
            const toolNames = item.tools.map((tool: any) => tool.name).join(", ");
            newItems.push({
              id: `tools_${item.id}`,
              type: "tool-list",
              content: `Available tools: ${toolNames}`,
              timestamp: new Date().toISOString(),
              status: "completed",
              rawData: response
            });
            processedIds.add(item.id);
          }
        }
      } else if (response.type === "response.mcp_call.completed" && response.item) {
        // Handle MCP tool calls (legacy format)
        const mcpCall = response.item;
        const itemId = `mcp_${Date.now()}_${Math.random()}`;
        if (!processedIds.has(itemId)) {
          newItems.push({
            id: itemId,
            type: "tool-call",
            content: `Tool call: ${mcpCall.name}(${mcpCall.arguments})`,
            timestamp: new Date().toISOString(),
            toolName: mcpCall.name,
            toolOutput: mcpCall.output,
            status: "completed",
            rawData: response
          });
          processedIds.add(itemId);
        }
      } else if (response.type === "response.mcp_list_tools.completed" && response.item) {
        // Handle MCP tool listing (legacy format)
        const toolList = response.item;
        const itemId = `mcp_list_${Date.now()}_${Math.random()}`;
        if (!processedIds.has(itemId) && toolList.tools && toolList.tools.length > 0) {
          const toolNames = toolList.tools.map((tool: any) => tool.name).join(", ");
          newItems.push({
            id: itemId,
            type: "tool-list",
            content: `Available tools: ${toolNames}`,
            timestamp: new Date().toISOString(),
            rawData: response
          });
          processedIds.add(itemId);
        }
      }
    });

    // Update conversation with new items, avoiding duplicates and handling streaming updates
    setConversation(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
      
      // Remove thinking indicators when we get real responses
      const filteredPrev = prev.filter(item => {
        if (item.type === "thinking" && newItems.length > 0) {
          return false; // Remove thinking indicator
        }
        return true;
      });
      
      // Remove streaming messages that have completed versions
      const updatedPrev = filteredPrev.filter(item => {
        if (item.isStreaming) {
          // Check if we have a completed version for this streaming message
          const itemId = item.id.replace('stream_', '');
          const hasCompletedVersion = newItems.some(newItem => 
            !newItem.isStreaming && newItem.id === `msg_${itemId}`
          );
          
          if (hasCompletedVersion) {
            console.log(`Removing streaming message in favor of completed version`);
            return false;
          }
          
          // Also remove streaming messages that are no longer actively streaming
          const isStillStreaming = streamingMessageIds.has(itemId);
          if (!isStillStreaming) {
            console.log(`Removing inactive streaming message`);
            return false;
          }
        }
        return true;
      });
      
      // Add streaming messages from messageMap that aren't in newItems yet
      messageMap.forEach((message) => {
        if (!existingIds.has(message.id)) {
          // Only add streaming messages that have meaningful content and are still actively streaming
          const itemId = message.id.replace('stream_', '');
          const isStillStreaming = streamingMessageIds.has(itemId);
          
          if (message.content && message.content.trim().length > 0 && isStillStreaming) {
            // Ensure typing indicator is set for streaming messages
            message.isStreaming = true;
            uniqueNewItems.push(message);
          }
        }
      });
      
      // Filter out duplicate content and corrupted messages
      const finalItems = [...updatedPrev, ...uniqueNewItems];
      const seenContent = new Set();
      const deduplicatedItems = finalItems.filter(item => {
        // Skip incomplete streaming messages
        if (item.isStreaming && (!item.content || item.content.trim().length < 3)) {
          return false;
        }
        
        // For streaming messages, use a different key to avoid conflicts with state messages
        const contentKey = item.isStreaming 
          ? `streaming_${item.type}:${item.id}`
          : `${item.type}:${item.content}`;
        
        if (seenContent.has(contentKey)) {
          return false;
        }
        seenContent.add(contentKey);
        return true;
      });
      
      // Sort items by timestamp to maintain chronological order
      const sortedItems = deduplicatedItems.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      console.log("Final sorted conversation items:", sortedItems.map(item => ({
        id: item.id,
        type: item.type,
        timestamp: item.timestamp,
        content: item.content.substring(0, 50) + "..."
      })));
      
      return sortedItems;
    });
  }, [agentResponses, taskAgentTaskId]);

  const addUserMessage = (content: string) => {
    const userMessage: ConversationItem = {
      id: `user_${Date.now()}_${Math.random()}`,
      type: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setConversation(prev => {
      const updatedConversation = [...prev, userMessage];
      // Sort by timestamp to maintain chronological order
      const sortedConversation = updatedConversation.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      console.log("User message added - Updated conversation:", sortedConversation.map(item => ({
        id: item.id,
        type: item.type,
        timestamp: item.timestamp,
        content: item.content.substring(0, 50) + "..."
      })));
      
      return sortedConversation;
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
      // Sort by timestamp to maintain chronological order
      const sortedConversation = updatedConversation.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      console.log("Thinking message added - Updated conversation:", sortedConversation.map(item => ({
        id: item.id,
        type: item.type,
        timestamp: item.timestamp,
        content: item.content.substring(0, 50) + "..."
      })));
      
      return sortedConversation;
    });
  };

  return {
    conversation,
    addUserMessage,
    addThinkingMessage,
  };
} 