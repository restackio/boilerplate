import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceScopedActions, Task } from "@/hooks/use-workspace-scoped-actions";
import { useAgentState } from "@/app/(dashboard)/agents/[agentId]/hooks/use-agent-state";
import { ConversationItem, OpenAIEvent } from "../types";
import { useRxjsConversation } from "./use-rxjs-conversation";

export function useTaskDetail(task: Task, onRefetch?: () => Promise<void>) {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId as string;
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [showSplitView, setShowSplitView] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ConversationItem | null>(null);

  const { updateTask, deleteTask } = useWorkspaceScopedActions();

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

  const handleUpdateTask = async (updates: Partial<Task>) => {
    setIsUpdating(true);
    try {
      const updateData = {
        title: task.title || "Untitled Task",
        description: task.description || "",
        status: task.status || "in_progress",
        agent_id: task.agent_id || "",
        assigned_to_id: task.assigned_to_id || "",
        ...updates,
      };
      
      const result = await updateTask(task.id, updateData);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update task");
      }
      
      // Refetch task to get updated data
      if (onRefetch) {
        await onRefetch();
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      router.push("/tasks");
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBack = () => {
    router.push("/tasks");
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    try {
      setChatMessage("");
      await sendMessageToAgent(chatMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleCardClick = (item: ConversationItem) => {
    if (item.type === "mcp_call" || 
        item.type === "mcp_list_tools" || 
        item.type === "mcp_approval_request" ||
        item.type === "web_search_call" ||
        item.type === "assistant" ||
        item.type === "reasoning" ||
        item.type === "error") {
      if (showSplitView && selectedCard?.id === item.id) {
        setShowSplitView(false);
        setSelectedCard(null);
      } else {
        setSelectedCard(item);
        setShowSplitView(true);
        setActiveTab("details");
      }
    }
  };

  const handleCloseSplitView = () => {
    setShowSplitView(false);
    setSelectedCard(null);
  };

  const handleOpenAnalytics = () => {
    setShowSplitView(true);
    setActiveTab("analytics");
    setSelectedCard(null);
  };

  return {
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
  };
} 