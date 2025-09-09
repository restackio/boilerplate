// OpenAI API types
export interface OpenAIContent {
  type: string;
  text: string;
  annotations?: unknown[];
  logprobs?: unknown[];
  [key: string]: unknown;
}

export interface OpenAISummary {
  type: string;
  text: string;
  [key: string]: unknown;
}

export interface OpenAIResponse {
  id: string;
  created_at?: number;
  status: string;
  model?: string;
  output?: unknown[];
  [key: string]: unknown;
}

export interface OpenAIEvent {
  type: string;
  sequence_number?: number;
  created_at?: string;
  item_id?: string;
  output_index?: number;
  timestamp?: string;
  item?: {
    id: string;
    type: string;
    role?: string;
    status?: string;
    content?: OpenAIContent[];
    summary?: OpenAISummary[];
    [key: string]: unknown;
  };
  response?: OpenAIResponse;
  text?: string;
  [key: string]: unknown;
}

// Error details for error events
export interface ErrorDetails {
  id: string;
  type: string;
  error_type: string;
  error_message: string;
  error_source: "openai" | "mcp" | "backend" | "network";
  error_details?: Record<string, unknown>;
}

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
    content?: OpenAIContent[];
    summary?: OpenAISummary[];
    name?: string;
    arguments?: Record<string, unknown> | string;
    output?: unknown;
    result?: unknown;
    tools?: Array<{ name: string; [key: string]: unknown }>;
    action?: {
      query?: string;
      type?: string;
      [key: string]: unknown;
    };
    server_label?: string;
    approval_request_id?: string;
    [key: string]: unknown; // Allow any other OpenAI fields
  } | null;
  // For SDK events from agent state
  openai_event?: OpenAIEvent;
  // For error events
  error?: ErrorDetails;
  isStreaming?: boolean;
} 