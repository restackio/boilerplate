import { StreamResponse, StreamingItem } from "./StreamingTypes";

/**
 * Utility functions for processing streaming responses into StreamingItems
 * Separates the complex logic from the component
 */

export class StreamingItemProcessor {
  private streamingRefs: Map<string, StreamingItem>;

  constructor() {
    this.streamingRefs = new Map();
  }

  clear() {
    this.streamingRefs.clear();
  }

  getItems(): StreamingItem[] {
    return Array.from(this.streamingRefs.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  filterOutPersistentItems(persistentItemIds: Set<string>): StreamingItem[] {
    const currentItems = Array.from(this.streamingRefs.values())
      .filter(item => {
        const isInPersistent = persistentItemIds.has(item.itemId) || 
                              persistentItemIds.has(`msg_${item.itemId}`) ||
                              persistentItemIds.has(`tool_${item.itemId}`) ||
                              persistentItemIds.has(`approval_${item.itemId}`) ||
                              persistentItemIds.has(`tools_${item.itemId}`) ||
                              persistentItemIds.has(`websearch_${item.itemId}`) ||
                              persistentItemIds.has(`reasoning_${item.itemId}`);
        
        if (isInPersistent) {
          this.streamingRefs.delete(item.itemId);
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return currentItems;
  }

  processTextDelta(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    if (!response.delta || !response.item_id) return false;
    
    const itemId = response.item_id;
    
    // Skip if already in persistent state
    if (persistentItemIds.has(`msg_${itemId}`) || persistentItemIds.has(itemId)) {
      return false;
    }

    let streamItem = this.streamingRefs.get(itemId);
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
      this.streamingRefs.set(itemId, streamItem);
    }

    // Create a new object to ensure React detects the change
    const updatedItem = {
      ...streamItem,
      content: streamItem.content + (response.delta || ""),
      timestamp: new Date().toISOString()
    };
    this.streamingRefs.set(itemId, updatedItem);
    return true;
  }

  processReasoningDelta(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    if (!response.delta || !response.item_id) return false;
    
    const itemId = response.item_id;
    
    // Skip if already in persistent state
    if (persistentItemIds.has(`reasoning_${itemId}`) || persistentItemIds.has(itemId)) {
      return false;
    }

    let streamItem = this.streamingRefs.get(itemId);
    if (!streamItem) {
      streamItem = {
        id: `stream_reasoning_${itemId}`,
        itemId: itemId,
        type: "reasoning",
        content: "",
        isStreaming: true,
        timestamp: new Date().toISOString(),
        status: "in-progress",
        startTime: Date.now(),
        rawData: response
      };
      this.streamingRefs.set(itemId, streamItem);
    }

    // Create a new object to ensure React detects the change
    const updatedItem = {
      ...streamItem,
      content: streamItem.content + (response.delta || ""),
      timestamp: new Date().toISOString()
    };
    this.streamingRefs.set(itemId, updatedItem);
    return true;
  }

  processTextCompletion(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    if (!response.text || !response.item_id) return false;
    
    const itemId = response.item_id;
    
    if (persistentItemIds.has(`msg_${itemId}`) || persistentItemIds.has(itemId)) {
      return false;
    }

    const streamItem = this.streamingRefs.get(itemId);
    if (streamItem) {
      const updatedItem = {
        ...streamItem,
        content: response.text || streamItem.content,
        isStreaming: false,
        timestamp: new Date().toISOString()
      };
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    }
    return false;
  }

  processReasoningCompletion(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    if (!response.text || !response.item_id) return false;
    
    const itemId = response.item_id;
    
    if (persistentItemIds.has(`reasoning_${itemId}`) || persistentItemIds.has(itemId)) {
      return false;
    }

    const streamItem = this.streamingRefs.get(itemId);
    if (streamItem && streamItem.type === "reasoning") {
      // Calculate duration if we have a start time
      const duration = streamItem.startTime 
        ? Math.round((Date.now() - streamItem.startTime) / 1000)
        : 0;
      
      const updatedItem = {
        ...streamItem,
        content: response.text || streamItem.content,
        isStreaming: false,
        status: "completed",
        duration: duration,
        timestamp: new Date().toISOString()
      };
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    }
    return false;
  }

  processItemAdded(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    if (!response.item) return false;
    
    const item = response.item;
    const itemId = item.id;

    if (!itemId || persistentItemIds.has(itemId)) {
      return false;
    }

    let streamItem: StreamingItem | null = null;

    if (item.type === "mcp_call") {
      streamItem = {
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
    } else if (item.type === "mcp_list_tools") {
      streamItem = {
        id: `stream_tools_${itemId}`,
        itemId: itemId,
        type: "tool-list",
        content: "Fetching available tools...",
        isStreaming: true,
        timestamp: new Date().toISOString(),
        status: "in-progress",
        rawData: response
      };
    } else if (item.type === "mcp_approval_request") {
      streamItem = {
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
    } else if (item.type === "web_search_call") {
      const actualItemId = item.id || itemId;
      streamItem = {
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
    } else if (item.type === "reasoning") {
      streamItem = {
        id: `stream_reasoning_${itemId}`,
        itemId: itemId,
        type: "reasoning",
        content: item.content || "Agent is thinking...",
        isStreaming: true,
        timestamp: new Date().toISOString(),
        status: "in-progress",
        rawData: response
      };
    }

    if (streamItem) {
      this.streamingRefs.set(streamItem.itemId, streamItem);
      return true;
    }
    return false;
  }

  processItemCompletion(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    if (!response.item) return false;
    
    const item = response.item;
    const itemId = item.id;

    if (!itemId || persistentItemIds.has(itemId)) {
      return false;
    }

    const streamItem = this.streamingRefs.get(itemId);
    if (!streamItem) return false;

    if (item.type === "mcp_call") {
      const updatedItem = {
        ...streamItem,
        content: `Tool call: ${item.name || "Unknown"}`,
        toolOutput: item.output,
        status: "completed",
        isStreaming: false,
        timestamp: new Date().toISOString()
      };
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    } else if (item.type === "mcp_list_tools" && item.tools) {
      const toolNames = item.tools.map((tool: any) => tool.name).join(", ");
      const updatedItem = {
        ...streamItem,
        content: `Available tools: ${toolNames}`,
        status: "completed",
        isStreaming: false,
        timestamp: new Date().toISOString()
      };
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    } else if (item.type === "web_search_call") {
      const updatedItem = {
        ...streamItem,
        content: `Web search: ${item.action?.query || "Search completed"}`,
        toolArguments: item.action,
        toolOutput: item.output || item.result,
        status: item.status || "completed",
        isStreaming: false,
        timestamp: new Date().toISOString()
      };
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    } else if (item.type === "reasoning") {
      const updatedItem = {
        ...streamItem,
        content: item.content || "Thinking completed",
        status: "completed",
        isStreaming: false,
        timestamp: new Date().toISOString()
      };
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    }

    return false;
  }

  processWebSearchStateChange(response: StreamResponse, persistentItemIds: Set<string>): boolean {
    const itemId = response.item_id;
    if (!itemId || persistentItemIds.has(itemId)) return false;
    
    let streamItem = this.streamingRefs.get(itemId);
    
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
      this.streamingRefs.set(itemId, streamItem);
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
      this.streamingRefs.set(itemId, updatedItem);
      return true;
    }
    
    return false;
  }
}
