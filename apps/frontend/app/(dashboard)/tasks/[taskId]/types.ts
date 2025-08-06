// Types for conversation items
export interface ConversationItem {
  id: string;
  type: "user" | "assistant" | "system" | "tool-call" | "tool-list" | "thinking" | "mcp-approval-request";
  content: string;
  timestamp: string;
  agent?: string;
  status?: "completed" | "in-progress" | "pending" | "failed" | "waiting-approval";
  details?: string;
  toolName?: string;
  toolOutput?: string;
  toolArguments?: string;
  serverLabel?: string;
  isStreaming?: boolean;
  rawData?: any; // For storing the original response data
} 