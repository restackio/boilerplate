"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Loader2 } from "lucide-react";
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
 * Base card component for all conversation items
 * Provides consistent styling, header, footer, and click handling
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

  const handleClick = () => {
    if (!isProcessing && onClick) {
      onClick(item);
    }
  };

  return (
    <Card 
      className={`w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
        isProcessing ? "opacity-75 pointer-events-none" : ""
      } ${className}`}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {displayTitle}
          {isProcessing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {showChevron && !isProcessing && (
            <div className="ml-auto">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      {children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
      
      {actions && (
        <CardContent className="pt-0">
          {actions}
        </CardContent>
      )}

      <CardFooter className="pt-3">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {timestamp}
          </span>
          {shouldShowStatusBadge && (
            <Badge variant="secondary" className={`text-xs ${statusColor}`}>
              {status}
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
