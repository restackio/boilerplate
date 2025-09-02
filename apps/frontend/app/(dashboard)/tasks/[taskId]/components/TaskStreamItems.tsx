"use client";

import { useState, useEffect, useRef } from "react";
import { StreamResponse, StreamingItem, StreamItemsProps } from "./streaming/StreamingTypes";
import { StreamingItemProcessor } from "./streaming/StreamingItemProcessor";
import { StreamingItemRenderer } from "./streaming/StreamingItemRenderer";
import { SdkEventProcessor } from "./streaming/SdkEventProcessor";

export function StreamItems({ 
  agentResponses, 
  persistentItemIds, 
  taskAgentTaskId,
  onApproveRequest,
  onDenyRequest,
  onCardClick,
  conversation = []
}: StreamItemsProps) {
  const [streamingItems, setStreamingItems] = useState<StreamingItem[]>([]);
  const processorRef = useRef(new StreamingItemProcessor());

  // Clear when task changes
  useEffect(() => {
    if (taskAgentTaskId) {
      setStreamingItems([]);
      processorRef.current.clear();
    }
  }, [taskAgentTaskId]);

  // Process streaming responses and SDK events
  useEffect(() => {
    if (!taskAgentTaskId) {
      return;
    }

    const processor = processorRef.current;
    let hasUpdates = false;

    // Process real-time streaming responses
    if (agentResponses && Array.isArray(agentResponses)) {
      // Sort by sequence number for correct order
      const sortedResponses = [...agentResponses].sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));

    sortedResponses.forEach((response: StreamResponse) => {
      // Text streaming
      if (response.type === "response.output_text.delta") {
        hasUpdates = processor.processTextDelta(response, persistentItemIds) || hasUpdates;
      }
      
      // Reasoning summary text streaming
      if (response.type === "response.reasoning_summary_text.delta") {
        hasUpdates = processor.processReasoningDelta(response, persistentItemIds) || hasUpdates;
      }
      
      // Text completion
      if (response.type === "response.output_text.done") {
        hasUpdates = processor.processTextCompletion(response, persistentItemIds) || hasUpdates;
      }
      
      // Reasoning summary text completion
      if (response.type === "response.reasoning_summary_text.done") {
        hasUpdates = processor.processReasoningCompletion(response, persistentItemIds) || hasUpdates;
      }
      
      // Tool calls and other items
      if (response.type === "response.output_item.added") {
        hasUpdates = processor.processItemAdded(response, persistentItemIds) || hasUpdates;
      }
      
      // Completions
      if (response.type === "response.output_item.done") {
        hasUpdates = processor.processItemCompletion(response, persistentItemIds) || hasUpdates;
      }
      
      // Handle web search state changes
      if (response.type === "response.web_search_call.searching" || 
          response.type === "response.web_search_call.in_progress" ||
          response.type === "response.web_search_call.completed") {
        hasUpdates = processor.processWebSearchStateChange(response, persistentItemIds) || hasUpdates;
      }
    });
    }

    // Process SDK events from agent state (for enhanced persistence)
    if (conversation && conversation.length > 0) {
      conversation.forEach(conversationItem => {
        if (SdkEventProcessor.isSdkEvent(conversationItem) && 
            SdkEventProcessor.shouldDisplayAsStreamingItem(conversationItem)) {
          
          // Convert SDK event to StreamResponse format
          const streamResponse = SdkEventProcessor.convertSdkEventToStreamResponse(conversationItem);
          
          if (streamResponse && streamResponse.item_id) {
            // Check multiple ID formats for persistent state
            const itemId = streamResponse.item_id;
            const possibleIds = [
              itemId,
              `msg_${itemId}`,
              `tool_${itemId}`,
              `approval_${itemId}`,
              `tools_${itemId}`,
              `websearch_${itemId}`,
              `reasoning_${itemId}`,
              conversationItem.id
            ];
            
            // Skip if already in persistent state with any possible ID format
            if (possibleIds.some(id => persistentItemIds.has(id))) {
              return;
            }

            // Process as appropriate streaming item
            if (streamResponse.type === "response.output_item.added") {
              hasUpdates = processor.processItemAdded(streamResponse, persistentItemIds) || hasUpdates;
            } else if (streamResponse.type === "response.output_item.done") {
              hasUpdates = processor.processItemCompletion(streamResponse, persistentItemIds) || hasUpdates;
            } else if (streamResponse.type === "response.output_text.done") {
              hasUpdates = processor.processTextCompletion(streamResponse, persistentItemIds) || hasUpdates;
            } else if (streamResponse.type === "response.reasoning_summary_text.done") {
              hasUpdates = processor.processReasoningCompletion(streamResponse, persistentItemIds) || hasUpdates;
            } else if (streamResponse.type?.startsWith("response.web_search_call.")) {
              hasUpdates = processor.processWebSearchStateChange(streamResponse, persistentItemIds) || hasUpdates;
            } else if (streamResponse.type?.startsWith("response.mcp_call.")) {
              // Handle MCP call state changes
              hasUpdates = processor.processItemCompletion(streamResponse, persistentItemIds) || hasUpdates;
            }
          }
        }
      });
    }

    // Update state and filter out items that are now in persistent state
    if (hasUpdates) {
      const currentItems = processor.filterOutPersistentItems(persistentItemIds);

      console.log("Current streaming items:", currentItems.length, currentItems.map(i => ({ 
        type: i.type, 
        itemId: i.itemId, 
        streamId: i.id,
        status: i.status 
      })));

      setStreamingItems(currentItems);
    }

  }, [agentResponses, persistentItemIds, taskAgentTaskId, conversation]);

  if (streamingItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {streamingItems.map((item) => (
        <StreamingItemRenderer
          key={item.id}
          item={item}
          onApproveRequest={onApproveRequest}
          onDenyRequest={onDenyRequest}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}