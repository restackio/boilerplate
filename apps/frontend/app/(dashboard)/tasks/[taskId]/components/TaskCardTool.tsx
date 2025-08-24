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
  const output = item.openai_output;
  const toolName = output.name || "Unknown tool";
  const serverLabel = output.server_label || "";
  const status = output.status || "active";
  
  // Extract output content
  let outputContent = "";
  if (output.output) {
    outputContent = typeof output.output === 'string' ? output.output : JSON.stringify(output.output, null, 2);
  }
  
  return (
    <Card 
      className="w-full border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors space-y-2"
      onClick={() => onClick(item)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {item.type === "mcp_call" ? `Call tool: ${toolName}` : `List tools`} {serverLabel && `(${serverLabel})`}
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {outputContent && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Output:</p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto max-h-40">
              {outputContent}
            </pre>
          </div>
        )}
        {output.tools && Array.isArray(output.tools) && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Available tools ({output.tools.length}):</p>
            <div className="space-y-1">
              {output.tools.slice(0, 3).map((tool: any, index: number) => (
                <div key={index} className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border">
                  <strong>{tool.name}</strong>: {tool.description}
                </div>
              ))}
              {output.tools.length > 3 && (
                <p className="text-xs text-muted-foreground">... and {output.tools.length - 3} more</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp || "").toLocaleTimeString()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
} 