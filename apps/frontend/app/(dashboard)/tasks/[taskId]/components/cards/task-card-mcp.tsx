"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";
import { ContentSection, CodeBlock, ApprovalActions } from "@workspace/ui/components";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@workspace/ui/components/ui/collapsible";
import { Shimmer } from "@workspace/ui/components/ai-elements/shimmer";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";

interface TaskCardMcpProps {
  item: ConversationItem;
  onApprove?: (itemId: string) => void;
  onDeny?: (itemId: string) => void;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardMcp({ item, onApprove, onDeny, onClick }: TaskCardMcpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    toolName,
    serverLabel,
    toolArguments,
    isCompleted,
    isFailed,
    shouldShowApprovalButtons,
    approvalId,
  } = useConversationItem(item);
  
  const duration = typeof item.duration_seconds === 'number' 
    ? item.duration_seconds 
    : undefined;

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

  // Get action description
  const getActionDescription = () => {
    if (item.type === "mcp_approval_request") {
      return shouldShowApprovalButtons ? "approval required" : "approved";
    }
    if (item.type === "mcp_list_tools") {
      return "listed tools";
    }
    if (isCompleted) return "completed";
    if (isFailed) return "failed";
    return "calling";
  };

  const isPending = !isCompleted && !isFailed;

  return (
    <Collapsible 
      className="not-prose mb-4" 
      open={isOpen} 
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground text-sm">
        <p className="flex-1 text-left">
          {isPending ? (
            <Shimmer>{toolName}</Shimmer>
          ) : (
            <span>{toolName}</span>
          )}
          {serverLabel && <span className="opacity-70"> ({serverLabel})</span>}
          {" · "}
          <span className="opacity-70">{getActionDescription()}</span>
          {duration && duration > 0 && (
            <>
              {" · "}
              <span className="opacity-60">{duration}s</span>
            </>
          )}
        </p>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform flex-shrink-0",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
      </CollapsibleTrigger>
      
      <CollapsibleContent
        className={cn(
          'mt-4 text-sm',
          'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in'
        )}
      >
        <div className="space-y-3 pl-4">
          {shouldShowApprovalButtons && (
            <ApprovalActions
              onApprove={handleApprove}
              onDeny={handleDeny}
              isProcessing={isProcessing}
            />
          )}

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

          {onClick && (
            <Button
              size="sm"
              variant="link"
              className="text-xs px-0"
              onClick={(e) => {
                e.stopPropagation();
                onClick(item);
              }}
            >
              View raw data
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}