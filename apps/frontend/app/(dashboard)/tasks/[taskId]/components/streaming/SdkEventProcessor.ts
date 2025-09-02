/**
 * Enhanced event processor for handling OpenAI SDK events from agent state.
 * Works alongside existing StreamingItemProcessor for real-time updates.
 */

import { ConversationItem } from "../../types";
import { StreamResponse, StreamingItem } from "./StreamingTypes";

export class SdkEventProcessor {
  /**
   * Convert SDK events from agent state to StreamResponse format.
   * This ensures compatibility with existing frontend components.
   */
  static convertSdkEventToStreamResponse(conversationItem: ConversationItem): StreamResponse | null {
    // Only process OpenAI SDK events (not regular conversation items)
    if (!conversationItem.type?.startsWith('response.')) {
      return null;
    }

    // Use openai_event if available, otherwise use openai_output for compatibility
    const openaiEvent = conversationItem.openai_event || conversationItem.openai_output;
    
    const baseResponse: StreamResponse = {
      type: conversationItem.type,
      sequence_number: openaiEvent.sequence_number || 0,
      timestamp: conversationItem.timestamp || openaiEvent.created_at || new Date().toISOString(),
    };

    // Handle different SDK event types using OpenAI's native structure
    if (conversationItem.type === "response.output_item.added") {
      return {
        ...baseResponse,
        item_id: openaiEvent.output_index?.toString() || openaiEvent.item_id,
        item: openaiEvent.item  // Use OpenAI's native item structure
      };
    }

    if (conversationItem.type === "response.output_item.done") {
      return {
        ...baseResponse,
        item_id: openaiEvent.output_index?.toString() || openaiEvent.item_id,
        item: openaiEvent.item  // Use OpenAI's native item structure
      };
    }

    if (conversationItem.type === "response.output_text.done") {
      return {
        ...baseResponse,
        item_id: openaiEvent.item_id || conversationItem.id,
        text: openaiEvent.text
      };
    }

    if (conversationItem.type === "response.reasoning_summary_text.done") {
      return {
        ...baseResponse,
        item_id: openaiEvent.item_id || conversationItem.id,
        text: openaiEvent.text
      };
    }

    if (conversationItem.type?.startsWith("response.web_search_call.")) {
      return {
        ...baseResponse,
        item_id: openaiEvent.item_id || conversationItem.id,
        status: SdkEventProcessor.extractWebSearchStatus(conversationItem.type)
      };
    }

    if (conversationItem.type?.startsWith("response.mcp_call.")) {
      return {
        ...baseResponse,
        item_id: openaiEvent.item_id || conversationItem.id,
        status: SdkEventProcessor.extractMcpStatus(conversationItem.type)
      };
    }

    // Return the raw OpenAI SDK event for unknown types
    return {
      ...baseResponse,
      item_id: openaiEvent.item_id || conversationItem.id,
      _raw_openai_event: openaiEvent  // Trust OpenAI's complete event structure
    };
  }

  /**
   * Convert SDK output item to format expected by existing components.
   */
  private static convertSdkOutputItem(item: any): any {
    if (!item) return null;

    const converted = {
      id: item.id,
      type: item.type,
      status: item.status || "in-progress"
    };

    // Handle different item types
    if (item.type === "mcp_call") {
      return {
        ...converted,
        name: item.name,
        arguments: item.arguments,
        output: item.output,
        server_label: item.server_label
      };
    }

    if (item.type === "mcp_list_tools") {
      return {
        ...converted,
        tools: item.tools || [],
        server_label: item.server_label
      };
    }

    if (item.type === "mcp_approval_request") {
      return {
        ...converted,
        name: item.name,
        arguments: item.arguments,
        server_label: item.server_label
      };
    }

    if (item.type === "web_search_call") {
      return {
        ...converted,
        action: {
          query: item.query,
          type: "web_search"
        },
        output: item.output,
        result: item.result
      };
    }

    if (item.type === "reasoning") {
      return {
        ...converted,
        content: item.content,
        summary: item.summary || []
      };
    }

    return converted;
  }

  private static extractWebSearchStatus(eventType: string): string {
    if (eventType.endsWith(".searching")) return "searching";
    if (eventType.endsWith(".in_progress")) return "in-progress";
    if (eventType.endsWith(".completed")) return "completed";
    return "unknown";
  }

  private static extractMcpStatus(eventType: string): string {
    if (eventType.endsWith(".in_progress")) return "in-progress";
    if (eventType.endsWith(".completed")) return "completed";
    if (eventType.endsWith(".failed")) return "failed";
    return "unknown";
  }

  /**
   * Check if a conversation item is an SDK event that should be processed.
   */
  static isSdkEvent(conversationItem: ConversationItem): boolean {
    return conversationItem.type?.startsWith('response.') || false;
  }

  /**
   * Check if an SDK event should be displayed as a streaming item.
   */
  static shouldDisplayAsStreamingItem(conversationItem: ConversationItem): boolean {
    if (!SdkEventProcessor.isSdkEvent(conversationItem)) {
      return false;
    }

    // Don't display delta events - they're handled by real-time streaming
    if (conversationItem.type?.endsWith('.delta')) {
      return false;
    }

    // Display completed items and state changes
    return conversationItem.type?.endsWith('.done') ||
           conversationItem.type?.endsWith('.added') ||
           conversationItem.type?.includes('.web_search_call.') ||
           conversationItem.type?.includes('.mcp_call.') || false;
  }
}
