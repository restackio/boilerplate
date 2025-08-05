"use client";

import { useParams } from "next/navigation";
import { useTaskDetail } from "./hooks/use-task-detail";
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
    // State
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
    agentResponses,
    
    // Actions
    setShowDeleteModal,
    setChatMessage,
    setActiveTab,
    handleUpdateTask,
    handleDeleteTask,
    handleBack,
    handleSendMessage,
    handleCardClick,
    handleCloseSplitView,
  } = useTaskDetail();



  // Get taskId from params for error states
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

