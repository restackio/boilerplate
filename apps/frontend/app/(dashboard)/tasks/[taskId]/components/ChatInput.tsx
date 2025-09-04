"use client";

import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  message: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isPollingForAgent: boolean;
}

export function ChatInput({
  message,
  onMessageChange,
  onSendMessage,
  isLoading,
  isPollingForAgent
}: ChatInputProps) {
  return (
    <div className="p-4 border-t bg-background">
      <div className="flex space-x-2">
        <Textarea
          placeholder={
            isPollingForAgent ? "Waiting for agent to be ready..." :
            isLoading ? "Agent is processing..." : 
            "Request changes or ask a question"
          }
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onMessageChange(e.target.value)
          }
          className="flex-1 min-h-[40px] max-h-[80px]"
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          disabled={isLoading || isPollingForAgent}
        />
        <Button 
          onClick={onSendMessage}
          disabled={!message.trim() || isLoading || isPollingForAgent}
          className="px-4"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 