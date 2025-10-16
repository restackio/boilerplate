"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceScopedActions, Task } from "@/hooks/use-workspace-scoped-actions";
import { useTaskDetail } from "./hooks/use-task-detail";
import { sendMcpApproval } from "@/app/actions/agent";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { AgentStreamProvider } from "@/app/(dashboard)/agents/[agentId]/providers/agent-stream-provider";
import {
  TaskHeader,
  TaskChatInterface,
  TaskSplitView,
  TaskDetailSkeleton,
} from "./components";
import {
  EntityErrorState,
  EntityNotFoundState,
  ConfirmationDialog,
  createConfirmationConfig,
} from "@workspace/ui/components";

// Inner component that uses hooks requiring the provider
function TaskDetailContentInner({ task }: { task: Task }) {
  const { currentWorkspaceId } = useDatabaseWorkspace();
  const {
    showDeleteDialog,
    isUpdating,
    isDeleting,
    chatMessage,
    activeTab,
    showSplitView,
    selectedCard,
    conversation,
    agentLoading,
    responseState,
    setShowDeleteDialog,
    setChatMessage,
    setActiveTab,
    handleUpdateTask,
    handleDeleteTask,
    handleSendMessage,
    handleCardClick,
    handleCloseSplitView,
    handleOpenAnalytics,
    updateConversationItemStatus,
  } = useTaskDetail(task);

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

  return (
    <div>
      <TaskHeader 
        task={task} 
        onDelete={() => setShowDeleteDialog(true)} 
        onUpdateTask={handleUpdateTask}
        onOpenAnalytics={handleOpenAnalytics}
      />
      
      <div className={`flex ${showSplitView ? 'h-[calc(100vh-120px)]' : ''}`}>
        <TaskChatInterface
          conversation={conversation}
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSendMessage={handleSendMessage}
          onCardClick={handleCardClick}
          onApproveRequest={handleApproveRequest}
          onDenyRequest={handleDenyRequest}
          agentLoading={agentLoading}
          showSplitView={showSplitView}
          responseState={responseState}
          task={task}
          taskId={task.id}
          agentId={task.agent_id}
          workspaceId={currentWorkspaceId || undefined}
        />

        <TaskSplitView
          showSplitView={showSplitView}
          selectedCard={selectedCard}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          onCloseSplitView={handleCloseSplitView}
          task={task}
          onUpdateTask={handleUpdateTask}
          isUpdating={isUpdating}
        />
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTask}
        isLoading={isDeleting}
        {...createConfirmationConfig.delete(task.title, "task")}
      />
    </div>
  );
}

// Wrapper component that provides the AgentStreamProvider
// The provider internally chooses between active (with subscriptions) or mock (without)
function TaskDetailContent({ task }: { task: Task }) {
  return (
    <AgentStreamProvider
      agentTaskId={task.temporal_agent_id || ''}
      runId={task.agent_state?.metadata?.temporal_run_id}
      taskStatus={task.status}
      initialState={task.agent_state}
    >
      <TaskDetailContentInner task={task} />
    </AgentStreamProvider>
  );
}

// Wrapper component that handles loading task data
export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getTaskById } = useWorkspaceScopedActions();

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getTaskById(taskId);
        if (result.success && result.data) {
          setTask(result.data);
        } else {
          setError(result.error || "Failed to load task");
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

  if (isLoading) {
    return <TaskDetailSkeleton taskId={taskId} />;
  }

  if (error) {
    return <EntityErrorState error={error} entityId={taskId} entityType="task" onBack={() => router.push("/tasks")} />;
  }

  if (!task) {
    return <EntityNotFoundState entityId={taskId} entityType="task" onBack={() => router.push("/tasks")} />;
  }

  // Wait for temporal_agent_id before rendering content with subscriptions
  if (!task.temporal_agent_id) {
    return <TaskDetailSkeleton taskId={taskId} />;
  }

  return <TaskDetailContent task={task} />;
}

