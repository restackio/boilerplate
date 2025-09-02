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
    // Simple text message - match persistent message format
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "assistant",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.itemId,
        type: "message",
        role: "assistant",
        status: item.isStreaming ? "in-progress" : "completed",
        content: [{ type: "output_text", text: item.content }]
      }
    };
    return <ConversationMessage item={conversationItem} />;
  } 
  
  if (item.type === "tool-call") {
    // MCP tool call - match persistent format
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "mcp_call",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.itemId,
        type: "mcp_call",
        name: item.toolName,
        arguments: item.toolArguments,
        output: item.toolOutput,
        server_label: item.serverLabel,
        status: item.status || (item.isStreaming ? "in-progress" : "completed")
      }
    };
    return <TaskCardTool item={conversationItem} onClick={onCardClick || (() => {})} />;
  }
  
  if (item.type === "tool-list") {
    // MCP tool list - match persistent format
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "mcp_list_tools",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.itemId,
        type: "mcp_list_tools",
        tools: (item.rawData?.item as any)?.tools || [],
        server_label: item.serverLabel,
        status: item.status || (item.isStreaming ? "in-progress" : "completed")
      }
    };
    return <TaskCardTool item={conversationItem} onClick={onCardClick || (() => {})} />;
  }
  
  if (item.type === "mcp-approval") {
    // MCP approval request - match persistent format
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "mcp_approval_request",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.itemId,
        type: "mcp_approval_request",
        name: item.toolName,
        arguments: item.toolArguments,
        server_label: item.serverLabel,
        status: item.status || "waiting-approval"
      }
    };
    return (
      <TaskCardMcp 
        item={conversationItem} 
        onApprove={(approvalId) => onApproveRequest?.(item.itemId)}
        onDeny={(approvalId) => onDenyRequest?.(item.itemId)}
        onClick={onCardClick}
      />
    );
  }

  if (item.type === "web-search") {
    // Web search call - match persistent format
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "web_search_call",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.itemId,
        type: "web_search_call",
        action: item.toolArguments,
        output: item.toolOutput,
        result: item.toolOutput,
        status: item.status || (item.isStreaming ? "in-progress" : "completed")
      }
    };
    return <TaskCardWebSearch item={conversationItem} onClick={onCardClick} />;
  }

  if (item.type === "reasoning") {
    // Reasoning component - match persistent format
    const conversationItem: ConversationItem = {
      id: item.id,
      type: "reasoning",
      timestamp: item.timestamp,
      isStreaming: item.isStreaming,
      openai_output: {
        id: item.itemId,
        type: "reasoning",
        status: item.status || (item.isStreaming ? "in-progress" : "completed"),
        summary: item.content ? [{ type: "text", text: item.content }] : []
      }
    };
    
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
