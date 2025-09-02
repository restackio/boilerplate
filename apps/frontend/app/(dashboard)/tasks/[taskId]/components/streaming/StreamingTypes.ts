/**
 * Type definitions for streaming functionality
 * Separates streaming types from main conversation types
 */

export interface Tool {
  name: string;
  [key: string]: unknown;
}

export interface StreamResponse {
  type: string;
  sequence_number?: number;
  delta?: string;
  text?: string;
  item_id?: string;
  item?: {
    id?: string;
    type?: string;
    name?: string;
    arguments?: Record<string, unknown>;
    output?: unknown;
    result?: unknown;
    tools?: Tool[];
    content?: string;
    summary?: string[];
    status?: string;
    action?: {
      query?: string;
      type?: string;
    };
    server_label?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface StreamingItem {
  id: string;
  itemId: string;
  type: "text" | "tool-call" | "tool-list" | "mcp-approval" | "web-search" | "reasoning";
  content: string;
  isStreaming: boolean;
  timestamp: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  toolOutput?: unknown;
  serverLabel?: string;
  status?: string;
  startTime?: number;
  duration?: number;
  rawData?: Record<string, unknown>;
}

export interface StreamItemsProps {
  agentResponses: StreamResponse[];
  persistentItemIds: Set<string>;
  taskAgentTaskId?: string | null;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
  // Optional: SDK events from agent state for enhanced persistence
  conversation?: ConversationItem[];
}

// Re-export from main types
export type { ConversationItem } from "../../types";
