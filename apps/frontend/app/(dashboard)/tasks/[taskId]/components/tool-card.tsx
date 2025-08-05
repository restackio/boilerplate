"use client";

import { ChevronRight } from "lucide-react";
import { ConversationItem } from "../types";

interface ToolCardProps {
  item: ConversationItem;
  onClick: (item: ConversationItem) => void;
}

export function ToolCard({ item, onClick }: ToolCardProps) {
  return (
    <div 
      className="flex items-start space-x-3 p-3 bg-transparent rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            {item.type === "tool-call" ? "Tool Call" : "Available Tools"}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="text-sm font-medium mt-1">
          {item.content}
        </div>
        {item.toolName && (
          <div className="text-xs text-muted-foreground mt-1">
            Tool: {item.toolName}
          </div>
        )}
      </div>
    </div>
  );
} 