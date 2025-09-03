"use client";

import { useParams } from "next/navigation";
import { useTaskDetail } from "./hooks/use-task-detail";
import { sendMcpApproval } from "@/app/actions/agent";
import {
  TaskHeader,
  TaskLoadingState,
  TaskErrorState,
  TaskNotFoundState,
  TaskChatInterface,
  TaskSplitView,
  DeleteTaskModal,
} from "./components";
// Back to original interface

export default function TaskDetailPage() {
  const {
    task,
    isLoading,
    error,
    showDeleteModal,
    isUpdating,
    isDeleting,
    chatMessage,
    activeTab,
    showSplitView,
    selectedCard,
    isThinking,
    conversation,
    agentLoading,
    setShowDeleteModal,
    setChatMessage,
    setActiveTab,
    handleUpdateTask,
    handleDeleteTask,
    handleBack,
    handleSendMessage,
    handleCardClick,
    handleCloseSplitView,
    updateConversationItemStatus,
  } = useTaskDetail();

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

  const taskId = useParams()?.taskId as string;

  if (isLoading) {
    return <TaskLoadingState taskId={taskId} />;
  }

  if (error) {
    return <TaskErrorState error={error} taskId={taskId} onBack={handleBack} />;
  }

  if (!task) {
    return <TaskNotFoundState taskId={taskId} onBack={handleBack} />;
  }

  return (
    <div>
      <TaskHeader 
        task={task} 
        onDelete={() => setShowDeleteModal(true)} 
        onUpdateTask={handleUpdateTask} 
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
          isThinking={isThinking}
          showSplitView={showSplitView}
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

      <DeleteTaskModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTask}
        taskTitle={task.title}
        isLoading={isDeleting}
      />
    </div>
  );
}

