"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import {
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  GitBranch,
  Mail,
  Code,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  MessageSquare,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Archive,
  Share,
  Check,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-context";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { PageHeader } from "@workspace/ui/components/page-header";

// Types
interface TaskData {
  id: string;
  title: string;
  team: string;
  agents: string[];
  status: string;
  humanReview: string;
  priority: string;
  created: string;
  updated: string;
  description?: string;
  solution?: string;
  messagePreview?: {
    subject: string;
    body: string;
  };
  prPreview?: {
    title: string;
    branch: string;
    files: { name: string; additions: number; deletions: number }[];
    diff: string;
  };
}

interface ConversationItem {
  type: "system" | "agent" | "human" | "agent-action";
  message?: string;
  timestamp: string;
  agent: string;
  action?: string;
  status?: string;
  details?: string;
}

// New feedback-related types
interface Feedback {
  id: string;
  taskId: string;
  agentId: string;
  userId: string;
  highlightedText: string;
  feedbackType: "tone" | "accuracy" | "completeness" | "clarity" | "compliance";
  feedbackText: string;
  severity: "minor" | "major" | "critical";
  created: string;
  status: "pending" | "addressed" | "dismissed";
}

interface FeedbackModalState {
  isOpen: boolean;
  selectedText: string;
  position: { x: number; y: number } | null;
}

// Get task data from workspace
const getTaskData = (taskId: string, workspace: any): TaskData | null => {
  const task = workspace.tasks.find((t: any) => t.id === taskId);

  if (!task) {
    return null;
  }

  // Generate mock data for missing fields
  const mockData = {
    description: `This is a ${task.team.toLowerCase()} task that requires attention. The task involves ${task.title.toLowerCase()}.`,
    solution: `Solution for ${task.title.toLowerCase()} has been implemented.`,
    messagePreview: {
      subject: `${task.title} - Update`,
      body: `Hi there,\n\nWe've made progress on ${task.title.toLowerCase()}. Please review the latest updates.\n\nBest regards,\n${task.team} Team`,
    },
    prPreview:
      task.team === "Engineering"
        ? {
            title: `feat: ${task.title}`,
            branch: `fix/${task.id.toLowerCase()}`,
            files: [
              {
                name: "src/services/main.ts",
                additions: 15,
                deletions: 0,
              },
              { name: "src/utils/helper.ts", additions: 8, deletions: 12 },
            ],
            diff: `+ // New implementation for ${task.title}\n+ export function handle${task.id.replace("-", "")}() {\n+   // Implementation details\n+ }`,
          }
        : undefined,
  };

  return {
    ...task,
    ...mockData,
  };
};

// Combined conversation feed data
const conversationFeed: ConversationItem[] = [
  {
    type: "system",
    message: "Task initiated. Analyzing the issue...",
    timestamp: "14:15",
    agent: "System",
  },
  {
    type: "agent-action",
    agent: "Salesforce MCP",
    action: "Authentication check",
    status: "completed",
    timestamp: "14:20",
    details: "Checking OAuth configuration and SSL certificates",
  },
  {
    type: "agent-action",
    agent: "Salesforce MCP",
    action: "Certificate validation",
    status: "completed",
    timestamp: "14:22",
    details: "Found expired SSL certificate in OAuth config",
  },
  {
    type: "agent",
    message:
      "Salesforce MCP: Found expired SSL certificate in OAuth config. Certificate renewed successfully.",
    timestamp: "14:22",
    agent: "Salesforce MCP",
  },
  {
    type: "human",
    message: "Great! Can you prepare the customer notification?",
    timestamp: "14:23",
    agent: "Human",
  },
  {
    type: "agent-action",
    agent: "Intercom MCP",
    action: "Customer notification",
    status: "in-progress",
    timestamp: "14:25",
    details: "Generating customer notification template",
  },
  {
    type: "agent-action",
    agent: "Intercom MCP",
    action: "Template generation",
    status: "pending",
    timestamp: "14:26",
    details: "Preparing personalized message for affected customers",
  },
];

// Detailed agent logs
const agentLogs = [
  {
    timestamp: "14:15:32",
    agent: "System",
    action: "Task Initialization",
    type: "system",
    details: "Task TSK-002 created and assigned to agent pool",
    metadata: {
      taskId: "TSK-002",
      priority: "Critical",
      assignedAgents: ["Datadog MCP", "Temporal MCP"],
    },
  },
  {
    timestamp: "14:15:45",
    agent: "Datadog MCP",
    action: "Database Connection",
    type: "connection",
    details: "Establishing connection to production database cluster",
    metadata: {
      host: "prod-db-cluster.internal",
      status: "success",
      connectionTime: "120ms",
    },
  },
  {
    timestamp: "14:16:02",
    agent: "Datadog MCP",
    action: "Performance Metrics Analysis",
    type: "analysis",
    details: "Analyzing query performance metrics for the last 24 hours",
    metadata: {
      queriesAnalyzed: 15432,
      avgResponseTime: "2.3s",
      slowQueries: 847,
    },
  },
  {
    timestamp: "14:16:18",
    agent: "Datadog MCP",
    action: "Index Analysis",
    type: "analysis",
    details: "Scanning table structures for missing indexes",
    metadata: {
      tablesScanned: 23,
      missingIndexes: 3,
      recommendations: ["users.email", "orders.user_id", "orders.created_at"],
    },
  },
  {
    timestamp: "14:16:35",
    agent: "Datadog MCP",
    action: "Query Optimization",
    type: "optimization",
    details: "Identified inefficient SELECT * queries in user-queries.ts",
    metadata: {
      filesAnalyzed: 8,
      optimizationOpportunities: 5,
      estimatedImprovement: "45% faster",
    },
  },
  {
    timestamp: "14:17:12",
    agent: "Temporal MCP",
    action: "Workflow Analysis",
    type: "analysis",
    details: "Analyzing database workflow patterns and bottlenecks",
    metadata: {
      workflowsAnalyzed: 12,
      bottlenecksFound: 3,
      affectedServices: ["user-service", "order-service", "payment-service"],
    },
  },
  {
    timestamp: "14:17:28",
    agent: "Temporal MCP",
    action: "Migration Planning",
    type: "planning",
    details: "Creating database migration plan for index additions",
    metadata: {
      migrationType: "additive",
      estimatedDowntime: "0s",
      rollbackPlan: "available",
    },
  },
  {
    timestamp: "14:17:45",
    agent: "Datadog MCP",
    action: "Code Generation",
    type: "generation",
    details: "Generating optimized database queries and migration scripts",
    metadata: {
      filesGenerated: 3,
      linesAdded: 29,
      linesRemoved: 20,
    },
  },
  {
    timestamp: "14:18:03",
    agent: "Temporal MCP",
    action: "Pull Request Creation",
    type: "git",
    details: "Creating pull request with database optimizations",
    metadata: {
      branch: "fix/db-performance-optimization",
      commits: 1,
      filesChanged: 3,
    },
  },
  {
    timestamp: "14:18:25",
    agent: "Temporal MCP",
    action: "Notification Generation",
    type: "communication",
    details: "Generating team notification about database performance fix",
    metadata: {
      recipients: 15,
      notificationType: "email",
      template: "performance-resolution",
    },
  },
];

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params?.taskId as string;
  const { currentWorkspace } = useWorkspace();
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState("review");
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(true);
  const [isMessagePreviewOpen, setIsMessagePreviewOpen] = useState(true);
  const [isPrPreviewOpen, setIsPrPreviewOpen] = useState(true);

  // New feedback-related state
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    isOpen: false,
    selectedText: "",
    position: null,
  });
  const [newFeedback, setNewFeedback] = useState({
    feedbackType: "" as Feedback["feedbackType"],
    feedbackText: "",
    severity: "minor" as Feedback["severity"],
  });

  const task = getTaskData(taskId, currentWorkspace);

  // Get feedbacks for this task
  const taskFeedbacks = currentWorkspace.feedbacks.filter(
    (feedback) => feedback.taskId === taskId
  );

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Task Not Found</h2>
          <p className="text-muted-foreground">
            The requested task could not be found.
          </p>
        </div>
      </div>
    );
  }

  // Handle text selection for feedback
  const handleTextSelection = (event: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      const rect = selection.getRangeAt(0).getBoundingClientRect();

      setFeedbackModal({
        isOpen: true,
        selectedText,
        position: { x: rect.right, y: rect.bottom },
      });
    }
  };

  // Submit feedback
  const handleSubmitFeedback = () => {
    // In a real app, this would make an API call
    console.log("Submitting feedback:", {
      taskId,
      selectedText: feedbackModal.selectedText,
      ...newFeedback,
    });

    // Reset form and close modal
    setFeedbackModal({ isOpen: false, selectedText: "", position: null });
    setNewFeedback({
      feedbackType: "" as Feedback["feedbackType"],
      feedbackText: "",
      severity: "minor",
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "major":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "minor":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "addressed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "dismissed":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    setChatMessage("");
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case "system":
        return <Bot className="h-4 w-4 text-purple-500" />;
      case "connection":
        return <GitBranch className="h-4 w-4 text-blue-500" />;
      case "analysis":
        return <Activity className="h-4 w-4 text-orange-500" />;
      case "optimization":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "planning":
        return <FileText className="h-4 w-4 text-indigo-500" />;
      case "generation":
        return <Code className="h-4 w-4 text-cyan-500" />;
      case "git":
        return <GitBranch className="h-4 w-4 text-gray-500" />;
      case "communication":
        return <Mail className="h-4 w-4 text-pink-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const breadcrumbs = [
    { label: "Tasks", href: "/tasks" },
    { label: task.title },
  ];

  const actions = (
    <>
      <Button variant="ghost">
        <Archive className="h-4 w-4" />
      </Button>
      <Button variant="ghost">
        <Share className="h-4 w-4" />
      </Button>
      <Button variant="default">
        <Check className="h-4 w-4" />
        Approve
      </Button>
    </>
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
                <TabsTrigger value="review">Review</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="feedbacks">
                  Feedbacks
                  {taskFeedbacks.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {taskFeedbacks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="review" className="space-y-4">
                {/* PR Preview Card */}
                {task.prPreview && (
                  <Collapsible
                    open={isPrPreviewOpen}
                    onOpenChange={setIsPrPreviewOpen}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-left">
                              Pull Request
                            </CardTitle>
                            <CardDescription>
                              Auto-generated code changes
                            </CardDescription>
                          </div>
                          {isPrPreviewOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600">
                              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                                {task.prPreview.title}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                <span>
                                  Branch:{" "}
                                  <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-xs">
                                    {task.prPreview.branch}
                                  </code>
                                </span>
                                <span>
                                  Files changed: {task.prPreview.files.length}
                                </span>
                              </div>

                              {/* Files Changed */}
                              <div className="space-y-2 mb-4">
                                <h4 className="font-medium text-neutral-900 dark:text-neutral-200">
                                  Files Changed:
                                </h4>
                                {task.prPreview.files.map((file, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600"
                                  >
                                    <span className="text-sm font-mono text-neutral-900 dark:text-neutral-200">
                                      {file.name}
                                    </span>
                                    <div className="flex space-x-2 text-xs">
                                      <span className="text-green-600 dark:text-green-400">
                                        +{file.additions}
                                      </span>
                                      <span className="text-red-600 dark:text-red-400">
                                        -{file.deletions}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Diff Preview */}
                              <div>
                                <h4 className="font-medium text-neutral-900 dark:text-neutral-200 mb-2">
                                  Diff Preview:
                                </h4>
                                <pre className="bg-neutral-900 dark:bg-neutral-950 text-neutral-100 p-4 rounded-lg text-sm overflow-x-auto border border-neutral-300 dark:border-neutral-700">
                                  <code>{task.prPreview.diff}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Message Preview Card */}
                {task.messagePreview && (
                  <Collapsible
                    open={isMessagePreviewOpen}
                    onOpenChange={setIsMessagePreviewOpen}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-left">
                              Message Notification
                            </CardTitle>
                            <CardDescription className="text-left">
                              Auto-generated customer/team notification (Select
                              text to give feedback)
                            </CardDescription>
                          </div>
                          {isMessagePreviewOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Subject:
                              </label>
                              <div
                                className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-200 cursor-text"
                                onMouseUp={handleTextSelection}
                              >
                                {task.messagePreview.subject}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 block">
                                Message Body:
                              </label>
                              <div
                                className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded min-h-[300px] whitespace-pre-wrap border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-200 cursor-text"
                                onMouseUp={handleTextSelection}
                              >
                                {task.messagePreview.body}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </TabsContent>

              {/* New Feedbacks Tab */}
              <TabsContent value="feedbacks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          Task Feedbacks
                        </CardTitle>
                        <CardDescription>
                          All feedback collected for this task
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Feedback
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {taskFeedbacks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>
                            No feedback yet. Select text in the Review tab to
                            add feedback.
                          </p>
                        </div>
                      ) : (
                        taskFeedbacks.map((feedback) => (
                          <div
                            key={feedback.id}
                            className="p-4 border rounded-lg bg-background"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(feedback.severity)}
                                <Badge variant="outline" className="text-xs">
                                  {feedback.feedbackType}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {feedback.severity}
                                </Badge>
                                {getStatusIcon(feedback.status)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  feedback.created
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="mb-3">
                              <div className="text-sm font-medium mb-1">
                                Highlighted Text:
                              </div>
                              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                                "{feedback.highlightedText}"
                              </div>
                            </div>

                            <div className="text-sm">
                              <div className="font-medium mb-1">Feedback:</div>
                              <p>{feedback.feedbackText}</p>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <div className="text-xs text-muted-foreground">
                                By {feedback.userId} • Agent: {feedback.agentId}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm">
                                  Mark Addressed
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      Logs
                    </CardTitle>
                    <CardDescription>
                      Detailed trace of agent actions and data sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {agentLogs.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getLogTypeIcon(log.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  {log.agent}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {log.type}
                                </Badge>
                              </div>
                              <span className="text-xs">{log.timestamp}</span>
                            </div>
                            <div className="text-sm font-medium mb-1">
                              {log.action}
                            </div>
                            <div className="text-sm mb-2">{log.details}</div>
                            {log.metadata && (
                              <div className="text-xs p-2 rounded border">
                                <div className="font-mono">
                                  {Object.entries(log.metadata).map(
                                    ([key, value]) => (
                                      <div
                                        key={key}
                                        className="flex justify-between"
                                      >
                                        <span>{key}:</span>
                                        <span className="text-right ml-2">
                                          {Array.isArray(value)
                                            ? value.join(", ")
                                            : String(value)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="context" className="space-y-4">
                {/* Task Details Card */}
                <Collapsible
                  open={isTaskDetailsOpen}
                  onOpenChange={setIsTaskDetailsOpen}
                >
                  <Card className="bg-primary-foreground">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-neutral-900 dark:text-neutral-100 text-lg font-semibold flex items-center gap-2 text-left">
                            {task.title}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {task.id}
                            </Badge>
                            <Badge
                              variant={
                                task.priority === "Critical"
                                  ? "destructive"
                                  : task.priority === "High"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.team}
                            </Badge>
                            <Badge
                              variant={
                                task.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                        {isTaskDetailsOpen ? (
                          <ChevronUp className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4 text-neutral-900 dark:text-neutral-200">
                          <div>
                            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                              Problem Description
                            </div>
                            <div className="text-sm leading-relaxed">
                              {task.description}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                              Solution
                            </div>
                            <div className="text-sm leading-relaxed">
                              {task.solution}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                Human Reviewer
                              </div>
                              <div className="text-sm flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.humanReview}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                Created
                              </div>
                              <div className="text-sm">
                                {new Date(task.created).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                              Active Agents
                            </div>
                            <div className="space-y-2">
                              {task.agents.map((agent, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                    <span className="text-sm font-medium">
                                      {agent}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                      Active
                                    </div>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Feedback Modal */}
        <Dialog
          open={feedbackModal.isOpen}
          onOpenChange={(open) =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: open }))
          }
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Feedback</DialogTitle>
              <DialogDescription>
                Provide feedback on the selected text to improve agent
                responses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Selected Text</Label>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm mt-1">
                  "{feedbackModal.selectedText}"
                </div>
              </div>

              <div>
                <Label htmlFor="feedbackType">Feedback Type</Label>
                <Select
                  value={newFeedback.feedbackType}
                  onValueChange={(value: Feedback["feedbackType"]) =>
                    setNewFeedback((prev) => ({ ...prev, feedbackType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tone">Tone</SelectItem>
                    <SelectItem value="accuracy">Accuracy</SelectItem>
                    <SelectItem value="completeness">Completeness</SelectItem>
                    <SelectItem value="clarity">Clarity</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={newFeedback.severity}
                  onValueChange={(value: Feedback["severity"]) =>
                    setNewFeedback((prev) => ({ ...prev, severity: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="feedbackText">Feedback</Label>
                <Textarea
                  id="feedbackText"
                  placeholder="Describe what should be improved..."
                  value={newFeedback.feedbackText}
                  onChange={(e) =>
                    setNewFeedback((prev) => ({
                      ...prev,
                      feedbackText: e.target.value,
                    }))
                  }
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setFeedbackModal((prev) => ({ ...prev, isOpen: false }))
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={
                  !newFeedback.feedbackType || !newFeedback.feedbackText
                }
              >
                Submit Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
