"use client";

import { ConversationItem } from "../types";
import { Response } from "@workspace/ui/components/ai-elements/response";
import { useConversationItem } from "../hooks/use-conversation-item";

interface ConversationMessageProps {
  item: ConversationItem;
}

export function ConversationMessage({ item }: ConversationMessageProps) {
  const { isUser, textContent, isReasoningType } = useConversationItem(item);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex items-start space-x-2 max-w-[85%]">
        <div
          className={
            isUser
              ? "p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
              : isReasoningType
                ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                : "bg-transparent"
          }
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            <Response>
              {textContent}
            </Response>
          </div>
        </div>
      </div>
    </div>
  );
} 