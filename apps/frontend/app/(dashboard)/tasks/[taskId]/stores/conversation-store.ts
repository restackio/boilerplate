import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { ConversationItem } from '../types';

/**
 * Conversation Store - Two-Layer Architecture
 * 
 * 1. State Layer - Persistent backend state (source of truth)
 * 2. Streaming Layer - Real-time character-by-character updates
 * 
 * Merges both layers intelligently: state provides structure,
 * streaming adds live updates. Falls back gracefully if streaming fails.
 */

/**
 * StateEvent - Represents events from backend state with timestamps
 * Used for calculating durations and processing conversation history
 * Note: Despite being called "state" events, they're processed through the streaming layer
 */
export interface StateEvent {
  type: string;
  item?: {
    id: string;
    type: string;
    role?: string;
    content?: unknown[];
    [key: string]: unknown;
  };
  error?: {
    id: string;
    type: string;
    error_type: string;
    error_message: string;
    error_source: "openai" | "mcp" | "backend" | "network";
    error_details?: Record<string, unknown>;
  };
  item_id?: string;
  sequence_number: number;
  text?: string;
  delta?: unknown;
  // Reasoning-specific fields
  summary_index?: number;
  part?: {
    type: string;
    text: string;
  };
  // Backend timestamp for accurate duration tracking
  timestamp?: string;
  [key: string]: unknown;
}

export interface ConversationState {
  stateItems: ConversationItem[];
  streamEvents: StateEvent[];
  mergedConversation: ConversationItem[];
  isLoading: boolean;
}

export class ConversationStore {
  private stateItemsSubject = new BehaviorSubject<ConversationItem[]>([]);
  private streamEventsSubject = new BehaviorSubject<StateEvent[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  // Simple streaming state for active items
  private streamingItems = new Map<string, Partial<ConversationItem>>();
  private processedEvents = new Set<string>();
  // Buffer for storing text deltas by sequence number to handle out-of-order events
  private textDeltaBuffers = new Map<string, Map<number, string>>();

  public stateItems$: Observable<ConversationItem[]> = this.stateItemsSubject.asObservable();
  public streamEvents$: Observable<StateEvent[]> = this.streamEventsSubject.asObservable();
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  public state$: Observable<ConversationState>;

  constructor() {
    this.state$ = combineLatest([
      this.stateItems$.pipe(distinctUntilChanged()),
      this.streamEvents$.pipe(distinctUntilChanged()),
      this.isLoading$.pipe(distinctUntilChanged())
    ]).pipe(
      map(([stateItems, streamEvents, isLoading]) => {
        const mergedConversation = this.mergeConversation(stateItems, streamEvents);
        return {
          stateItems,
          streamEvents,
          mergedConversation,
          isLoading
        };
      }),
      shareReplay(1)
    );
  }

  public updateStateItems(items: ConversationItem[]) {
    this.stateItemsSubject.next(items);
  }

  public updateStateEvents(events: StateEvent[]) {
    this.streamEventsSubject.next(events);
  }
  
  public updateConversation(items: ConversationItem[], events: StateEvent[]) {
    // Update both state items and events - the state$ observable will automatically merge them
    this.stateItemsSubject.next(items);
    this.streamEventsSubject.next(events);
  }

  public updateIsLoading(loading: boolean) {
    this.isLoadingSubject.next(loading);
  }

  public clearStreamingState() {
    this.streamingItems.clear();
    this.processedEvents.clear();
    this.textDeltaBuffers.clear();
  }

  public updateItemStatus(itemId: string, status: string) {
    const currentItems = this.stateItemsSubject.value;
    const updatedItems = currentItems.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            openai_output: item.openai_output 
              ? { ...item.openai_output, status }
              : { id: itemId, type: item.type, status }
          }
        : item
    );
    this.updateStateItems(updatedItems);
  }

  private mergeConversation(stateItems: ConversationItem[], streamEvents: StateEvent[]): ConversationItem[] {
    if (streamEvents.length === 0) return stateItems;
    
    for (const event of streamEvents) {
      this.processEvent(event);
    }
    
    // Merge first, THEN clean up
    const mergedItems = stateItems.map(stateItem => {
      // Merge streaming overlay if it exists (regardless of isStreaming flag)
      // This allows us to merge duration data even for completed items
      if (this.streamingItems.has(stateItem.id)) {
        const streamingOverlay = this.streamingItems.get(stateItem.id);
        if (streamingOverlay?.id) {
          const merged = {
            ...stateItem,
            openai_output: {
              ...stateItem.openai_output,
              ...streamingOverlay.openai_output,
              content: streamingOverlay.openai_output?.content || stateItem.openai_output?.content || [],
              summary: streamingOverlay.openai_output?.summary || stateItem.openai_output?.summary || [],
            },
            // Only override isStreaming if the streaming overlay says it's still streaming
            isStreaming: streamingOverlay.isStreaming ?? stateItem.isStreaming,
            timestamp: streamingOverlay.timestamp || stateItem.timestamp,
            duration_seconds: streamingOverlay.duration_seconds || stateItem.duration_seconds,
            reasoning_duration_seconds: streamingOverlay.reasoning_duration_seconds || stateItem.reasoning_duration_seconds,
          };
          
          return merged;
        }
      }
      return stateItem;
    });
    
    const stateItemIds = new Set(stateItems.map(item => item.id));
    for (const [itemId, streamItem] of this.streamingItems) {
      if (!stateItemIds.has(itemId) && streamItem.id) {
        mergedItems.push(streamItem as ConversationItem);
      }
    }
    
    // Keep completed items in streamingItems for duration data
    // Only clean up text delta buffers which can be large
    for (const stateItem of stateItems) {
      if (!stateItem.isStreaming && this.textDeltaBuffers.has(stateItem.id)) {
        this.textDeltaBuffers.delete(stateItem.id);
      }
    }
    
    return mergedItems;
  }

  private processEvent(event: StateEvent): void {
    // Handle error events specially
    if (event.type === "error" && event.error) {
      const errorId = event.error.id;
      const eventKey = `${event.type}:${errorId}:${event.sequence_number}`;
      if (this.processedEvents.has(eventKey)) return;
      this.processedEvents.add(eventKey);
      
      // Build error item (will be overlaid on state or shown standalone)
      const errorItem: Partial<ConversationItem> = {
        id: errorId,
        type: "error",
        timestamp: new Date().toISOString(),
        isStreaming: false,
        error: event.error,
        openai_output: null
      };
      
      this.streamingItems.set(errorId, errorItem);
      return;
    }

    // Extract item_id from either event.item_id or event.item.id
    const itemId = event.item_id || event.item?.id;
    if (!itemId) return;
    
    const eventKey = `${event.type}:${itemId}:${event.sequence_number}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);
    
    // Always build streaming overlay (will be merged with state item if it exists)
    // Get or create streaming item
    let streamItem = this.streamingItems.get(itemId);
    if (!streamItem) {
      streamItem = {
        id: itemId,
        type: this.getItemType(event),
        timestamp: new Date().toISOString(),
        isStreaming: true,
        openai_output: {
          id: itemId,
          type: this.getItemType(event),
          status: "in-progress",
          content: [],
          summary: []
        },
        openai_event: {
          type: event.type,
          sequence_number: event.sequence_number,
          item_id: itemId
        }
      };
      this.streamingItems.set(itemId, streamItem);
    }
    
    // Update content based on event type
    this.updateStreamItem(streamItem, event);
  }

  private getItemType(event: StateEvent): string {
    if (event.type.includes('reasoning')) return 'reasoning';
    if (event.type.includes('web_search')) return 'web_search_call';
    if (event.type.includes('mcp_list_tools')) return 'mcp_list_tools';
    if (event.type.includes('mcp')) return 'mcp_call';
    if (event.type.includes('tool')) return 'tool_call';
    return 'assistant';
  }

  private updateStreamItem(streamItem: Partial<ConversationItem>, event: StateEvent): void {
    if (!streamItem.openai_output || !streamItem.id) return;
    
        // Track start timestamp for all item types
        if (event.type === 'response.output_item.added' && event.timestamp) {
          streamItem.start_timestamp = event.timestamp;
        }
        
        // Track end timestamp and calculate duration for all item types
        if (event.type === 'response.output_item.done' && event.timestamp) {
          streamItem.end_timestamp = event.timestamp;
          
          // Calculate duration in seconds from timestamps
          const startTimestamp = streamItem.start_timestamp;
          if (startTimestamp && typeof startTimestamp === 'string') {
            const startTime = new Date(startTimestamp).getTime();
            const endTime = new Date(event.timestamp).getTime();
            const durationSeconds = Math.round((endTime - startTime) / 1000);
            
            // For reasoning, also store in reasoning-specific field for backward compatibility
            if (event.item?.type === 'reasoning') {
              streamItem.reasoning_duration_seconds = durationSeconds;
            }
            
            streamItem.duration_seconds = durationSeconds;
          }
        }
    
    // Also track timestamps for MCP and tool call specific events
    if (event.type === 'response.mcp_call.in_progress' && event.timestamp) {
      if (!streamItem.start_timestamp) {
        streamItem.start_timestamp = event.timestamp;
      }
    }
    
    if (event.type === 'response.mcp_call.completed' && event.timestamp) {
      streamItem.end_timestamp = event.timestamp;
      
      const startTimestamp = streamItem.start_timestamp;
      if (startTimestamp && typeof startTimestamp === 'string') {
        const startTime = new Date(startTimestamp).getTime();
        const endTime = new Date(event.timestamp).getTime();
        streamItem.duration_seconds = Math.round((endTime - startTime) / 1000);
      }
    }
    
    // Handle text content with sequence number ordering
    if (event.delta && (event.type.includes('text') || event.type.includes('reasoning'))) {
      const isReasoning = event.type.includes('reasoning');
      const contentArray = isReasoning ? streamItem.openai_output.summary : streamItem.openai_output.content;
      
      // Store delta in buffer
      const itemId = streamItem.id;
      if (!this.textDeltaBuffers.has(itemId)) {
        this.textDeltaBuffers.set(itemId, new Map());
      }
      const deltaBuffer = this.textDeltaBuffers.get(itemId)!;
      deltaBuffer.set(event.sequence_number, String(event.delta));
      
      // Reconstruct text from all buffered deltas in sequence order
      const sortedDeltas = Array.from(deltaBuffer.entries())
        .sort(([a], [b]) => a - b)
        .map(([, delta]) => delta);
      const reconstructedText = sortedDeltas.join('');
      
      if (!contentArray || contentArray.length === 0) {
        const newContent = { type: "text", text: reconstructedText };
        if (isReasoning) {
          streamItem.openai_output.summary = [newContent];
        } else {
          streamItem.openai_output.content = [newContent];
        }
      } else {
        contentArray[0].text = reconstructedText;
      }
    }
    
    /**
     * Reasoning Event Flow (per OpenAI API):
     * 1. response.output_item.added - Reasoning item created with empty summary[]
     * 2. response.reasoning_summary_part.added - Initialize summary part at index N with empty text
     * 3. response.reasoning_summary_text.done - Update summary[N].text with complete text
     * 4. response.reasoning_summary_part.done - Finalize summary[N] with complete part object
     * 5. (Repeat steps 2-4 for each additional summary part)
     * 6. response.output_item.done - Reasoning complete, includes full summary array
     * 
     * During this flow, isStreaming remains true until step 6.
     */
    
    // Handle reasoning summary part added (initialize new summary part)
    if (event.type === 'response.reasoning_summary_part.added') {
      if (!streamItem.openai_output.summary) {
        streamItem.openai_output.summary = [];
      }
      const summaryIndex = event.summary_index ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const part = event.part as any;
      // Initialize the summary part at the specific index
      streamItem.openai_output.summary[summaryIndex] = {
        type: part?.type || "summary_text",
        text: part?.text || ""
      };
      // Keep streaming status true - reasoning continues
    }
    
    // Handle reasoning text completion events
    if (event.type === 'response.reasoning_text.done' || 
        event.type === 'response.reasoning_summary_text.done') {
      // Update the text content but don't mark as completed yet
      if (!streamItem.openai_output.summary) {
        streamItem.openai_output.summary = [];
      }
      const summaryIndex = event.summary_index ?? 0;
      if (event.text) {
        // Ensure the summary array has space for this index
        while (streamItem.openai_output.summary.length <= summaryIndex) {
          streamItem.openai_output.summary.push({ type: "summary_text", text: "" });
        }
        streamItem.openai_output.summary[summaryIndex].text = event.text;
      }
      // Keep streaming status true - reasoning continues until response.output_item.done
    }
    
    // Handle reasoning summary part done (finalize summary part)
    if (event.type === 'response.reasoning_summary_part.done') {
      if (!streamItem.openai_output.summary) {
        streamItem.openai_output.summary = [];
      }
      const summaryIndex = event.summary_index ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const part = event.part as any;
      if (part) {
        // Ensure the summary array has space for this index
        while (streamItem.openai_output.summary.length <= summaryIndex) {
          streamItem.openai_output.summary.push({ type: "summary_text", text: "" });
        }
        streamItem.openai_output.summary[summaryIndex] = {
          type: part.type || "summary_text",
          text: part.text || streamItem.openai_output.summary[summaryIndex]?.text || ""
        };
      }
      // Keep streaming status true - reasoning continues until response.output_item.done
    }
    
    // Handle completion for non-reasoning items
    if (event.text && event.type.includes('done') && !event.type.includes('reasoning')) {
      const contentArray = streamItem.openai_output.content;
      
      if (contentArray && contentArray.length > 0) {
        contentArray[0].text = event.text;
      }
      
      streamItem.isStreaming = false;
      streamItem.openai_output.status = "completed";
      
      // Clean up delta buffer when item is completed
      if (streamItem.id) {
        this.textDeltaBuffers.delete(streamItem.id);
      }
    }
    
    // Handle web search completion events (response.web_search_call.completed)
    if (event.type.includes('completed') && event.type.includes('web_search')) {
      streamItem.isStreaming = false;
      streamItem.openai_output.status = "completed";
      
      // Clean up delta buffer when item is completed
      if (streamItem.id) {
        this.textDeltaBuffers.delete(streamItem.id);
      }
    }
    
    // Handle MCP list tools failure events (response.mcp_list_tools.failed)
    if (event.type.includes('failed') && event.type.includes('mcp_list_tools')) {
      streamItem.isStreaming = false;
      streamItem.openai_output.status = "failed";
      if (event.error) {
        streamItem.openai_output.error = event.error;
      }
      
      // Clean up delta buffer when item is failed
      if (streamItem.id) {
        this.textDeltaBuffers.delete(streamItem.id);
      }
    }
    
    // Handle MCP call failure events (response.mcp_call.failed)
    if (event.type.includes('failed') && event.type.includes('mcp_call') && !event.type.includes('mcp_list_tools')) {
      streamItem.isStreaming = false;
      streamItem.openai_output.status = "failed";
      if (event.error) {
        streamItem.openai_output.error = event.error;
      }
      
      // Clean up delta buffer when item is failed
      if (streamItem.id) {
        this.textDeltaBuffers.delete(streamItem.id);
      }
    }
    
    // Handle item additions/completions
    if (event.item) {
      // Ensure content and summary arrays have proper types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedItem: any = { ...event.item };
      if (updatedItem.content && Array.isArray(updatedItem.content)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedItem.content = updatedItem.content.map((item: any) => ({
          type: item?.type || "text",
          text: String(item?.text || "")
        }));
      }
      if (updatedItem.summary && Array.isArray(updatedItem.summary)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedItem.summary = updatedItem.summary.map((item: any) => ({
          type: item?.type || "text", 
          text: String(item?.text || "")
        }));
      }
      streamItem.openai_output = { ...streamItem.openai_output, ...updatedItem };
      
      // Mark as completed when we get response.output_item.done
      // This is the definitive signal that an item (including reasoning) is complete
      if (event.type === 'response.output_item.done') {
        streamItem.isStreaming = false;
        // Use the status from the item if provided, otherwise set to completed
        streamItem.openai_output.status = updatedItem.status || "completed";
        
        // Clean up delta buffer when item is completed
        if (streamItem.id) {
          this.textDeltaBuffers.delete(streamItem.id);
        }
      }
    }
    
    streamItem.timestamp = new Date().toISOString();
  }
}