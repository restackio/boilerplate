import { ConversationItem } from "../types";
import {
  getItemStatus,
  isItemCompleted,
  isItemFailed,
  isItemPending,
  isItemWaitingApproval,
  extractTextContent,
  extractToolName,
  extractServerLabel,
  extractToolArguments,
  extractToolOutput,
  isUserMessage,
  isAssistantMessage,
  isToolCall,
  isApprovalRequest,
  isWebSearch,
  isReasoning,
  isError,
  formatTimestamp,
  formatFullTimestamp,
  getApprovalId,
  getDisplayTitle,
  getStatusColor,
  getStatusIconClass,
} from "../utils/conversation-utils";

/**
 * Custom hook that provides a consistent interface for working with conversation items
 * Encapsulates all the common operations and computations
 */
export function useConversationItem(item: ConversationItem) {
  // Status information
  const status = getItemStatus(item);
  const isCompleted = isItemCompleted(item);
  const isFailed = isItemFailed(item);
  const isPending = isItemPending(item);
  const isWaitingApproval = isItemWaitingApproval(item);

  // Content extraction
  const textContent = extractTextContent(item);
  const toolName = extractToolName(item);
  const serverLabel = extractServerLabel(item);
  const toolArguments = extractToolArguments(item);
  const toolOutput = extractToolOutput(item);

  // Type checking
  const isUser = isUserMessage(item);
  const isAssistant = isAssistantMessage(item);
  const isToolCallType = isToolCall(item);
  const isApproval = isApprovalRequest(item);
  const isWebSearchType = isWebSearch(item);
  const isReasoningType = isReasoning(item);
  const isErrorType = isError(item);

  // Formatting
  const timestamp = formatTimestamp(item.timestamp);
  const fullTimestamp = formatFullTimestamp(item.timestamp);

  // Actions
  const approvalId = getApprovalId(item);

  // Display
  const displayTitle = getDisplayTitle(item);
  const statusColor = getStatusColor(status);
  const statusIconClass = getStatusIconClass(status);

  // Computed properties
  const shouldShowApprovalButtons = isApproval && isWaitingApproval;
  const shouldShowStatusBadge = status !== "unknown";

  return {
    // Raw item
    item,
    
    // Status
    status,
    isCompleted,
    isFailed,
    isPending,
    isWaitingApproval,
    
    // Content
    textContent,
    toolName,
    serverLabel,
    toolArguments,
    toolOutput,
    
    // Type checking
    isUser,
    isAssistant,
    isToolCallType,
    isApproval,
    isWebSearchType,
    isReasoningType,
    isErrorType,
    
    // Error details
    errorDetails: item.error,
    
    // Formatting
    timestamp,
    fullTimestamp,
    
    // Actions
    approvalId,
    
    // Display
    displayTitle,
    statusColor,
    statusIconClass,
    
    // Computed
    shouldShowApprovalButtons,
    shouldShowStatusBadge,
  };
}
