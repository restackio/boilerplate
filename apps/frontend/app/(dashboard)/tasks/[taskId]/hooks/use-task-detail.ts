import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceScopedActions, Task } from "@/hooks/use-workspace-scoped-actions";
import { useAgentState } from "@/hooks/use-agent-state";
import { ConversationItem } from "../types";
import { useConversation } from "./use-conversation";

export function useTaskDetail() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState("logs");
  const [showSplitView, setShowSplitView] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ConversationItem | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const { getTaskById, updateTask, deleteTask } = useWorkspaceScopedActions();

  // Agent state management
  const { state: agentState, agentResponses, loading: agentLoading, sendMessageToAgent } = useAgentState({
    taskId,
    agentTaskId: task?.agent_task_id || undefined,
    onStateChange: (newState) => {
      console.log("Agent state changed:", newState);
    },
  });

  // Conversation management
  const { conversation, addUserMessage, addThinkingMessage } = useConversation({
    agentResponses: agentResponses || [],
    agentState: agentState,
    taskAgentTaskId: task?.agent_task_id,
  });

  // Fetch task data on component mount
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        console.log("No taskId provided");
        return;
      }
      
      console.log("🔄 [TaskDetailPage] Starting to fetch task:", taskId);
      const startTime = Date.now();
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getTaskById(taskId);
        console.log("Task fetch result:", result);
        
        if (result.success && result.data) {
          setTask(result.data);
          const endTime = Date.now();
          console.log(`✅ [TaskDetailPage] Task loaded successfully in ${endTime - startTime}ms:`, result.data);
        } else {
          setError(result.error || "Failed to load task");
          const endTime = Date.now();
          console.log(`❌ [TaskDetailPage] Failed to load task after ${endTime - startTime}ms:`, result);
        }
      } catch (err) {
        console.error("Error fetching task:", err);
        setError("Failed to load task");
        const endTime = Date.now();
        console.log(`❌ [TaskDetailPage] Error loading task after ${endTime - startTime}ms:`, err);
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
        status: task.status || "open",
        agent_id: task.agent_id || "",
        assigned_to_id: task.assigned_to_id || "",
        ...updates,
      };
      
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
      setShowDeleteModal(false);
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
      setIsThinking(true);
      
      // Add user message to conversation immediately
      addUserMessage(chatMessage);
      
      // Add thinking indicator
      addThinkingMessage();
      
      // Clear input
      setChatMessage("");
      
      // Send message to agent
      await sendMessageToAgent(chatMessage);
      
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCardClick = (item: ConversationItem) => {
    if (item.type === "tool-call" || item.type === "tool-list" || item.type === "assistant") {
      // If split view is already open and same card is clicked, close it
      if (showSplitView && selectedCard?.id === item.id) {
        setShowSplitView(false);
        setSelectedCard(null);
      } else {
        // Open split view with new card
        setSelectedCard(item);
        setShowSplitView(true);
        setActiveTab("logs"); // Default to logs tab
      }
    }
  };

  const handleCloseSplitView = () => {
    setShowSplitView(false);
    setSelectedCard(null);
  };

  return {
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
  };
} 