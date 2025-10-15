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

export interface StreamEvent {
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
  [key: string]: unknown;
}

export interface ConversationState {
  stateItems: ConversationItem[];
  streamEvents: StreamEvent[];
  mergedConversation: ConversationItem[];
  isLoading: boolean;
}

export class ConversationStore {
  private stateItemsSubject = new BehaviorSubject<ConversationItem[]>([]);
  private streamEventsSubject = new BehaviorSubject<StreamEvent[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  // Simple streaming state for active items
  private streamingItems = new Map<string, Partial<ConversationItem>>();
  private processedEvents = new Set<string>();
  // Buffer for storing text deltas by sequence number to handle out-of-order events
  private textDeltaBuffers = new Map<string, Map<number, string>>();

  public stateItems$: Observable<ConversationItem[]> = this.stateItemsSubject.asObservable();
  public streamEvents$: Observable<StreamEvent[]> = this.streamEventsSubject.asObservable();
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

  public updateStreamEvents(events: StreamEvent[]) {
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

  private mergeConversation(stateItems: ConversationItem[], streamEvents: StreamEvent[]): ConversationItem[] {
    if (streamEvents.length === 0) return stateItems;
    
    for (const event of streamEvents) {
      this.processEvent(event);
    }
    
    for (const stateItem of stateItems) {
      if (!stateItem.isStreaming && this.streamingItems.has(stateItem.id)) {
        this.streamingItems.delete(stateItem.id);
        this.textDeltaBuffers.delete(stateItem.id);
      }
    }
    
    const mergedItems = stateItems.map(stateItem => {
      if (stateItem.isStreaming && this.streamingItems.has(stateItem.id)) {
        const streamingOverlay = this.streamingItems.get(stateItem.id);
        if (streamingOverlay?.id) {
          return {
            ...stateItem,
            openai_output: {
              ...stateItem.openai_output,
              ...streamingOverlay.openai_output,
              content: streamingOverlay.openai_output?.content || stateItem.openai_output?.content || [],
              summary: streamingOverlay.openai_output?.summary || stateItem.openai_output?.summary || [],
            },
            isStreaming: streamingOverlay.isStreaming ?? stateItem.isStreaming,
            timestamp: streamingOverlay.timestamp || stateItem.timestamp,
          };
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
    
    return mergedItems;
  }

  private processEvent(event: StreamEvent): void {
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

    if (!event.item_id) return;
    
    const eventKey = `${event.type}:${event.item_id}:${event.sequence_number}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);
    
    const itemId = event.item_id;
    
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

  private getItemType(event: StreamEvent): string {
    if (event.type.includes('reasoning')) return 'reasoning';
    if (event.type.includes('web_search')) return 'web_search_call';
    if (event.type.includes('mcp_list_tools')) return 'mcp_list_tools';
    if (event.type.includes('mcp')) return 'mcp_call';
    if (event.type.includes('tool')) return 'tool_call';
    return 'assistant';
  }

  private updateStreamItem(streamItem: Partial<ConversationItem>, event: StreamEvent): void {
    if (!streamItem.openai_output || !streamItem.id) return;
    
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
    
    // Handle completion
    if (event.text && event.type.includes('done')) {
      const isReasoning = event.type.includes('reasoning');
      const contentArray = isReasoning ? streamItem.openai_output.summary : streamItem.openai_output.content;
      
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
      if (event.type.includes('done')) {
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