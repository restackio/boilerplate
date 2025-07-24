"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import {
  Trash2,
  ArrowLeft,
  Loader2,
  Bot,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Archive,
} from "lucide-react";
import { useWorkspaceScopedActions, Task } from "@/hooks/use-workspace-scoped-actions";
import { TaskDetailsTab, TaskLogsTab, DeleteTaskModal } from "./components";
import { AgentStateManager } from "@/components/agent-state-manager";

// Types for conversation
interface ConversationItem {
  type: "system" | "agent" | "human" | "agent-action";
  message?: string;
  timestamp: string;
  agent: string;
  action?: string;
  status?: string;
  details?: string;
}

// Mock conversation data
const conversationFeed: ConversationItem[] = [
  {
    type: "system",
    message: "Task initiated. Analyzing the issue...",
    timestamp: "14:15",
    agent: "System",
  },
  {
    type: "agent-action",
    agent: "GitHub Support Agent",
    action: "Repository Analysis",
    status: "completed",
    timestamp: "14:20",
    details: "Analyzing repository structure and identifying issues",
  },
  {
    type: "agent",
    message: "GitHub Support Agent: Found database performance issues. Creating optimization plan.",
    timestamp: "14:22",
    agent: "GitHub Support Agent",
  },
  {
    type: "human",
    message: "Great! Can you prepare the pull request?",
    timestamp: "14:23",
    agent: "Human",
  },
  {
    type: "agent-action",
    agent: "GitHub Support Agent",
    action: "Pull Request Creation",
    status: "in-progress",
    timestamp: "14:25",
    details: "Generating optimized database queries and migration scripts",
  },
];

export default function TaskDetailPage() {
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
  const [activeTab, setActiveTab] = useState("details");

  const { getTaskById, updateTask, deleteTask } = useWorkspaceScopedActions();

  // Fetch task data on component mount
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
      // Include all current task data to avoid null constraint violations
      // Ensure required fields have valid values
      const updateData = {
        title: task.title || "Untitled Task",
        description: task.description || "",
        status: task.status || "open",
        agent_id: task.agent_id || "",
        assigned_to_id: task.assigned_to_id || "",
        ...updates, // Override with any new values
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

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    // TODO: Implement message sending logic
    console.log("Sending message:", chatMessage);
    setChatMessage("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error Loading Task</h2>
          <p className="text-muted-foreground">
            {error}
          </p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Task Not Found</h2>
          <p className="text-muted-foreground">
            The requested task could not be found.
          </p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Tasks", href: "/tasks" },
    { label: task.title },
  ];

  const actions = (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDeleteModal(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleUpdateTask({ status: "closed" })}>
        <Archive className="h-4 w-4" />
      </Button>
      {task.status !== "completed" && (
        <Button
          variant="default"
          size="sm"
          onClick={() => handleUpdateTask({ status: "completed" })}
        >
          Mark as completed
        </Button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />
      <div className="flex">
        {/* Left Side - Conversation Feed */}
        <div className="w-3/12 flex flex-col bg-background">
          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversationFeed.map((item, index) => (
              <div key={index}>
                {item.type === "agent-action" ? (
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(item.status || "pending")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {item.agent}
                        </div>
                        {item.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-1">
                        {item.action}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.details}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex ${item.type === "human" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex items-start space-x-2 max-w-[85%]">
                      {item.type !== "human" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          {item.type === "system" ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-lg ${
                          item.type === "human"
                            ? "bg-primary text-primary-foreground"
                            : item.type === "agent"
                              ? "bg-secondary"
                              : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{item.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {item.timestamp}
                        </p>
                      </div>
                      {item.type === "human" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex space-x-2">
              <Textarea
                placeholder="Request changes or ask a question"
                value={chatMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setChatMessage(e.target.value)
                }
                className="flex-1 min-h-[40px] max-h-[80px]"
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Canvas */}
        <div className="w-9/12 bg-neutral-100 dark:bg-neutral-800 min-h-screen">
          <div className="p-4 space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="agent">Agent</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="canvas">Canvas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <TaskDetailsTab
                  task={task}
                  onUpdateTask={handleUpdateTask}
                  isLoading={isUpdating}
                />
              </TabsContent>
              
              <TabsContent value="agent" className="space-y-4">
                <AgentStateManager
                  taskId={task.id}
                  agentTaskId={task.agent_task_id}
                  taskDescription={task.description || task.title}
                />
              </TabsContent>
              
              <TabsContent value="logs" className="space-y-4">
                <TaskLogsTab taskId={task.id} />
              </TabsContent>

              <TabsContent value="canvas" className="space-y-4">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Canvas</h3>
                  <p className="text-muted-foreground">
                    Canvas functionality will be implemented later. This will be where agents can display their work, 
                    show visualizations, and present their findings.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
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
