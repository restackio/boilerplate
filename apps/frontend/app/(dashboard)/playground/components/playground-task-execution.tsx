"use client";

import { useEffect, useState } from "react";
import { useWorkspaceScopedActions, Task } from "@/hooks/use-workspace-scoped-actions";
import { useAgentState } from "@/app/(dashboard)/agents/[agentId]/hooks/use-agent-state";
import { useRxjsConversation } from "@/app/(dashboard)/tasks/[taskId]/hooks/use-rxjs-conversation";
import { sendMcpApproval } from "@/app/actions/agent";
import { OpenAIEvent, ConversationItem } from "@/app/(dashboard)/tasks/[taskId]/types";
import { TaskChatInterface } from "@/app/(dashboard)/tasks/[taskId]/components";
import {
  EntityLoadingState,
  EntityErrorState,
  EntityNotFoundState,
} from "@workspace/ui/components";
import { EmptyState } from "@workspace/ui/components/empty-state";

interface PlaygroundTaskExecutionProps {
  taskId: string | null;
  agentName: string;
  className?: string;
}

export function PlaygroundTaskExecution({ 
  taskId, 
  agentName,
  className = "" 
}: PlaygroundTaskExecutionProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  const { getTaskById } = useWorkspaceScopedActions();

  const { responseState, agentResponses, loading: agentLoading, sendMessageToAgent } = useAgentState({
    taskId: taskId || undefined,
    agentTaskId: task?.agent_task_id || undefined,
    onStateChange: () => {
      // Handle state changes if needed
    },
  });

  const { conversation, updateConversationItemStatus } = useRxjsConversation({
    responseState: responseState as { events: OpenAIEvent[]; [key: string]: unknown } | false,
    agentResponses: agentResponses as { events?: OpenAIEvent[]; [key: string]: unknown }[],
    taskAgentTaskId: task?.agent_task_id || undefined,
    storeKey: taskId || 'default', // Use taskId as unique store key
  });

  // Fetch task data when taskId changes
  useEffect(() => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }

    const fetchTask = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const taskResult = await getTaskById(taskId);
        if (taskResult.success && taskResult.data) {
          setTask(taskResult.data);
        } else {
          setError("Failed to load task");
        }
      } catch (err) {
        console.error("Error fetching task:", err);
        setError("Failed to load task");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId, getTaskById]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !task?.agent_task_id) return;

    try {
      await sendMessageToAgent(chatMessage);
      setChatMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };


  const handleApproveRequest = async (itemId: string) => {
    if (!task?.agent_task_id) {
      return;
    }

    try {
      // Optimistically update the UI
      updateConversationItemStatus(itemId, "completed");

      const result = await sendMcpApproval({
        agentId: task.agent_task_id,
        approvalId: itemId,
        approved: true,
      });

      if (!result.success) {
        // Revert the optimistic update on failure
        updateConversationItemStatus(itemId, "waiting-approval");
      }
    } catch (error) {
      console.error("Error approving MCP request:", error);
      // Revert the optimistic update on error
      updateConversationItemStatus(itemId, "waiting-approval");
    }
  };

  const handleDenyRequest = async (itemId: string) => {
    if (!task?.agent_task_id) {
      return;
    }

    try {
      // Optimistically update the UI
      updateConversationItemStatus(itemId, "failed");

      const result = await sendMcpApproval({
        agentId: task.agent_task_id,
        approvalId: itemId,
        approved: false,
      });

      if (!result.success) {
        // Revert the optimistic update on failure
        updateConversationItemStatus(itemId, "waiting-approval");
      }
    } catch (error) {
      console.error("Error denying MCP request:", error);
      // Revert the optimistic update on error
      updateConversationItemStatus(itemId, "waiting-approval");
    }
  };

  const handleCardClick = (item: ConversationItem) => {
    // Handle card click - could be used for showing details or expanding content
    console.log("Card clicked:", item);
  };

  if (!taskId) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <EmptyState
          title="No task created yet"
          description="Click &quot;Start comparison&quot; to begin"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <EntityLoadingState entityId={taskId} entityType="task" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <EntityErrorState error={error} entityId={taskId} entityType="task" onBack={() => {}} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className={className}>
        <EntityNotFoundState entityId={taskId} entityType="task" onBack={() => {}} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Agent header */}
      <div className="p-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium">{agentName}</span>
          <span className="text-xs text-muted-foreground">
            Task: {task.title}
          </span>
        </div>
      </div>

      {/* Chat interface */}
      <div className="flex-1 min-h-0">
        <TaskChatInterface
          conversation={conversation}
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSendMessage={handleSendMessage}
          onCardClick={handleCardClick}
          onApproveRequest={handleApproveRequest}
          onDenyRequest={handleDenyRequest}
          agentLoading={agentLoading}
          showSplitView={false}
        />
      </div>
    </div>
  );
}
