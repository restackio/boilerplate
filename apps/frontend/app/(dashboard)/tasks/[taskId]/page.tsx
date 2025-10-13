"use client";

import { useParams } from "next/navigation";
import { useTaskDetail } from "./hooks/use-task-detail";
import { sendMcpApproval } from "@/app/actions/agent";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import {
  TaskHeader,
  TaskChatInterface,
  TaskSplitView,
} from "./components";
import {
  EntityLoadingState,
  EntityErrorState,
  EntityNotFoundState,
  ConfirmationDialog,
  createConfirmationConfig,
} from "@workspace/ui/components";

export default function TaskDetailPage() {
  const { currentWorkspaceId } = useDatabaseWorkspace();
  const {
    task,
    isLoading,
    error,
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
    handleBack,
    handleSendMessage,
    handleCardClick,
    handleCloseSplitView,
    handleOpenAnalytics,
    updateConversationItemStatus,
  } = useTaskDetail();

  const handleApproveRequest = async (itemId: string) => {
    if (!task?.temporal_agent_id) {
      return;
    }

    try {
      // Optimistically update the UI
      updateConversationItemStatus(itemId, "completed");

      const result = await sendMcpApproval({
        agentId: task.temporal_agent_id,
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
    if (!task?.temporal_agent_id) {
      return;
    }

    try {
      // Optimistically update the UI
      updateConversationItemStatus(itemId, "failed");

      const result = await sendMcpApproval({
        agentId: task.temporal_agent_id,
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

  const taskId = useParams()?.taskId as string;

  if (isLoading) {
    return <EntityLoadingState entityId={taskId} entityType="task" />;
  }

  if (error) {
    return <EntityErrorState error={error} entityId={taskId} entityType="task" onBack={handleBack} />;
  }

  if (!task) {
    return <EntityNotFoundState entityId={taskId} entityType="task" onBack={handleBack} />;
  }

  return (
    <div>
      <TaskHeader 
        task={task} 
        onDelete={() => setShowDeleteDialog(true)} 
        onUpdateTask={handleUpdateTask}
        onOpenAnalytics={handleOpenAnalytics}
      />
      
      <div className={`flex ${showSplitView ? 'h-[calc(100vh-80px)]' : ''}`}>
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

