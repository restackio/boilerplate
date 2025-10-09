import { useRef, useMemo } from "react";
import { ConversationItem } from "../types";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { PromptInput } from "@workspace/ui/components/ai-elements/prompt-input";
import { Response } from "@workspace/ui/components/ai-elements/response";
import { TaskCardMcp, TaskCardTool, TaskCardWebSearch, TaskCardError } from "./cards";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@workspace/ui/components/ai-elements/reasoning";
import { useConversationItem } from "../hooks/use-conversation-item";
import { TaskTodosList } from "./task-todos-list";
import { TaskSubtasksList } from "./task-subtasks-list";
import { FeedbackButtons } from "./feedback-buttons";


interface TaskChatInterfaceProps {
  conversation: ConversationItem[];
  chatMessage: string;
  onChatMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onCardClick?: (item: ConversationItem) => void;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  agentLoading: boolean;
  showSplitView: boolean;
  responseState?: unknown; // Agent state for real-time updates
  taskId?: string;
  agentId?: string;
  workspaceId?: string;
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
  responseState,
  taskId,
  agentId,
  workspaceId,
}: TaskChatInterfaceProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Extract todos and subtasks from agent state (real-time for all clients)
  const todos = useMemo(() => {
    if (!responseState || typeof responseState !== 'object') {
      return null;
    }
    const state = responseState as { todos?: unknown[] };
    return state.todos && state.todos.length > 0 ? state.todos : null;
  }, [responseState]);

  const subtasks = useMemo(() => {
    if (!responseState || typeof responseState !== 'object') {
      return null;
    }
    const state = responseState as { subtasks?: unknown[] };
    return state.subtasks && state.subtasks.length > 0 ? state.subtasks : null;
  }, [responseState]);

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
            {conversation.map((item, index) => (
              <div key={item.id}>
                <RenderConversationItem
                  item={item}
                  onApproveRequest={onApproveRequest}
                  onDenyRequest={onDenyRequest}
                  onCardClick={onCardClick}
                  taskId={taskId}
                  agentId={agentId}
                  workspaceId={workspaceId}
                  responseIndex={index}
                  messageCount={conversation.length}
                />
              </div>
            ))}
            

          </>
        )}
        <div ref={conversationEndRef} />
      </div>

      <div className="p-4 space-y-2">
          {/* Persistent Subtasks List above input - real-time from agent state */}
          {subtasks && <TaskSubtasksList subtasks={subtasks} />}

          {/* Persistent Todo List above input */}
          {todos && <TaskTodosList todos={todos} />}

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
function RenderConversationItem({
  item,
  onApproveRequest,
  onDenyRequest,
  onCardClick,
  taskId,
  agentId,
  workspaceId,
  responseIndex,
  messageCount,
}: {
  item: ConversationItem;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
  taskId?: string;
  agentId?: string;
  workspaceId?: string;
  responseIndex: number;
  messageCount: number;
}) {
  const conversationItemData = useConversationItem(item);
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
      const { isUser, textContent, isReasoningType } = conversationItemData;
      const isAgentMessage = !isUser && item.openai_output?.role === 'assistant';
      return (
        <div key={item.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div className="flex flex-col max-w-[85%]">
            <div className="flex items-start space-x-2">
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
            {/* Show feedback buttons only for agent messages */}
            {isAgentMessage && taskId && agentId && workspaceId && (
              <FeedbackButtons
                item={item}
                taskId={taskId}
                agentId={agentId}
                workspaceId={workspaceId}
                responseIndex={responseIndex}
                messageCount={messageCount}
              />
            )}
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
      const { isUser, textContent, isReasoningType } = conversationItemData;
      const isAgentMessage = !isUser && item.openai_output?.role === 'assistant';
      return (
        <div key={item.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div className="flex flex-col max-w-[85%]">
            <div className="flex items-start space-x-2">
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
            {/* Show feedback buttons only for agent messages */}
            {isAgentMessage && taskId && agentId && workspaceId && (
              <FeedbackButtons
                item={item}
                taskId={taskId}
                agentId={agentId}
                workspaceId={workspaceId}
                responseIndex={responseIndex}
                messageCount={messageCount}
              />
            )}
          </div>
        </div>
      );
    }
  }
} 