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
import { SplitViewPanel } from "@workspace/ui/components/split-view-panel";
import { TaskMetrics } from "./task-metrics";
import { PlaygroundTraces } from "./playground-traces";

interface PlaygroundTaskExecutionProps {
  taskId: string | null;
  agentName: string;
  className?: string;
}

// Content component that only renders when we have a valid temporal_agent_id
function PlaygroundTaskContent({ 
  task, 
  taskId, 
  agentName, 
  className 
}: { 
  task: Task; 
  taskId: string; 
  agentName: string; 
  className: string;
}) {
  const [chatMessage, setChatMessage] = useState("");
  const [showTracesSplit, setShowTracesSplit] = useState(false);

  const { responseState, agentResponses, loading: agentLoading, sendMessageToAgent } = useAgentState({
    taskId,
    agentTaskId: task.temporal_agent_id,
    taskStatus: task.status,
  });

  const { conversation, updateConversationItemStatus } = useRxjsConversation({
    responseState: responseState as { events: OpenAIEvent[]; [key: string]: unknown } | false,
    agentResponses: agentResponses as { events?: OpenAIEvent[]; [key: string]: unknown }[],
    persistedState: task.agent_state,
    storeKey: taskId,
  });

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    try {
      await sendMessageToAgent(chatMessage);
      setChatMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleApproveRequest = async (itemId: string) => {
    try {
      updateConversationItemStatus(itemId, "completed");
      const result = await sendMcpApproval({
        agentId: task.temporal_agent_id!,
        approvalId: itemId,
        approved: true,
      });
      if (!result.success) {
        updateConversationItemStatus(itemId, "waiting-approval");
      }
    } catch (error) {
      console.error("Error approving MCP request:", error);
      updateConversationItemStatus(itemId, "waiting-approval");
    }
  };

  const handleDenyRequest = async (itemId: string) => {
    try {
      updateConversationItemStatus(itemId, "failed");
      const result = await sendMcpApproval({
        agentId: task.temporal_agent_id!,
        approvalId: itemId,
        approved: false,
      });
      if (!result.success) {
        updateConversationItemStatus(itemId, "waiting-approval");
      }
    } catch (error) {
      console.error("Error denying MCP request:", error);
      updateConversationItemStatus(itemId, "waiting-approval");
    }
  };

  const handleCardClick = (item: ConversationItem) => {
    console.log("Card clicked:", item);
  };

  return (
    <div className={`flex ${showTracesSplit ? 'h-full' : 'flex-col h-full'} ${className}`}>
      <div className={`flex flex-col ${showTracesSplit ? 'flex-1 min-w-0' : 'h-full'}`}>
        <div className="p-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">{agentName}</span>
            <span className="text-xs text-muted-foreground">
              Task: {task.title}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
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
              showSplitView={showTracesSplit}
            />
          </div>
          
          <div className="flex-shrink-0 px-4 pb-4">
            <TaskMetrics 
              taskId={taskId}
              onViewTraces={() => setShowTracesSplit(true)}
            />
          </div>
        </div>
      </div>

      <SplitViewPanel
        isOpen={showTracesSplit}
        onClose={() => setShowTracesSplit(false)}
        width="w-2/5"
        position="right"
      >
        <PlaygroundTraces taskId={taskId} />
      </SplitViewPanel>
    </div>
  );
}

// Wrapper component that handles loading task data
export function PlaygroundTaskExecution({ 
  taskId, 
  agentName,
  className = "" 
}: PlaygroundTaskExecutionProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getTaskById } = useWorkspaceScopedActions();

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

  // Wait for temporal_agent_id before rendering content with subscriptions
  if (!task.temporal_agent_id) {
    return (
      <div className={className}>
        <EntityLoadingState entityId={taskId} entityType="task" />
      </div>
    );
  }

  return <PlaygroundTaskContent task={task} taskId={taskId} agentName={agentName} className={className} />;
}
