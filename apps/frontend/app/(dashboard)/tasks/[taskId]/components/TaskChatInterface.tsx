import { useRef } from "react";
import { Bot } from "lucide-react";
import { ConversationItem } from "../types";
import { ChatInput } from "./ChatInput";
import { TaskCardMcp } from "./TaskCardMcp";
import { TaskCardTool } from "./TaskCardTool";
import { TaskCardWebSearch } from "./TaskCardWebSearch";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@workspace/ui/components/ai-elements/reasoning";
import { ConversationMessage } from "./ConversationMessage";
import { StreamItems } from "./TaskStreamItems";

interface TaskChatInterfaceProps {
  conversation: ConversationItem[];
  persistentItemIds: Set<string>;
  agentResponses: any[];
  chatMessage: string;
  onChatMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onCardClick: (item: ConversationItem) => void;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  agentLoading: boolean;
  isThinking: boolean;
  showSplitView: boolean;
  taskAgentTaskId?: string | null;
}

export function TaskChatInterface({
  conversation,
  persistentItemIds,
  agentResponses,
  chatMessage,
  onChatMessageChange,
  onSendMessage,
  onCardClick,
  onApproveRequest,
  onDenyRequest,
  agentLoading,
  isThinking,
  showSplitView,
  taskAgentTaskId,
}: TaskChatInterfaceProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  console.log(conversation);

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
            {conversation.map((item) => (
              <div key={item.id}>
                {item.type === "mcp_call" || item.type === "mcp_list_tools" ? (
                  <TaskCardTool item={item} onClick={onCardClick} />
                ) : item.type === "mcp_approval_request" ? (
                  <TaskCardMcp 
                    item={item} 
                    onApprove={(itemId) => onApproveRequest?.(itemId)} 
                    onDeny={(itemId) => onDenyRequest?.(itemId)}
                    onClick={onCardClick}
                  />
                ) : item.type === "web_search_call" ? (
                  <TaskCardWebSearch item={item} onClick={onCardClick} />
                ) : item.type === "reasoning" ? (
                  <Reasoning 
                    isStreaming={item.openai_output.status === "in-progress"}
                    duration={0}
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>
                      {item.openai_output.summary?.map(s => s.text).join("\n\n") || "Agent is thinking...\n\n"}
                    </ReasoningContent>
                  </Reasoning>
                ) : (
                  <ConversationMessage item={item} />
                )}
              </div>
            ))}
            {conversation.length === 1 && conversation.length < 2 && agentResponses.length === 0 && (
              <Reasoning 
                isStreaming={false}
                duration={0}
              >
                <ReasoningTrigger />
                <ReasoningContent>
                  Agent is thinking...
                </ReasoningContent>
              </Reasoning>
            )}
            
            {/* Stream Items */}
            <StreamItems
              agentResponses={agentResponses}
              persistentItemIds={persistentItemIds}
              taskAgentTaskId={taskAgentTaskId}
              onApproveRequest={onApproveRequest}
              onDenyRequest={onDenyRequest}
              onCardClick={onCardClick}
            />
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