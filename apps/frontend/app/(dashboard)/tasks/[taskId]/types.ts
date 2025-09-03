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
    arguments?: Record<string, unknown>;
    output?: unknown;
    result?: unknown;
    tools?: Array<{ name: string; [key: string]: unknown }>;
    action?: {
      query?: string;
      type?: string;
      [key: string]: unknown;
    };
    server_label?: string;
    [key: string]: any; // Allow any other OpenAI fields
  };
  // For SDK events from agent state
  openai_event?: {
    sequence_number?: number;
    created_at?: string;
    item_id?: string;
    output_index?: number;
    item?: any;
    text?: string;
    [key: string]: any;
  };
  isStreaming?: boolean;
} 