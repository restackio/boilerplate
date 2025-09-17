"use client";

import { useState } from "react";

import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";
import { ConversationCard } from "./conversation-card";
import { ContentSection, CodeBlock, ApprovalActions, StatusDisplay } from "@workspace/ui/components";

interface TaskCardMcpProps {
  item: ConversationItem;
  onApprove?: (itemId: string) => void;
  onDeny?: (itemId: string) => void;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardMcp({ item, onApprove, onDeny, onClick }: TaskCardMcpProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    toolArguments,
    isCompleted,
    isFailed,
    shouldShowApprovalButtons,
    approvalId,
    status,
  } = useConversationItem(item);



  const handleApprove = async () => {
    if (!onApprove) return;
    setIsProcessing(true);
    try {
      await onApprove(approvalId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!onDeny) return;
    setIsProcessing(true);
    try {
      await onDeny(approvalId);
    } finally {
      setIsProcessing(false);
    }
  };

  const actions = shouldShowApprovalButtons ? (
    <ApprovalActions
      onApprove={handleApprove}
      onDeny={handleDeny}
      isProcessing={isProcessing}
    />
  ) : (
    <div className="flex items-center justify-start pt-3">
      <StatusDisplay 
        status={status} 
        isCompleted={isCompleted} 
        isFailed={isFailed} 
      />
    </div>
  );

  return (
    <ConversationCard
      item={item}
      onClick={onClick}
      isProcessing={isProcessing}
      actions={actions}
    >
      {toolArguments && (
        <ContentSection label="Arguments">
          <CodeBlock 
            content={typeof toolArguments === 'string' 
              ? (() => {
                  try {
                    return JSON.parse(toolArguments);
                  } catch {
                    return toolArguments;
                  }
                })()
              : toolArguments
            }
          />
        </ContentSection>
      )}
    </ConversationCard>
  );
}