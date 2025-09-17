"use client";

import { ReactNode } from "react";
import { ActionableCard } from "@workspace/ui/components";
import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";

interface ConversationCardProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
  children?: ReactNode;
  actions?: ReactNode;
  isProcessing?: boolean;
  showChevron?: boolean;
  className?: string;
}

/**
 * Conversation-specific card component built on ActionableCard
 * Provides conversation item integration and domain-specific logic
 */
export function ConversationCard({
  item,
  onClick,
  children,
  actions,
  isProcessing = false,
  showChevron = false,
  className = "",
}: ConversationCardProps) {
  const {
    displayTitle,
    timestamp,
    status,
    statusColor,
    shouldShowStatusBadge,
  } = useConversationItem(item);

  const handleClick = onClick ? () => onClick(item) : undefined;

  return (
    <ActionableCard
      title={displayTitle}
      timestamp={timestamp}
      status={shouldShowStatusBadge ? {
        label: status,
        variant: "secondary",
        className: statusColor,
      } : undefined}
      isProcessing={isProcessing}
      showChevron={showChevron}
      onClick={handleClick}
      variant={onClick ? "interactive" : "default"}
      className={className}
      actions={actions}
    >
      {children}
    </ActionableCard>
  );
}
