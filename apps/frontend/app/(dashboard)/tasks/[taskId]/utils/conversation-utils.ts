import { ConversationItem } from "../types";

/**
 * Utility functions for working with conversation items
 * Provides consistent data access patterns across all components
 */

// Status-related utilities
export const getItemStatus = (item: ConversationItem): string => {
  // Check for errors first - MCP calls with errors should be marked as failed
  if (item.openai_output?.error || item.error) {
    return "failed";
  }

  // Check for failed MCP calls by event type - these come from response.mcp_call.failed events
  if (item.openai_event?.type === "response.mcp_call.failed") {
    return "failed";
  }

  // For MCP approval requests, check if they have a status first
  if (item.type === "mcp_approval_request") {
    // If there's an explicit status, use it
    if (item.openai_output?.status) {
      return item.openai_output.status;
    }
    // If no status, assume it's waiting for approval
    // Note: Auto-approved tools should have their status updated by the backend
    return "waiting-approval";
  }
  return item.openai_output?.status || "unknown";
};

export const isItemCompleted = (item: ConversationItem): boolean => {
  const status = getItemStatus(item);
  return status === "completed" || status === "success";
};

export const isItemFailed = (item: ConversationItem): boolean => {
  const status = getItemStatus(item);
  return status === "failed" || status === "error" || item.type === "error" || !!item.error;
};

export const isItemPending = (item: ConversationItem): boolean => {
  const status = getItemStatus(item);
  return status === "in-progress" || status === "pending" || status === "waiting-approval";
};

export const isItemWaitingApproval = (item: ConversationItem): boolean => {
  const status = getItemStatus(item);
  return status === "waiting-approval" || !status;
};

// Content extraction utilities
export const extractTextContent = (item: ConversationItem): string => {
  // Handle error items
  if (item.type === "error" || item.error) {
    return item.error?.error_message || "An error occurred";
  }

  // Handle MCP call errors
  if (item.openai_output?.error) {
    const error = item.openai_output.error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error.content && Array.isArray(error.content)) {
      return error.content.map((c: any) => c.text || c).join('\n'); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    if (error.message) {
      return `${error.type || 'Error'}: ${error.message}`;
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
  }

  // Handle failed MCP calls from response.mcp_call.failed events
  if (item.openai_event?.type === "response.mcp_call.failed") {
    // Extract error information from the event
    const eventData = item.openai_event as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return `MCP Call Failed: ${eventData.item_id || 'Unknown tool'} - ${eventData.error?.message || 'Unknown error'}`;
  }

  const output = item.openai_output;
  
  if (output?.content) {
    // Check if content is an array
    if (Array.isArray(output.content)) {
      // For messages, extract text from content array
      return output.content
        .map(c => c.text)
        .join("");
    } else if (typeof output.content === 'string') {
      // For direct string content
      return output.content;
    } else {
      // For other content types, convert to string
      return String(output.content);
    }
  } else if (output?.summary) {
    // Check if summary is an array
    if (Array.isArray(output.summary)) {
      // For reasoning, join summary texts
      return output.summary
        .map(s => s.text)
        .join("\n\n");
    } else if (typeof output.summary === 'string') {
      return output.summary;
    } else {
      return String(output.summary);
    }
  } else if (output?.role === "assistant" || output?.role === "user") {
    // For messages without content array, return empty string
    return "";
  } else {
    // For tool calls and other types, show a meaningful description
    return getDisplayTitle(item);
  }
};

export const extractToolName = (item: ConversationItem): string => {
  return item.openai_output?.name || "";
};

export const extractServerLabel = (item: ConversationItem): string => {
  return item.openai_output?.server_label || "";
};

export const extractToolArguments = (item: ConversationItem): Record<string, unknown> | string | undefined => {
  // For MCP approval requests, arguments come as a JSON string
  if (item.type === 'mcp_approval_request' && typeof item.openai_output?.arguments === 'string') {
    return item.openai_output.arguments;
  }
  return item.openai_output?.arguments;
};

export const extractToolOutput = (item: ConversationItem): unknown => {
  // Check for errors first - show error details for failed MCP calls
  if (item.openai_output?.error) {
    return item.openai_output.error;
  }
  
  // Handle failed MCP calls from response.mcp_call.failed events
  if (item.openai_event?.type === "response.mcp_call.failed") {
    const eventData = item.openai_event as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      error: true,
      message: eventData.error?.message || 'MCP call failed',
      type: 'mcp_call_failed',
      item_id: eventData.item_id,
      details: eventData
    };
  }
  
  return item.openai_output?.output || item.openai_output?.result;
};

// Type checking utilities
export const isUserMessage = (item: ConversationItem): boolean => {
  return item.openai_output?.role === "user";
};

export const isAssistantMessage = (item: ConversationItem): boolean => {
  return item.openai_output?.role === "assistant";
};

export const isToolCall = (item: ConversationItem): boolean => {
  return item.type === "mcp_call" || item.type === "mcp_list_tools";
};

export const isApprovalRequest = (item: ConversationItem): boolean => {
  return item.type === "mcp_approval_request";
};

export const isWebSearch = (item: ConversationItem): boolean => {
  return item.type === "web_search_call";
};

export const isReasoning = (item: ConversationItem): boolean => {
  return item.type === "reasoning";
};

export const isError = (item: ConversationItem): boolean => {
  return item.type === "error" || !!item.error;
};

// Formatting utilities
export const formatTimestamp = (timestamp: string | null): string => {
  return timestamp ? new Date(timestamp).toLocaleTimeString() : "";
};

export const formatFullTimestamp = (timestamp: string | null): string => {
  return timestamp ? new Date(timestamp).toLocaleString() : "Unknown";
};

// ID utilities for approval actions
export const getApprovalId = (item: ConversationItem): string => {
  return item.openai_output?.id || item.id;
};

// Display text utilities
export const getDisplayTitle = (item: ConversationItem): string => {
  // Handle error items
  if (item.type === "error" || item.error) {
    const source = item.error?.error_source || "unknown";
    const errorType = item.error?.error_type || "error";
    return `Error (${source}): ${errorType}`;
  }

  const toolName = extractToolName(item);
  const serverLabel = extractServerLabel(item);
  
  switch (item.type) {
    case "mcp_call":
      return `Call tool: ${toolName}${serverLabel ? ` (${serverLabel})` : ""}`;
    case "mcp_list_tools":
      return `List tools${serverLabel ? ` (${serverLabel})` : ""}`;
    case "mcp_approval_request":
      return `Approval required: ${toolName}${serverLabel ? ` (${serverLabel})` : ""}`;
    case "web_search_call": {
      const query = item.openai_output?.action?.query;
      return `Web Search: ${query || "Searching..."}`;
    }
    case "reasoning":
      return "Agent Reasoning";
    default:
      return toolName;
  }
};

// Status styling utilities
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "completed":
    case "success":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
    case "failed":
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
    case "active":
    case "in-progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    case "waiting":
    case "waiting-approval":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
    case "closed":
    case "cancelled":
      return "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300";
    case "open":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
    default:
      return "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300";
  }
};

export const getStatusIconClass = (status: string): string => {
  switch (status) {
    case "completed":
    case "success":
      return "w-2 h-2 bg-green-500 rounded-full";
    case "failed":
    case "error":
      return "w-2 h-2 bg-red-500 rounded-full";
    case "in-progress":
    case "pending":
    case "waiting-approval":
      return "w-2 h-2 bg-yellow-500 rounded-full";
    case "cancelled":
      return "w-2 h-2 bg-orange-500 rounded-full";
    default:
      return "w-2 h-2 bg-neutral-500 rounded-full";
  }
};
