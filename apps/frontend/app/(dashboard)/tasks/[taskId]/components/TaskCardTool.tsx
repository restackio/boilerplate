"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { ConversationItem } from "../types";

interface TaskCardToolProps {
  item: ConversationItem;
  onClick: (item: ConversationItem) => void;
}

export function TaskCardTool({ item, onClick }: TaskCardToolProps) {
  return (
    <Card 
      className="w-full border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {item.type === "tool-call" ? "Call tool:" : "List tools"} {item.serverLabel}  {item.toolName}
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.type !== "tool-call" &&item.content && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Output:</p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto">
              {item.content}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {item.status || "active"}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
} 