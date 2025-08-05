import { useRef, useEffect } from "react";
import { Bot, ChevronRight } from "lucide-react";
import { ConversationItem } from "../types";
import { ConversationFeed } from "./conversation-feed";
import { ChatInput } from "./chat-input";

interface TaskChatInterfaceProps {
  conversation: ConversationItem[];
  chatMessage: string;
  onChatMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onCardClick: (item: ConversationItem) => void;
  agentLoading: boolean;
  isThinking: boolean;
  showSplitView: boolean;
}

export function TaskChatInterface({
  conversation,
  chatMessage,
  onChatMessageChange,
  onSendMessage,
  onCardClick,
  agentLoading,
  isThinking,
  showSplitView,
}: TaskChatInterfaceProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  return (
    <div className={`${showSplitView ? 'w-1/2' : 'w-full max-w-4xl mx-auto'} flex flex-col bg-background`}>
      {/* Conversation Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          conversation.map((item) => (
            <div key={item.id}>
              {item.type === "tool-call" || item.type === "tool-list" ? (
                // Tool call card - clickable
                <div 
                  className="flex items-start space-x-3 p-3 bg-transparent rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => onCardClick(item)}
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
                    <div className="text-sm font-medium mt-1 whitespace-pre-wrap break-words">
                      {item.content}
                    </div>
                    {item.toolName && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Tool: {item.toolName}
                      </div>
                    )}
                    {item.toolOutput && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Completed
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Regular message bubble
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
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">{item.content}</div>
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
              )}
            </div>
          ))
        )}
        <div ref={conversationEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        message={chatMessage}
        onMessageChange={onChatMessageChange}
        onSendMessage={onSendMessage}
        isLoading={agentLoading}
        isThinking={isThinking}
        isPollingForAgent={false}
      />
    </div>
  );
} 