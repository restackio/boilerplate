import { useRef } from "react";
import { ConversationItem } from "../types";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { PromptInput } from "@workspace/ui/components/ai-elements/prompt-input";
import { Response } from "@workspace/ui/components/ai-elements/response";
import { TaskCardMcp, TaskCardTool, TaskCardWebSearch, TaskCardError } from "./cards";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@workspace/ui/components/ai-elements/reasoning";
import { useConversationItem } from "../hooks/use-conversation-item";


interface TaskChatInterfaceProps {
  conversation: ConversationItem[];
  chatMessage: string;
  onChatMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onCardClick: (item: ConversationItem) => void;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  agentLoading: boolean;
  showSplitView: boolean;
}

export function TaskChatInterface({
  conversation,
  chatMessage,
  onChatMessageChange,
  onSendMessage,
  onCardClick,
  onApproveRequest,
  onDenyRequest,
  agentLoading,
  showSplitView,
}: TaskChatInterfaceProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  console.log("conversation", conversation);

  return (
    <div className={`${showSplitView ? 'w-1/2' : 'w-full max-w-4xl mx-auto'} flex flex-col bg-background`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Start a conversation!"
          />
        ) : (
          <>
            {/* Render conversation items from RxJS store */}
            {conversation.map((item) => (
              <div key={item.id}>
                {renderConversationItem(item, onApproveRequest, onDenyRequest, onCardClick)}
              </div>
            ))}
            

          </>
        )}
        <div ref={conversationEndRef} />
      </div>

      <PromptInput
        prompt={chatMessage}
        onPromptChange={onChatMessageChange}
        onSubmit={onSendMessage}
        isLoading={agentLoading}
        isInitializing={false}
        placeholder="Request changes or ask a question"
        loadingPlaceholder="Agent is processing..."
        initializingPlaceholder="Waiting for agent to be ready..."
      />
    </div>
  );
}

// Render conversation items based on their type
function renderConversationItem(
  item: ConversationItem,
  onApproveRequest?: (itemId: string) => void,
  onDenyRequest?: (itemId: string) => void,
  onCardClick?: (item: ConversationItem) => void,
) {
  switch (item.type) {
    case 'error':
      return (
        <TaskCardError 
          key={item.id}
          item={item}
          onClick={onCardClick}
        />
      );

    case 'reasoning': {
      const reasoningText = item.openai_output?.summary?.map(s => s.text).join('\n\n') || '';
      return (
        <Reasoning 
          key={item.id}
          isStreaming={item.isStreaming || item.openai_output?.status === 'in-progress'}
          duration={0}
        >
          <ReasoningTrigger />
          <ReasoningContent>
            {reasoningText || "Agent is thinking..."}
          </ReasoningContent>
        </Reasoning>
      );
    }
        
    case 'mcp_approval_request':
      return (
        <TaskCardMcp 
          key={item.id}
          item={item}
          onApprove={() => onApproveRequest?.(item.openai_output?.id || item.id)}
          onDeny={() => onDenyRequest?.(item.openai_output?.id || item.id)}
          onClick={onCardClick}
        />
      );
        
    case 'mcp_list_tools':
      return (
        <TaskCardTool 
          key={item.id}
          item={item} 
          onClick={onCardClick || (() => {})}
        />
      );
        
    case 'mcp_call':
      // Render as TaskCardTool to show the execution result
      return (
        <TaskCardTool 
          key={item.id}
          item={item} 
          onClick={onCardClick || (() => {})}
        />
      );

    case 'web_search_call':
      return (
        <TaskCardWebSearch 
          key={item.id}
          item={item} 
          onClick={onCardClick}
        />
      );
        
    case 'assistant': {
      const { isUser, textContent, isReasoningType } = useConversationItem(item);
      return (
        <div key={item.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div className="flex items-start space-x-2 max-w-[85%]">
            <div
              className={
                isUser
                  ? "p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800"
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
      
    case 'response_status': {
      const responseStatus = item.openai_event?.response?.status || item.openai_event?.type?.split('.').pop();
      return (
        <div key={item.id} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          <span className={`${item.isStreaming ? 'animate-pulse' : ''}`}>
            {responseStatus === 'created' && '...'}
            {responseStatus === 'in_progress' && '...'}
            {responseStatus === 'completed' && ''}
            {item.openai_event?.type === 'response.created' && '...'}
          </span>
        </div>
      );
    }
      
    default: {
      const { isUser, textContent, isReasoningType } = useConversationItem(item);
      return (
        <div key={item.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div className="flex items-start space-x-2 max-w-[85%]">
            <div
              className={
                isUser
                  ? "p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800"
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
  }
} 