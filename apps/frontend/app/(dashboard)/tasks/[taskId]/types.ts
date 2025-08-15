// Types for conversation items
export interface ConversationItem {
  id: string;
  type: "user" | "assistant" | "system" | "tool-call" | "tool-list" | "thinking" | "mcp-approval-request" | "web-search" | "reasoning";
  content: string;
  timestamp: string;
  agent?: string;
  status?: "completed" | "in-progress" | "pending" | "failed" | "waiting-approval" | "searching";
  details?: string;
  toolName?: string;
  toolOutput?: string | object;
  toolArguments?: string | Record<string, unknown>;
  serverLabel?: string;
  isStreaming?: boolean;
  rawData?: Record<string, unknown>; // For storing the original response data
} 