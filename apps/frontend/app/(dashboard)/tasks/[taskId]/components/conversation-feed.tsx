"use client";

import { useRef, useEffect } from "react";
import { Bot, Loader2 } from "lucide-react";
import { ConversationItem } from "../types";
import { ConversationMessage } from "./conversation-message";
import { ToolCard } from "./tool-card";

interface ConversationFeedProps {
  conversation: ConversationItem[];
  isPollingForAgent: boolean;
  taskAgentTaskId?: string | null;
  onCardClick: (item: ConversationItem) => void;
}

export function ConversationFeed({ 
  conversation, 
  isPollingForAgent, 
  taskAgentTaskId, 
  onCardClick 
}: ConversationFeedProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {conversation.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet. Start a conversation!</p>
          {!taskAgentTaskId && (
            <div className="mt-4">
              {isPollingForAgent ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Waiting for agent to be ready...</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Agent is being initialized...
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        conversation.map((item) => (
          <div key={item.id}>
            {item.type === "tool-call" || item.type === "tool-list" ? (
              <ToolCard item={item} onClick={onCardClick} />
            ) : (
              <ConversationMessage item={item} />
            )}
          </div>
        ))
      )}
      <div ref={conversationEndRef} />
    </div>
  );
} 