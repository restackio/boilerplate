"use client";

import { useState, useEffect, useRef } from "react";
import { ConversationItem } from "../types";
import { ConversationMessage } from "./conversation-message";
import { TaskCardTool } from "./TaskCardTool";
import { TaskCardMcp } from "./TaskCardMcp";
import { TaskCardWebSearch } from "./TaskCardWebSearch";
import { TaskCardReasoning } from "./TaskCardReasoning";

interface Tool {
  name: string;
  [key: string]: unknown;
}

interface StreamResponse {
  type: string;
  sequence_number?: number;
  delta?: string;
  text?: string;
  item_id?: string;
  item?: {
    id?: string;
    type?: string;
    name?: string;
    arguments?: Record<string, unknown>;
    output?: unknown;
    result?: unknown;
    tools?: Tool[];
    content?: string;
    summary?: string[];
    status?: string;
    action?: {
      query?: string;
      type?: string;
    };
    server_label?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface StreamingItem {
  id: string;
  itemId: string;
  type: "text" | "tool-call" | "tool-list" | "mcp-approval" | "web-search" | "reasoning";
  content: string;
  isStreaming: boolean;
  timestamp: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  toolOutput?: unknown;
  serverLabel?: string;
  status?: string;
  rawData?: Record<string, unknown>;
}

interface StreamItemsProps {
  agentResponses: StreamResponse[];
  persistentItemIds: Set<string>;
  taskAgentTaskId?: string | null;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
}

export function StreamItems({ 
  agentResponses, 
  persistentItemIds, 
  taskAgentTaskId,
  onApproveRequest,
  onDenyRequest,
  onCardClick
}: StreamItemsProps) {
  const [streamingItems, setStreamingItems] = useState<StreamingItem[]>([]);
  const streamingRefs = useRef(new Map<string, StreamingItem>());

  // Clear when task changes
  useEffect(() => {
    if (taskAgentTaskId) {
      setStreamingItems([]);
      streamingRefs.current.clear();
    }
  }, [taskAgentTaskId]);

  // Process streaming responses
  useEffect(() => {
    if (!agentResponses || !Array.isArray(agentResponses) || !taskAgentTaskId) {
      return;
    }

    let hasUpdates = false;

    // Sort by sequence number for correct order
    const sortedResponses = [...agentResponses].sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));

    sortedResponses.forEach((response: StreamResponse) => {
      
      // Text streaming
      if (response.type === "response.output_text.delta" && response.delta && response.item_id) {
        const itemId = response.item_id;
        
        // Skip if already in persistent state
        if (persistentItemIds.has(`msg_${itemId}`) || persistentItemIds.has(itemId)) {
          return;
        }

        let streamItem = streamingRefs.current.get(itemId);
        if (!streamItem) {
          streamItem = {
            id: `stream_${itemId}`,
            itemId: itemId,
            type: "text",
            content: "",
            isStreaming: true,
            timestamp: new Date().toISOString(),
            rawData: response
          };
          streamingRefs.current.set(itemId, streamItem);
        }

        // Create a new object to ensure React detects the change
        const updatedItem = {
          ...streamItem,
          content: streamItem.content + (response.delta || ""),
          timestamp: new Date().toISOString()
        };
        streamingRefs.current.set(itemId, updatedItem);
        hasUpdates = true;
      }

      // Text completion
      if (response.type === "response.output_text.done" && response.text && response.item_id) {
        const itemId = response.item_id;
        
        if (persistentItemIds.has(`msg_${itemId}`) || persistentItemIds.has(itemId)) {
          return;
        }

        const streamItem = streamingRefs.current.get(itemId);
        if (streamItem) {
                  // Create a new object to ensure React detects the change
        const updatedItem = {
          ...streamItem,
          content: response.text || streamItem.content,
          isStreaming: false,
          timestamp: new Date().toISOString()
        };
          streamingRefs.current.set(itemId, updatedItem);
          hasUpdates = true;
        }
      }

      // Tool calls and other items
      if (response.type === "response.output_item.added" && response.item) {
        const item = response.item;
        const itemId = item.id;

        if (persistentItemIds.has(itemId)) {
          return;
        }

        if (item.type === "mcp_call") {
          const streamItem: StreamingItem = {
            id: `stream_tool_${itemId}`,
            itemId: itemId,
            type: "tool-call",
            content: `Tool call: ${item.name || "Unknown"}`,
            isStreaming: true,
            timestamp: new Date().toISOString(),
            toolName: item.name,
            toolArguments: item.arguments,
            status: "in-progress",
            rawData: response
          };
          streamingRefs.current.set(itemId, streamItem);
          hasUpdates = true;
        } else if (item.type === "mcp_list_tools") {
          const streamItem: StreamingItem = {
            id: `stream_tools_${itemId}`,
            itemId: itemId,
            type: "tool-list",
            content: "Fetching available tools...",
            isStreaming: true,
            timestamp: new Date().toISOString(),
            status: "in-progress",
            rawData: response
          };
          streamingRefs.current.set(itemId, streamItem);
          hasUpdates = true;
        } else if (item.type === "mcp_approval_request") {
          const streamItem: StreamingItem = {
            id: `stream_approval_${itemId}`,
            itemId: itemId,
            type: "mcp-approval",
            content: `Approval required for: ${item.name || "Unknown"}`,
            isStreaming: false,
            timestamp: new Date().toISOString(),
            toolName: item.name,
            toolArguments: item.arguments,
            serverLabel: item.server_label,
            status: "waiting-approval",
            rawData: response
          };
          streamingRefs.current.set(itemId, streamItem);
          hasUpdates = true;
        } else if (item.type === "web_search_call") {
          // Use the actual item_id for grouping, not a generated ID
          const actualItemId = item.id || itemId;
          const streamItem: StreamingItem = {
            id: `stream_websearch_${actualItemId}`,
            itemId: actualItemId,
            type: "web-search",
            content: `Web search: ${item.action?.query || "Searching..."}`,
            isStreaming: true,
            timestamp: new Date().toISOString(),
            toolArguments: item.action,
            status: item.status || "in-progress",
            rawData: response
          };
          streamingRefs.current.set(actualItemId, streamItem);
          hasUpdates = true;
        } else if (item.type === "reasoning") {
          const streamItem: StreamingItem = {
            id: `stream_reasoning_${itemId}`,
            itemId: itemId,
            type: "reasoning",
            content: item.content || "Agent is reasoning...",
            isStreaming: true,
            timestamp: new Date().toISOString(),
            status: "in-progress",
            rawData: response
          };
          streamingRefs.current.set(itemId, streamItem);
          hasUpdates = true;
        }
      }

      // Completions
      if (response.type === "response.output_item.done" && response.item) {
        const item = response.item;
        const itemId = item.id;

        if (persistentItemIds.has(itemId)) {
          return;
        }

        const streamItem = streamingRefs.current.get(itemId);
        if (streamItem && item.type === "mcp_call") {
          // Create a new object to ensure React detects the change
          const updatedItem = {
            ...streamItem,
            content: `Tool call: ${item.name || "Unknown"}`,
            toolOutput: item.output,
            status: "completed",
            isStreaming: false,
            timestamp: new Date().toISOString()
          };
          streamingRefs.current.set(itemId, updatedItem);
          hasUpdates = true;
        } else if (streamItem && item.type === "mcp_list_tools" && item.tools) {
          const toolNames = item.tools.map((tool: Tool) => tool.name).join(", ");
          // Create a new object to ensure React detects the change
          const updatedItem = {
            ...streamItem,
            content: `Available tools: ${toolNames}`,
            status: "completed",
            isStreaming: false,
            timestamp: new Date().toISOString()
          };
          streamingRefs.current.set(itemId, updatedItem);
          hasUpdates = true;
        } else if (streamItem && item.type === "web_search_call") {
          // Update web search with completion data
          const updatedItem = {
            ...streamItem,
            content: `Web search: ${item.action?.query || "Search completed"}`,
            toolOutput: item.output || item.result,
            status: item.status || "completed",
            isStreaming: false,
            timestamp: new Date().toISOString()
          };
          streamingRefs.current.set(itemId, updatedItem);
          hasUpdates = true;
        } else if (streamItem && item.type === "reasoning") {
          // Update reasoning with completion data
          const updatedItem = {
            ...streamItem,
            content: item.content || "Reasoning completed",
            status: "completed",
            isStreaming: false,
            timestamp: new Date().toISOString()
          };
          streamingRefs.current.set(itemId, updatedItem);
          hasUpdates = true;
        }
      }

      // Handle web search state changes
      if (response.type === "response.web_search_call.searching" || 
          response.type === "response.web_search_call.in_progress" ||
          response.type === "response.web_search_call.completed") {
        const itemId = response.item_id;
        if (itemId && !persistentItemIds.has(itemId)) {
          let streamItem = streamingRefs.current.get(itemId);
          
          // If no existing item, create one for the state change
          if (!streamItem) {
            streamItem = {
              id: `stream_websearch_${itemId}`,
              itemId: itemId,
              type: "web-search",
              content: "Web search in progress...",
              isStreaming: true,
              timestamp: new Date().toISOString(),
              status: "in-progress",
              rawData: response
            };
            streamingRefs.current.set(itemId, streamItem);
          }
          
          if (streamItem.type === "web-search") {
            let status = "in-progress";
            if (response.type === "response.web_search_call.searching") {
              status = "searching";
            } else if (response.type === "response.web_search_call.completed") {
              status = "completed";
            }
            
            const updatedItem = {
              ...streamItem,
              status: status,
              isStreaming: status !== "completed",
              timestamp: new Date().toISOString()
            };
            streamingRefs.current.set(itemId, updatedItem);
            hasUpdates = true;
          }
        }
      }
    });

    // Update state and filter out items that are now in persistent state
    if (hasUpdates) {
      const currentItems = Array.from(streamingRefs.current.values())
        .filter(item => {
          const isInPersistent = persistentItemIds.has(item.itemId) || 
                                 persistentItemIds.has(`msg_${item.itemId}`) ||
                                 persistentItemIds.has(`tool_${item.itemId}`) ||
                                 persistentItemIds.has(`approval_${item.itemId}`) ||
                                 persistentItemIds.has(`tools_${item.itemId}`) ||
                                 persistentItemIds.has(`websearch_${item.itemId}`) ||
                                 persistentItemIds.has(`reasoning_${item.itemId}`);
          
          if (isInPersistent) {
            streamingRefs.current.delete(item.itemId);
            return false;
          }
          return true;
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      console.log("Current streaming items:", currentItems.length, currentItems.map(i => ({ 
        type: i.type, 
        itemId: i.itemId, 
        streamId: i.id,
        status: i.status 
      })));

      setStreamingItems(currentItems);
    }

  }, [agentResponses, persistentItemIds, taskAgentTaskId]);

  if (streamingItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {streamingItems.map((item) => {
        if (item.type === "text") {
          // Simple text message - same style as persistent messages
          const conversationItem: ConversationItem = {
            id: item.id,
            type: "assistant",
            content: item.content,
            timestamp: item.timestamp,
            isStreaming: item.isStreaming,
            rawData: item.rawData
          };
          return <ConversationMessage key={item.id} item={conversationItem} />;
        } 
        
        if (item.type === "tool-call" || item.type === "tool-list") {
          // Tool card - same style as persistent cards
          const conversationItem: ConversationItem = {
            id: item.id,
            type: item.type === "tool-call" ? "tool-call" : "tool-list",
            content: item.content,
            timestamp: item.timestamp,
            toolName: item.toolName,
            toolArguments: item.toolArguments,
            toolOutput: typeof item.toolOutput === 'object' ? item.toolOutput : String(item.toolOutput || ''),
            serverLabel: item.serverLabel,
            status: item.status as "completed" | "failed" | "in-progress" | "pending" | "waiting-approval",
            rawData: item.rawData
          };
          return <TaskCardTool key={item.id} item={conversationItem} onClick={onCardClick} />;
        }
        
        if (item.type === "mcp-approval") {
          // Approval card - same style as persistent cards
          const conversationItem: ConversationItem = {
            id: item.id,
            type: "mcp-approval-request",
            content: item.content,
            timestamp: item.timestamp,
            toolName: item.toolName,
            toolArguments: item.toolArguments,
            serverLabel: item.serverLabel,
            status: item.status as "completed" | "failed" | "in-progress" | "pending" | "waiting-approval",
            rawData: item.rawData
          };
          return (
            <TaskCardMcp 
              key={item.id} 
              item={conversationItem} 
              onApprove={() => onApproveRequest?.(item.itemId)}
              onDeny={() => onDenyRequest?.(item.itemId)} 
            />
          );
        }

        if (item.type === "web-search") {
          // Web search card
          const conversationItem: ConversationItem = {
            id: item.id,
            type: "web-search",
            content: item.content,
            timestamp: item.timestamp,
            toolArguments: item.toolArguments,
            toolOutput: typeof item.toolOutput === 'object' ? item.toolOutput : String(item.toolOutput || ''),
            status: item.status as "completed" | "failed" | "in-progress" | "pending" | "waiting-approval" | "searching",
            rawData: item.rawData
          };
          return <TaskCardWebSearch key={item.id} item={conversationItem} onClick={onCardClick} />;
        }

        if (item.type === "reasoning") {
          // Reasoning card
          const conversationItem: ConversationItem = {
            id: item.id,
            type: "reasoning",
            content: item.content,
            timestamp: item.timestamp,
            status: item.status as "completed" | "failed" | "in-progress" | "pending" | "waiting-approval",
            rawData: item.rawData
          };
          return <TaskCardReasoning key={item.id} item={conversationItem} onClick={onCardClick} />;
        }
        
        return null;
      })}
    </div>
  );
}