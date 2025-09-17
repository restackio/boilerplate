"use client";

import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";
import { ConversationCard } from "./conversation-card";
import { StatusIcon } from "@workspace/ui/components/status-indicators";

interface TaskCardErrorProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardError({ item, onClick }: TaskCardErrorProps) {
  const { errorDetails, textContent, timestamp } = useConversationItem(item);

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  if (!errorDetails) {
    return (
      <ConversationCard
        item={item}
        onClick={handleClick}
        className="border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status="error" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-destructive">
              Unknown Error: {textContent || "An unknown error occurred"}
            </span>
          </div>
          {timestamp && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{timestamp}</span>
          )}
        </div>
      </ConversationCard>
    );
  }

  const errorTypeFormatted = errorDetails.error_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <ConversationCard
      item={item}
      onClick={handleClick}
      className="border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <StatusIcon status="error" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-destructive">
            {errorTypeFormatted}: {errorDetails.error_message}
          </span>
        </div>
      </div>
    </ConversationCard>
  );
}
