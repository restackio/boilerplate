"use client";

import { StreamingItem, ConversationItem } from "./StreamingTypes";
import { ConversationMessage } from "../ConversationMessage";
import { TaskCardTool } from "../TaskCardTool";
import { TaskCardMcp } from "../TaskCardMcp";
import { TaskCardWebSearch } from "../TaskCardWebSearch";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@workspace/ui/components/ai-elements/reasoning";

interface StreamingItemRendererProps {
  item: StreamingItem;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
}

/**
 * Component responsible for rendering different types of streaming items
 * Converts StreamingItems to ConversationItems and delegates to existing components
 */
export function StreamingItemRenderer({ 
  item, 
  onApproveRequest,
  onDenyRequest,
  onCardClick 
}: StreamingItemRendererProps) {
  if (item.type === "text") {
    // Simple text message - same style as persistent messages
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "assistant",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.id,
        type: "message",
        role: "assistant",
        status: item.isStreaming ? "in-progress" : "completed",
        content: [{ type: "output_text", text: item.content }]
      }
    };
    return <ConversationMessage item={conversationItem} />;
  } 
  
  if (item.type === "tool-call" || item.type === "tool-list") {
    // Tool card - same style as persistent cards
    const conversationItem: ConversationItem = {
      id: item.id,
      type: item.type === "tool-call" ? "tool-call" : "tool-list",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.id,
        type: item.type === "tool-call" ? "mcp_call" : "mcp_list_tools",
        name: item.toolName,
        arguments: item.toolArguments,
        output: item.toolOutput,
        server_label: item.serverLabel,
        status: item.status
      }
    };
    return <TaskCardTool item={conversationItem} onClick={onCardClick || (() => {})} />;
  }
  
  if (item.type === "mcp-approval") {
    // Approval card - same style as persistent cards
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "mcp-approval-request",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.id,
        type: "mcp_approval_request",
        name: item.toolName,
        arguments: item.toolArguments,
        server_label: item.serverLabel,
        status: item.status
      }
    };
    return (
      <TaskCardMcp 
        item={conversationItem} 
        onApprove={(approvalId) => onApproveRequest?.(approvalId)}
        onDeny={(approvalId) => onDenyRequest?.(approvalId)}
        onClick={onCardClick}
      />
    );
  }

  if (item.type === "web-search") {
    // Web search card
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "web-search",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.id,
        type: "web_search_call",
        action: item.toolArguments,
        output: item.toolOutput,
        status: item.status
      }
    };
    return <TaskCardWebSearch item={conversationItem} onClick={onCardClick} />;
  }

  if (item.type === "reasoning") {
    // Reasoning component
    return (
      <Reasoning 
        isStreaming={item.isStreaming || item.status === "in-progress"}
        duration={item.duration || 0}
      >
        <ReasoningTrigger />
        <ReasoningContent>
          {item.content || "Agent is thinking..."}
        </ReasoningContent>
      </Reasoning>
    );
  }
  
  return null;
}
