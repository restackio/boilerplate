"use client";

import { ConversationItem } from "../types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";

interface TaskCardWebSearchProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardWebSearch({ item, onClick }: TaskCardWebSearchProps) {
  const rawItem = item.rawData?.item as { action?: { query?: string } } | undefined;
  const toolArgs = typeof item.toolArguments === 'object' && item.toolArguments !== null ? item.toolArguments as Record<string, unknown> : {};
  const searchQuery = (toolArgs.query as string) || rawItem?.action?.query;
  const searchResults = item.toolOutput;

  return (
    <Card 
      className="w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={() => onClick?.(item)}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Web Search: {searchQuery || "Searching..."}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {searchQuery && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Query:</p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto">
              {searchQuery}
            </pre>
          </div>
        )}
        
        {item.status === "completed" && searchResults && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Results:</p>
            <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border">
              {typeof searchResults === 'object' && searchResults !== null ? (
                Array.isArray(searchResults) ? (
                  `Found ${searchResults.length} results`
                ) : 'results' in searchResults ? (
                  `Found ${Array.isArray(searchResults.results) ? searchResults.results.length : 'multiple'} results`
                ) : (
                  "Search completed"
                )
              ) : (
                String(searchResults).substring(0, 200) + (String(searchResults).length > 200 ? "..." : "")
              )}
            </div>
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
