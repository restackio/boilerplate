"use client";

import { ConversationItem } from "../types";
import { Response } from "@workspace/ui/components/ai-elements/response";

interface ConversationMessageProps {
  item: ConversationItem;
}

export function ConversationMessage({ item }: ConversationMessageProps) {
  const output = item.openai_output;
  const isUser = output.role === "user";
  
  // Extract content based on OpenAI structure
  let content = "";
  
  if (output.content) {
    // For messages, extract text from content array
    content = output.content
      .map(c => c.text)
      .join("");
  } else if (output.summary) {
    // For reasoning, join summary texts
    content = output.summary
      .map(s => s.text)
      .join("\n\n");
  } else {
    // Fallback for other types
    content = `${output.type}: ${output.name || output.id}`;
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex items-start space-x-2 max-w-[85%]">
        <div
          className={
            isUser
              ? "p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
              : output.type === "reasoning"
                ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                : "bg-transparent"
          }
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            <Response>
              {content}
            </Response>
          </div>
        </div>
      </div>
    </div>
  );
} 