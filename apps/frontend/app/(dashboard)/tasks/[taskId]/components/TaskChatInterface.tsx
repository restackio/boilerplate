import { useRef } from "react";
import { Bot } from "lucide-react";
import { ConversationItem } from "../types";
import { ChatInput } from "./ChatInput";
import { ConversationMessage } from "./ConversationMessage";
import { TaskCardMcp } from "./TaskCardMcp";
import { TaskCardTool } from "./TaskCardTool";
import { TaskCardWebSearch } from "./TaskCardWebSearch";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@workspace/ui/components/ai-elements/reasoning";


interface TaskChatInterfaceProps {
  conversation: ConversationItem[];
  chatMessage: string;
  onChatMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onCardClick: (item: ConversationItem) => void;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
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
  onApproveRequest,
  onDenyRequest,
  agentLoading,
  isThinking,
  showSplitView,
}: TaskChatInterfaceProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`${showSplitView ? 'w-1/2' : 'w-full max-w-4xl mx-auto'} flex flex-col bg-background`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet. Start a conversation!</p>
          </div>
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

// Render conversation items based on their type
function renderConversationItem(
  item: ConversationItem,
  onApproveRequest?: (itemId: string) => void,
  onDenyRequest?: (itemId: string) => void,
  onCardClick?: (item: ConversationItem) => void,
) {
  switch (item.type) {
    case 'reasoning':
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
        
    case 'assistant':
      return <ConversationMessage key={item.id} item={item} />;
      
    default:
      return <ConversationMessage key={item.id} item={item} />;
  }
} 