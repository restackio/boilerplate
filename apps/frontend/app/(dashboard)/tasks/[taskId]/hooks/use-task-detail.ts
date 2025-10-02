import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceScopedActions, Task } from "@/hooks/use-workspace-scoped-actions";
import { useAgentState } from "@/app/(dashboard)/agents/[agentId]/hooks/use-agent-state";
import { ConversationItem, OpenAIEvent } from "../types";
// Remove unused import
import { useRxjsConversation } from "./use-rxjs-conversation";

export function useTaskDetail() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [showSplitView, setShowSplitView] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ConversationItem | null>(null);

  const { getTaskById, updateTask, deleteTask } = useWorkspaceScopedActions();

  const { responseState, agentResponses, loading: agentLoading, sendMessageToAgent } = useAgentState({
    taskId,
    agentTaskId: task?.agent_task_id || undefined,
    onStateChange: () => {
      // Agent state changed - no logging needed in production
    },
  });

  const { conversation, updateConversationItemStatus } = useRxjsConversation({
    responseState: responseState as { events: OpenAIEvent[]; [key: string]: unknown } | false,
    agentResponses: agentResponses as { events?: OpenAIEvent[]; [key: string]: unknown }[],
    taskAgentTaskId: task?.agent_task_id,
    persistedMessages: task?.messages,
    storeKey: taskId, // Use taskId as unique store key
  });

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        return;
      }
      
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

  const handleUpdateTask = async (updates: Partial<Task>) => {
    if (!task) return;
    
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
      
      if (updates.status === "completed" && conversation && conversation.length > 0) {
        updateData.messages = conversation;
      }
      
      const result = await updateTask(task.id, updateData);
      
      if (result.success && result.data) {
        setTask(result.data);
      } else {
        throw new Error(result.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
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
    if (!chatMessage.trim() || !task?.agent_task_id) {
      return;
    }

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
      // If split view is already open and same card is clicked, close it
      if (showSplitView && selectedCard?.id === item.id) {
        setShowSplitView(false);
        setSelectedCard(null);
      } else {
        // Open split view with new card
        setSelectedCard(item);
        setShowSplitView(true);
        setActiveTab("details"); // Default to item details tab
      }
    }
  };

  const handleCloseSplitView = () => {
    setShowSplitView(false);
    setSelectedCard(null);
  };

  return {
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
    setShowDeleteDialog,
    setChatMessage,
    setActiveTab,
    handleUpdateTask,
    handleDeleteTask,
    handleBack,
    handleSendMessage,
    handleCardClick,
    handleCloseSplitView,
    updateConversationItemStatus,
  };
} 