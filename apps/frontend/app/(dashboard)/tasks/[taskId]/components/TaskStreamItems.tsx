"use client";

import { useState, useEffect, useRef } from "react";
import { StreamResponse, StreamingItem, StreamItemsProps } from "./streaming/StreamingTypes";
import { StreamingItemProcessor } from "./streaming/StreamingItemProcessor";
import { StreamingItemRenderer } from "./streaming/StreamingItemRenderer";

export function StreamItems({ 
  agentResponses, 
  persistentItemIds, 
  taskAgentTaskId,
  onApproveRequest,
  onDenyRequest,
  onCardClick
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

  // Process streaming responses
  useEffect(() => {
    if (!agentResponses || !Array.isArray(agentResponses) || !taskAgentTaskId) {
      return;
    }

    const processor = processorRef.current;
    let hasUpdates = false;

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

  }, [agentResponses, persistentItemIds, taskAgentTaskId]);

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