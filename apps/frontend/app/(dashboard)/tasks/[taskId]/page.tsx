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
    persistentItemIds,
    agentLoading,
    agentResponses,
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

  console.log("conversation", conversation);

  const handleApproveRequest = async (itemId: string) => {
    if (!task?.agent_task_id) {
      console.error("No agent task ID available for approval");
      return;
    }

    try {
      // Optimistically update the UI
      updateConversationItemStatus(itemId, "completed");

      console.log("mcp approval sent");
      console.log({
        approvalId: itemId,
        approved: true
      });

      const result = await sendMcpApproval({
        agentId: task.agent_task_id,
        approvalId: itemId,
        approved: true,
      });

      console.log("sendMcpApproval returns", result);

      if (!result.success) {
        console.error("Failed to approve MCP request:", result.error);
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
      console.error("No agent task ID available for denial");
      return;
    }

    try {
      // Optimistically update the UI
      updateConversationItemStatus(itemId, "failed");

      console.log("Denying MCP request:", itemId);
      const result = await sendMcpApproval({
        agentId: task.agent_task_id,
        approvalId: itemId,
        approved: false,
      });

      if (!result.success) {
        console.error("Failed to deny MCP request:", result.error);
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
          persistentItemIds={persistentItemIds}
          agentResponses={agentResponses || []}
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSendMessage={handleSendMessage}
          onCardClick={handleCardClick}
          onApproveRequest={handleApproveRequest}
          onDenyRequest={handleDenyRequest}
          agentLoading={agentLoading}
          isThinking={isThinking}
          showSplitView={showSplitView}
          taskAgentTaskId={task?.agent_task_id}
        />

        <TaskSplitView
          showSplitView={showSplitView}
          selectedCard={selectedCard}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          onCloseSplitView={handleCloseSplitView}
          task={task}
          agentResponses={agentResponses}
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

