// Simplified conversation item that uses OpenAI structure directly
export interface ConversationItem {
  id: string;
  type: string;
  timestamp: string | null;
  openai_output: {
    id: string;
    type: string;
    role?: string; // Allow any role string
    status?: string;
    content?: Array<{ type: string; text: string; [key: string]: any }>;
    summary?: Array<{ type: string; text: string; [key: string]: any }>;
    name?: string;
    [key: string]: any; // Allow any other OpenAI fields
  };
  isStreaming?: boolean;
} 