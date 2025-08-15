"use client";

import { ConversationItem } from "../types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";

interface TaskCardReasoningProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardReasoning({ item, onClick }: TaskCardReasoningProps) {
  // Get reasoning content from various possible locations
  const rawItem = item.rawData?.item as { content?: string; summary?: string[] } | undefined;
  const reasoningContent = item.content || 
                          rawItem?.content || 
                          (rawItem?.summary && Array.isArray(rawItem.summary) ? rawItem.summary.join(' ') : "") ||
                          "";

  const hasContent = reasoningContent && reasoningContent.trim().length > 0;

  return (
    <Card 
      className="w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={() => onClick?.(item)}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Agent Reasoning
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {item.status === "in-progress" && (
          <div className="text-xs text-muted-foreground">
            Agent is thinking about the next steps...
          </div>
        )}
        
        {item.status === "completed" && hasContent && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Reasoning:</p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
              {reasoningContent.substring(0, 500)}{reasoningContent.length > 500 && "..."}
            </pre>
          </div>
        )}
        
        {item.status === "completed" && !hasContent && (
          <div className="text-xs text-muted-foreground">
            Agent completed reasoning step
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-3">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {item.status}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}
