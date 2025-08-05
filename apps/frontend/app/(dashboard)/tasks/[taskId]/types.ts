// Types for conversation items
export interface ConversationItem {
  id: string;
  type: "user" | "assistant" | "system" | "tool-call" | "tool-list" | "thinking";
  content: string;
  timestamp: string;
  agent?: string;
  status?: "completed" | "in-progress" | "pending" | "failed";
  details?: string;
  toolName?: string;
  toolOutput?: string;
  isStreaming?: boolean;
  rawData?: any; // For storing the original response data
} 