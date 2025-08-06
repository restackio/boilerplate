"use client";

import { ConversationItem } from "../types";

interface ConversationMessageProps {
  item: ConversationItem;
}

export function ConversationMessage({ item }: ConversationMessageProps) {
  return (
    <div
      className={`flex ${item.type === "user" ? "justify-end" : "justify-start"}`}
    >
      <div className="flex items-start space-x-2 max-w-[85%]">
        <div
          className={`p-3 rounded-lg ${
            item.type === "user"
              ? "bg-gray-100 dark:bg-gray-800"
              : item.type === "assistant"
                ? "bg-transparent"
                : item.type === "thinking"
                  ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                  : "bg-muted"
          } ${item.isStreaming ? 'border-l-4 border-l-blue-500' : ''}`}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            {item.content}
            {item.isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse opacity-90" 
                    style={{ animation: 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs opacity-70">
              {new Date(item.timestamp).toLocaleTimeString()}
            </p>
            {item.isStreaming && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-500">typing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 