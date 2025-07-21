"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Badge } from "@workspace/ui/components/ui/badge";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import { PageHeader } from "@workspace/ui/components/page-header";
import { AgentLifecycle } from "@workspace/ui/components/agent-lifecycle";
import AgentFlow from "@workspace/ui/components/agent-flow";
import {
  Bot,
  Play,
  MessageSquare,
  Github,
  Slack,
  Mail,
  Server,
  Code,
  Clock,
  Activity,
  CheckCircle,
  User,
  AlertCircle,
  GitBranch,
  FileText,
  Send,
  Globe,
  Lock,
  Filter,
  Settings,
  TestTube,
  BarChart3,
  Plus,
  Scale,
  MessageSquareDashed,
  Box,
  Shield,
  ArrowRight,
  Trash2,
  Workflow,
} from "lucide-react";
import { availableMCPs } from "@/lib/demo-data/mcps";

// Types for test simulation
interface TestConversationItem {
  type: "system" | "agent" | "human" | "agent-action";
  message?: string;
  timestamp: string;
  agent: string;
  action?: string;
  status?: string;
  details?: string;
}

interface TestAgentLog {
  timestamp: string;
  agent: string;
  action: string;
  type: string;
  details: string;
  metadata?: Record<string, any>;
}

// Types for guardrails and handoffs
interface InputGuardrail {
  id: string;
  name: string;
  description: string;
  function: string;
  enabled: boolean;
  tripwireCondition: string;
}

interface OutputGuardrail {
  id: string;
  name: string;
  description: string;
  function: string;
  enabled: boolean;
  tripwireCondition: string;
}

interface HandoffAgent {
  id: string;
  name: string;
  description: string;
  targetAgentId: string;
  toolNameOverride?: string;
  toolDescriptionOverride?: string;
  inputType?: string;
  inputFilter?: string;
  onHandoffCallback?: string;
}

// Mock test execution data
const generateTestExecution = (agentName: string, instructions: string) => {
  const testSteps: TestConversationItem[] = [
    {
      type: "system",
      message: `Test initiated for ${agentName}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      agent: "System",
    },
    {
      type: "system",
      message: "Analyzing instructions and available tools...",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      agent: "System",
    },
  ];

  // Add steps based on MCP mentions in instructions
  if (instructions.includes("@github_mcp_read_repos")) {
    testSteps.push({
      type: "agent-action",
      agent: agentName,
      action: "Repository Analysis",
      status: "in-progress",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      details: "Connecting to GitHub API and analyzing repository structure",
    });
  }

  if (instructions.includes("@datadog_mcp_query_metrics")) {
    testSteps.push({
      type: "agent-action",
      agent: agentName,
      action: "Metrics Query",
      status: "pending",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      details: "Querying Datadog for performance metrics and logs",
    });
  }

  if (instructions.includes("@slack_mcp_send_messages")) {
    testSteps.push({
      type: "agent-action",
      agent: agentName,
      action: "Slack Integration",
      status: "pending",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      details: "Preparing to send notifications via Slack",
    });
  }

  return testSteps;
};

const generateTestLogs = (agentName: string) => {
  return [
    {
      timestamp: new Date().toLocaleTimeString(),
      agent: "System",
      action: "Test Initialization",
      type: "system",
      details: `Starting test execution for ${agentName}`,
      metadata: {
        testId: `test-${Date.now()}`,
        environment: "sandbox",
        timeout: "5m",
      },
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      agent: agentName,
      action: "Instruction Parsing",
      type: "analysis",
      details: "Parsing system instructions and identifying required tools",
      metadata: {
        instructionLength: 1500,
        toolsIdentified: 3,
        complexity: "medium",
      },
    },
  ];
};

const triggerIcons = {
  github: Github,
  slack: Slack,
  email: Mail,
  alerts: Server,
};

// Function to format instructions with MCP tool references
const formatInstructionsWithMCPs = (text: string) => {
  // Split text by @ symbols and process each part
  const parts = text.split(/(@\w+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={index}
          className="font-bold text-black bg-gray-100 px-1 rounded"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

// Component to display formatted instructions
const InstructionsPreview = ({ instructions }: { instructions: string }) => {
  const formattedInstructions = formatInstructionsWithMCPs(instructions);

  return (
    <div className="whitespace-pre-wrap font-mono text-sm p-3 bg-muted rounded-md border min-h-[200px]">
      {formattedInstructions}
    </div>
  );
};

export default function AgentEditPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const { currentWorkspace } = useWorkspace();

  // Find the agent
  const agent = currentWorkspace.agents.find((a) => a.id === agentId);

  // State for editing
  const [name, setName] = useState(agent?.name || "");
  const [version, setVersion] = useState(agent?.version || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [instructions, setInstructions] = useState(
    agent?.instructions ||
      "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses."
  );
  const [trigger, setTrigger] = useState(agent?.channel || "github");
  const [previewMode, setPreviewMode] = useState(true);

  // Test dialog state
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testConversation, setTestConversation] = useState<
    TestConversationItem[]
  >([]);
  const [testLogs, setTestLogs] = useState<TestAgentLog[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testChatMessage, setTestChatMessage] = useState("");

  // MCP navigation state
  const [mcpView, setMcpView] = useState<"all" | "public" | "private">("all");

  // Tab navigation state
  const [activeTab, setActiveTab] = useState("setup");

  // New state for guardrails and handoffs
  const [inputGuardrails, setInputGuardrails] = useState<InputGuardrail[]>([]);
  const [outputGuardrails, setOutputGuardrails] = useState<OutputGuardrail[]>(
    []
  );
  const [handoffAgents, setHandoffAgents] = useState<HandoffAgent[]>([]);
  const [showAddGuardrail, setShowAddGuardrail] = useState<
    "input" | "output" | null
  >(null);
  const [showAddHandoff, setShowAddHandoff] = useState(false);

  // Tab configuration based on agent status
  const getTabsConfig = () => {
    const isReleased = agent?.status === "active";
    const isPreRelease =
      agent?.status === "testing" || agent?.status === "paused";

    return [
      {
        id: "setup",
        label: "Setup",
        icon: Settings,
        enabled: isPreRelease,
        tooltip: isReleased ? "Released agent is immutable" : undefined,
      },
      {
        id: "flow",
        label: "Flow",
        icon: Workflow,
        enabled: isPreRelease,
        tooltip: isReleased ? "Released agent is immutable" : undefined,
      },
      {
        id: "simulation",
        label: "Simulation",
        icon: Box,
        enabled: isPreRelease,
        tooltip: isReleased ? "Released agent is immutable" : undefined,
      },
      {
        id: "feedbacks",
        label: "Feedbacks",
        icon: MessageSquareDashed,
        enabled: isReleased,
        tooltip: !isReleased ? "Available after release" : undefined,
      },
      {
        id: "rules",
        label: "Rules",
        icon: Scale,
        enabled: isReleased,
        tooltip: !isReleased ? "Available after release" : undefined,
      },
      {
        id: "experiments",
        label: "Experiments",
        icon: BarChart3,
        enabled: isReleased,
        tooltip: !isReleased ? "Available after release" : undefined,
      },
      {
        id: "release",
        label: "Release",
        icon: GitBranch,
        enabled: isPreRelease,
        tooltip: isReleased ? "Already released" : undefined,
      },
    ];
  };

  const tabsConfig = getTabsConfig();

  // Auto-focus first enabled tab on mount or when agent status changes
  const firstEnabledTab = tabsConfig.find((tab) => tab.enabled)?.id || "setup";
  if (!tabsConfig.find((tab) => tab.id === activeTab)?.enabled) {
    setActiveTab(firstEnabledTab);
  }

  // Helper functions for test simulation
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
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

  const startTest = () => {
    if (!agent) return;

    setIsTestRunning(true);
    const initialConversation = generateTestExecution(agent.name, instructions);
    const initialLogs = generateTestLogs(agent.name);

    setTestConversation(initialConversation);
    setTestLogs(initialLogs);

    // Simulate real-time updates
    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;

      if (stepIndex <= initialConversation.length) {
        // Update status of agent actions to completed
        setTestConversation((prev) =>
          prev.map((item, index) =>
            index < stepIndex &&
            item.type === "agent-action" &&
            item.status === "pending"
              ? { ...item, status: "completed" }
              : index < stepIndex &&
                  item.type === "agent-action" &&
                  item.status === "in-progress"
                ? { ...item, status: "completed" }
                : item
          )
        );

        // Add new log entries
        if (stepIndex % 2 === 0) {
          const newLog: TestAgentLog = {
            timestamp: new Date().toLocaleTimeString(),
            agent: agent.name,
            action: `Step ${stepIndex}`,
            type: "execution",
            details: `Executing instruction step ${stepIndex}`,
            metadata: {
              step: stepIndex,
              progress: `${Math.min(stepIndex * 20, 100)}%`,
            },
          };
          setTestLogs((prev) => [...prev, newLog]);
        }
      }

      if (stepIndex >= initialConversation.length + 2) {
        clearInterval(interval);
        setIsTestRunning(false);

        // Add completion message
        setTestConversation((prev) => [
          ...prev,
          {
            type: "agent",
            message:
              "Test execution completed successfully! All instructions processed and tools validated.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            agent: agent.name,
          },
        ]);
      }
    }, 2000);
  };

  const handleTestChatMessage = () => {
    if (!testChatMessage.trim()) return;

    const newMessage: TestConversationItem = {
      type: "human",
      message: testChatMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      agent: "Human",
    };

    setTestConversation((prev) => [...prev, newMessage]);
    setTestChatMessage("");

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: TestConversationItem = {
        type: "agent",
        message:
          "I understand your request. Let me process that according to my instructions.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        agent: agent?.name || "Agent",
      };
      setTestConversation((prev) => [...prev, agentResponse]);
    }, 1000);
  };

  // Get all MCP mentions from instructions
  const getMentionsFromInstructions = (text: string): string[] => {
    const mentions = text.match(/@\w+/g) || [];
    return mentions;
  };

  // Get active MCPs based on mentions in instructions
  const getActiveMCPs = () => {
    const mentions = getMentionsFromInstructions(instructions);
    const activeMCPs = new Set<string>();

    availableMCPs.forEach((mcp) => {
      const hasActiveMention = mcp.mentions.some((mention) =>
        mentions.includes(mention)
      );
      if (hasActiveMention) {
        activeMCPs.add(mcp.id);
      }
    });

    return activeMCPs;
  };

  const activeMCPs = getActiveMCPs();

  // Filter MCPs based on current view
  const getFilteredMCPs = () => {
    switch (mcpView) {
      case "public":
        return availableMCPs.filter((mcp) => mcp.visibility === "public");
      case "private":
        return availableMCPs.filter((mcp) => mcp.visibility === "private");
      default:
        return availableMCPs;
    }
  };

  // Get MCP counts
  const mcpCounts = {
    all: availableMCPs.length,
    public: availableMCPs.filter((mcp) => mcp.visibility === "public").length,
    private: availableMCPs.filter((mcp) => mcp.visibility === "private").length,
  };

  const filteredMCPs = getFilteredMCPs();

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Agent not found</h2>
          <p className="text-muted-foreground">
            The agent you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // In a real app, this would save to a backend
    console.log("Saving agent:", {
      id: agentId,
      name,
      version,
      description,
      instructions,
      trigger,
    });
  };

  const handleTriggerChange = (value: string) => {
    setTrigger(value as "github" | "slack" | "email" | "alerts");
  };

  const handleMCPClick = (mcp: (typeof availableMCPs)[0]) => {
    // Add the first mention of the MCP to instructions if not already present
    const currentMentions = getMentionsFromInstructions(instructions);
    const mcpMention = mcp.mentions[0];

    if (mcpMention && !currentMentions.includes(mcpMention)) {
      // Add mention at the end of instructions
      const capabilityText =
        mcp.capabilities[0]?.replace("_", " ") || "functionality";
      const newInstructions =
        instructions +
        (instructions.endsWith("\n") ? "" : "\n") +
        `Use ${mcpMention} for ${capabilityText}.`;
      setInstructions(newInstructions);
    }
  };

  // Guardrail management functions
  const addInputGuardrail = (guardrail: Omit<InputGuardrail, "id">) => {
    const newGuardrail = {
      ...guardrail,
      id: `input-${Date.now()}`,
    };
    setInputGuardrails((prev) => [...prev, newGuardrail]);
    setShowAddGuardrail(null);
  };

  const addOutputGuardrail = (guardrail: Omit<OutputGuardrail, "id">) => {
    const newGuardrail = {
      ...guardrail,
      id: `output-${Date.now()}`,
    };
    setOutputGuardrails((prev) => [...prev, newGuardrail]);
    setShowAddGuardrail(null);
  };

  const removeGuardrail = (id: string, type: "input" | "output") => {
    if (type === "input") {
      setInputGuardrails((prev) => prev.filter((g) => g.id !== id));
    } else {
      setOutputGuardrails((prev) => prev.filter((g) => g.id !== id));
    }
  };

  const toggleGuardrail = (id: string, type: "input" | "output") => {
    if (type === "input") {
      setInputGuardrails((prev) =>
        prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
      );
    } else {
      setOutputGuardrails((prev) =>
        prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
      );
    }
  };

  // Handoff management functions
  const addHandoffAgent = (handoff: Omit<HandoffAgent, "id">) => {
    const newHandoff = {
      ...handoff,
      id: `handoff-${Date.now()}`,
    };
    setHandoffAgents((prev) => [...prev, newHandoff]);
    setShowAddHandoff(false);
  };

  const removeHandoffAgent = (id: string) => {
    setHandoffAgents((prev) => prev.filter((h) => h.id !== id));
  };

  // Get available agents for handoff (excluding current agent)
  const availableAgentsForHandoff = currentWorkspace.agents.filter(
    (a) => a.id !== agentId
  );

  const breadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: `${agent.name} ${agent.version}` },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        Archive
      </Button>
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Test
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-screen-xl max-h-[90vh] p-0">
          <div className="flex h-[80vh]">
            {/* Left Side - Conversation Feed */}
            <div className="w-1/2 flex flex-col border-r">
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Test Agent: {agent?.name}</DialogTitle>
                <DialogDescription>
                  Real-time simulation of agent execution
                </DialogDescription>
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={startTest}
                    disabled={isTestRunning}
                    size="sm"
                  >
                    {isTestRunning ? (
                      <>
                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Start Test
                      </>
                    )}
                  </Button>
                  {testConversation.length > 0 && (
                    <Button
                      onClick={() => {
                        setTestConversation([]);
                        setTestLogs([]);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {/* Conversation Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {testConversation.map((item, index) => (
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
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Send a message to the agent..."
                    value={testChatMessage}
                    onChange={(e) => setTestChatMessage(e.target.value)}
                    className="flex-1 min-h-[40px] max-h-[80px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleTestChatMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleTestChatMessage}
                    disabled={!testChatMessage.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Side - Logs */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-medium">Execution Logs</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed trace of agent actions
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {testLogs.map((log, index) => (
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
                                <div key={key} className="flex justify-between">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={handleSave}>Publish new version</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-screen-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agent Lifecycle Management</DialogTitle>
            <DialogDescription>
              Define goals, run tests, and manage the release pipeline for{" "}
              {agent.name}
            </DialogDescription>
          </DialogHeader>
          <AgentLifecycle
            agentId={agentId}
            agentName={agent.name}
            currentVersion={agent.version}
          />
        </DialogContent>
      </Dialog>
    </>
  );

  // GuardrailForm component
  const GuardrailForm = ({
    type,
    onSubmit,
    onCancel,
  }: {
    type: "input" | "output";
    onSubmit: (guardrail: Omit<InputGuardrail | OutputGuardrail, "id">) => void;
    onCancel: () => void;
  }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [functionName, setFunctionName] = useState("");
    const [tripwireCondition, setTripwireCondition] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name && description && functionName && tripwireCondition) {
        onSubmit({
          name,
          description,
          function: functionName,
          enabled: true,
          tripwireCondition,
        });
      }
    };

    const commonGuardrails = [
      {
        name: "Content Safety Check",
        description: "Validates content for inappropriate material",
        function: "content_safety_guardrail",
        tripwire: "result.is_inappropriate == True",
      },
      {
        name: "PII Detection",
        description: "Detects personally identifiable information",
        function: "pii_detection_guardrail",
        tripwire: "result.contains_pii == True",
      },
      {
        name: "Topic Relevance",
        description: "Ensures responses stay on topic",
        function: "topic_relevance_guardrail",
        tripwire: "result.relevance_score < 0.7",
      },
    ];

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="guardrail-name">Name</Label>
          <Input
            id="guardrail-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter guardrail name..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardrail-description">Description</Label>
          <Textarea
            id="guardrail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this guardrail does..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardrail-function">Function Name</Label>
          <Input
            id="guardrail-function"
            value={functionName}
            onChange={(e) => setFunctionName(e.target.value)}
            placeholder="e.g., @input_guardrail or @output_guardrail decorator function"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardrail-tripwire">Tripwire Condition</Label>
          <Input
            id="guardrail-tripwire"
            value={tripwireCondition}
            onChange={(e) => setTripwireCondition(e.target.value)}
            placeholder="e.g., result.violation_detected == True"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Common Templates</Label>
          <div className="grid gap-2">
            {commonGuardrails.map((template) => (
              <Button
                key={template.name}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  setName(template.name);
                  setDescription(template.description);
                  setFunctionName(template.function);
                  setTripwireCondition(template.tripwire);
                }}
              >
                <div className="text-left">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Add {type === "input" ? "Input" : "Output"} Guardrail
          </Button>
        </div>
      </form>
    );
  };

  // HandoffForm component
  const HandoffForm = ({
    availableAgents,
    onSubmit,
    onCancel,
  }: {
    availableAgents: typeof currentWorkspace.agents;
    onSubmit: (handoff: Omit<HandoffAgent, "id">) => void;
    onCancel: () => void;
  }) => {
    const [selectedAgentId, setSelectedAgentId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [toolNameOverride, setToolNameOverride] = useState("");
    const [toolDescriptionOverride, setToolDescriptionOverride] = useState("");
    const [inputType, setInputType] = useState("");
    const [inputFilter, setInputFilter] = useState("");
    const [onHandoffCallback, setOnHandoffCallback] = useState("");

    const selectedAgent = availableAgents.find((a) => a.id === selectedAgentId);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedAgentId && name && description) {
        onSubmit({
          name,
          description,
          targetAgentId: selectedAgentId,
          toolNameOverride: toolNameOverride || undefined,
          toolDescriptionOverride: toolDescriptionOverride || undefined,
          inputType: inputType || undefined,
          inputFilter: inputFilter || undefined,
          onHandoffCallback: onHandoffCallback || undefined,
        });
      }
    };

    const commonInputFilters = [
      "handoff_filters.remove_all_tools",
      "handoff_filters.preserve_context",
      "handoff_filters.sanitize_sensitive_data",
    ];

    const commonInputTypes = [
      "str",
      "EscalationData",
      "SupportTicket",
      "UserQuery",
    ];

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="handoff-agent">Target Agent</Label>
          <Select
            value={selectedAgentId}
            onValueChange={setSelectedAgentId}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an agent to hand off to..." />
            </SelectTrigger>
            <SelectContent>
              {availableAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>{agent.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {agent.version}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="handoff-name">Handoff Name</Label>
          <Input
            id="handoff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              selectedAgent
                ? `Handoff to ${selectedAgent.name}`
                : "Enter handoff name..."
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="handoff-description">Description</Label>
          <Textarea
            id="handoff-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe when and why to use this handoff..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tool-name-override">Tool Name Override</Label>
            <Input
              id="tool-name-override"
              value={toolNameOverride}
              onChange={(e) => setToolNameOverride(e.target.value)}
              placeholder={
                selectedAgent
                  ? `transfer_to_${selectedAgent.name.toLowerCase().replace(/\s+/g, "_")}`
                  : "transfer_to_agent"
              }
            />
            <p className="text-xs text-muted-foreground">
              Custom tool name (default: transfer_to_agent_name)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input-type">Input Type</Label>
            <Input
              id="input-type"
              value={inputType}
              onChange={(e) => setInputType(e.target.value)}
              placeholder="e.g., EscalationData, str"
            />
            <p className="text-xs text-muted-foreground">
              Pydantic model for structured input
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-description-override">
            Tool Description Override
          </Label>
          <Textarea
            id="tool-description-override"
            value={toolDescriptionOverride}
            onChange={(e) => setToolDescriptionOverride(e.target.value)}
            placeholder="Custom description for the handoff tool..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-filter">Input Filter</Label>
          <Input
            id="input-filter"
            value={inputFilter}
            onChange={(e) => setInputFilter(e.target.value)}
            placeholder="e.g., handoff_filters.remove_all_tools"
          />
          <div className="flex flex-wrap gap-1">
            {commonInputFilters.map((filter) => (
              <Button
                key={filter}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-6"
                onClick={() => setInputFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="handoff-callback">On Handoff Callback</Label>
          <Input
            id="handoff-callback"
            value={onHandoffCallback}
            onChange={(e) => setOnHandoffCallback(e.target.value)}
            placeholder="Function to execute when handoff is triggered"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Add Handoff</Button>
        </div>
      </form>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex-1">
        <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />

        {/* Main Content - with top padding for fixed header */}
        <div className="bg-primary-foreground pt-8 p-4">
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-background rounded-lg border">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b bg-muted/30 rounded-t-lg px-4 py-2">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                    {tabsConfig.map((tab) => {
                      const IconComponent = tab.icon;
                      const TabComponent = (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          disabled={!tab.enabled}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-md
                            ${
                              !tab.enabled
                                ? "opacity-50 cursor-not-allowed data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                                : "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            }
                          `}
                        >
                          <IconComponent className="h-4 w-4" />
                          {tab.label}
                        </TabsTrigger>
                      );

                      return tab.tooltip ? (
                        <Tooltip key={tab.id}>
                          <TooltipTrigger asChild>
                            {TabComponent}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tab.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        TabComponent
                      );
                    })}
                  </TabsList>
                </div>

                {/* Setup Tab */}
                <TabsContent value="setup" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Agent Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter agent name..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="version">Version</Label>
                          <Input
                            id="version"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            placeholder="e.g., v1.0, v2.1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="trigger">Trigger</Label>
                          <Select
                            value={trigger}
                            onValueChange={handleTriggerChange}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="github">
                                <div className="flex items-center gap-2">
                                  <Github className="h-4 w-4" />
                                  GitHub
                                </div>
                              </SelectItem>
                              <SelectItem value="slack">
                                <div className="flex items-center gap-2">
                                  <Slack className="h-4 w-4" />
                                  Slack
                                </div>
                              </SelectItem>
                              <SelectItem value="email">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  Email
                                </div>
                              </SelectItem>
                              <SelectItem value="alerts">
                                <div className="flex items-center gap-2">
                                  <Server className="h-4 w-4" />
                                  Alerts
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of what this agent does..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Instructions */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="instructions">
                              System Instructions
                            </Label>
                            <div className="ml-auto flex gap-1">
                              <Button
                                type="button"
                                variant={!previewMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPreviewMode(false)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant={previewMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPreviewMode(true)}
                              >
                                Preview
                              </Button>
                            </div>
                          </div>

                          {!previewMode ? (
                            <div className="space-y-2">
                              <Textarea
                                id="instructions"
                                value={instructions}
                                onChange={(e) =>
                                  setInstructions(e.target.value)
                                }
                                placeholder="Enter detailed instructions for how this agent should behave..."
                                className="min-h-[400px] font-mono text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                Define how the agent should respond. Use{" "}
                                <code className="bg-muted px-1 rounded">
                                  @tool_name
                                </code>{" "}
                                to reference MCP tools.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <InstructionsPreview
                                instructions={instructions}
                              />
                              <p className="text-xs text-muted-foreground">
                                Preview of how the instructions will appear with
                                MCP tool references highlighted.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* MCPs */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">
                              Available Tools
                            </h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              Click tools to add mentions to instructions
                            </p>
                          </div>

                          {/* MCP Navigation */}
                          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                            <Button
                              variant={mcpView === "all" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setMcpView("all")}
                              className="flex-1 text-xs h-7"
                            >
                              <Filter className="h-3 w-3 mr-1" />
                              All ({mcpCounts.all})
                            </Button>
                            <Button
                              variant={
                                mcpView === "public" ? "default" : "ghost"
                              }
                              size="sm"
                              onClick={() => setMcpView("public")}
                              className="flex-1 text-xs h-7"
                            >
                              <Globe className="h-3 w-3 mr-1" />
                              Public ({mcpCounts.public})
                            </Button>
                            <Button
                              variant={
                                mcpView === "private" ? "default" : "ghost"
                              }
                              size="sm"
                              onClick={() => setMcpView("private")}
                              className="flex-1 text-xs h-7"
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Private ({mcpCounts.private})
                            </Button>
                          </div>

                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {filteredMCPs.map((mcp) => {
                              const isActive = activeMCPs.has(mcp.id);
                              const IconComponent = mcp.icon;

                              return (
                                <div
                                  key={mcp.id}
                                  className={`border rounded-lg p-3 cursor-pointer transition-all text-sm ${
                                    isActive
                                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => handleMCPClick(mcp)}
                                >
                                  <div className="flex items-start gap-2">
                                    <div
                                      className={`p-1.5 rounded-md ${
                                        isActive
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted"
                                      }`}
                                    >
                                      <IconComponent className="h-3 w-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                          <h5 className="font-medium text-sm">
                                            {mcp.name}
                                          </h5>
                                          {isActive && (
                                            <CheckCircle className="h-3 w-3 text-primary" />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Badge
                                            variant="secondary"
                                            className="text-xs py-0 px-1"
                                          >
                                            {mcp.version}
                                          </Badge>
                                          {mcp.visibility === "private" ? (
                                            <Lock className="h-3 w-3 text-muted-foreground" />
                                          ) : (
                                            <Globe className="h-3 w-3 text-muted-foreground" />
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {mcp.description}
                                      </p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {mcp.capabilities
                                          .slice(0, 2)
                                          .map((capability) => (
                                            <Badge
                                              key={capability}
                                              variant="outline"
                                              className="text-xs py-0 px-1"
                                            >
                                              {capability.replace("_", " ")}
                                            </Badge>
                                          ))}
                                        {mcp.capabilities.length > 2 && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs py-0 px-1"
                                          >
                                            +{mcp.capabilities.length - 2}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {activeMCPs.size > 0 && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <h5 className="font-medium text-sm mb-2">
                                Active Tools ({activeMCPs.size})
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {Array.from(activeMCPs).map((mcpId) => {
                                  const mcp = availableMCPs.find(
                                    (m) => m.id === mcpId
                                  );
                                  if (!mcp) return null;
                                  const IconComponent = mcp.icon;

                                  return (
                                    <div
                                      key={mcpId}
                                      className="flex items-center gap-1 bg-background border rounded-md px-2 py-1"
                                    >
                                      <IconComponent className="h-3 w-3" />
                                      <span className="text-xs">
                                        {mcp.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Guardrails Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Guardrails
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Input Guardrails */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Input Guardrails</h4>
                            <p className="text-sm text-muted-foreground">
                              Run validation checks on user input before agent
                              processing
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddGuardrail("input")}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Input Guardrail
                          </Button>
                        </div>

                        {inputGuardrails.length > 0 ? (
                          <div className="space-y-2">
                            {inputGuardrails.map((guardrail) => (
                              <div
                                key={guardrail.id}
                                className={`border rounded-lg p-3 ${
                                  guardrail.enabled
                                    ? "border-green-200 bg-green-50"
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-sm">
                                        {guardrail.name}
                                      </h5>
                                      <Badge
                                        variant={
                                          guardrail.enabled
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {guardrail.enabled
                                          ? "Enabled"
                                          : "Disabled"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {guardrail.description}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      <div className="text-xs">
                                        <span className="font-medium">
                                          Function:
                                        </span>
                                        <code className="ml-1 bg-muted px-1 rounded">
                                          {guardrail.function}
                                        </code>
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-medium">
                                          Tripwire:
                                        </span>
                                        <code className="ml-1 bg-muted px-1 rounded">
                                          {guardrail.tripwireCondition}
                                        </code>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleGuardrail(guardrail.id, "input")
                                      }
                                    >
                                      {guardrail.enabled ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeGuardrail(guardrail.id, "input")
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              No input guardrails configured
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Output Guardrails */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Output Guardrails</h4>
                            <p className="text-sm text-muted-foreground">
                              Validate agent responses before returning to user
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddGuardrail("output")}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Output Guardrail
                          </Button>
                        </div>

                        {outputGuardrails.length > 0 ? (
                          <div className="space-y-2">
                            {outputGuardrails.map((guardrail) => (
                              <div
                                key={guardrail.id}
                                className={`border rounded-lg p-3 ${
                                  guardrail.enabled
                                    ? "border-green-200 bg-green-50"
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-sm">
                                        {guardrail.name}
                                      </h5>
                                      <Badge
                                        variant={
                                          guardrail.enabled
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {guardrail.enabled
                                          ? "Enabled"
                                          : "Disabled"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {guardrail.description}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      <div className="text-xs">
                                        <span className="font-medium">
                                          Function:
                                        </span>
                                        <code className="ml-1 bg-muted px-1 rounded">
                                          {guardrail.function}
                                        </code>
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-medium">
                                          Tripwire:
                                        </span>
                                        <code className="ml-1 bg-muted px-1 rounded">
                                          {guardrail.tripwireCondition}
                                        </code>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleGuardrail(guardrail.id, "output")
                                      }
                                    >
                                      {guardrail.enabled ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeGuardrail(guardrail.id, "output")
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              No output guardrails configured
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Handoffs Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5" />
                        Agent Handoffs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Handoff Configuration</h4>
                          <p className="text-sm text-muted-foreground">
                            Configure which agents this agent can delegate tasks
                            to
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddHandoff(true)}
                          disabled={availableAgentsForHandoff.length === 0}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Handoff
                        </Button>
                      </div>

                      {handoffAgents.length > 0 ? (
                        <div className="space-y-2">
                          {handoffAgents.map((handoff) => {
                            const targetAgent = availableAgentsForHandoff.find(
                              (a) => a.id === handoff.targetAgentId
                            );
                            return (
                              <div
                                key={handoff.id}
                                className="border rounded-lg p-3 bg-blue-50"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-sm">
                                        {handoff.name}
                                      </h5>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">
                                        {targetAgent?.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {handoff.description}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      {handoff.toolNameOverride && (
                                        <div className="text-xs">
                                          <span className="font-medium">
                                            Tool Name:
                                          </span>
                                          <code className="ml-1 bg-muted px-1 rounded">
                                            {handoff.toolNameOverride}
                                          </code>
                                        </div>
                                      )}
                                      {handoff.inputType && (
                                        <div className="text-xs">
                                          <span className="font-medium">
                                            Input Type:
                                          </span>
                                          <code className="ml-1 bg-muted px-1 rounded">
                                            {handoff.inputType}
                                          </code>
                                        </div>
                                      )}
                                      {handoff.inputFilter && (
                                        <div className="text-xs">
                                          <span className="font-medium">
                                            Input Filter:
                                          </span>
                                          <code className="ml-1 bg-muted px-1 rounded">
                                            {handoff.inputFilter}
                                          </code>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeHandoffAgent(handoff.id)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {availableAgentsForHandoff.length === 0
                              ? "No other agents available for handoff"
                              : "No handoffs configured"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Add Guardrail Dialog */}
                  {showAddGuardrail && (
                    <Dialog
                      open={!!showAddGuardrail}
                      onOpenChange={() => setShowAddGuardrail(null)}
                    >
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            Add{" "}
                            {showAddGuardrail === "input" ? "Input" : "Output"}{" "}
                            Guardrail
                          </DialogTitle>
                          <DialogDescription>
                            Configure a new {showAddGuardrail} guardrail for
                            this agent
                          </DialogDescription>
                        </DialogHeader>
                        <GuardrailForm
                          type={showAddGuardrail}
                          onSubmit={
                            showAddGuardrail === "input"
                              ? addInputGuardrail
                              : addOutputGuardrail
                          }
                          onCancel={() => setShowAddGuardrail(null)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Add Handoff Dialog */}
                  {showAddHandoff && (
                    <Dialog
                      open={showAddHandoff}
                      onOpenChange={setShowAddHandoff}
                    >
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Agent Handoff</DialogTitle>
                          <DialogDescription>
                            Configure a handoff to another agent
                          </DialogDescription>
                        </DialogHeader>
                        <HandoffForm
                          availableAgents={availableAgentsForHandoff}
                          onSubmit={addHandoffAgent}
                          onCancel={() => setShowAddHandoff(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </TabsContent>

                {/* Flow Tab */}
                <TabsContent value="flow" className="p-0">
                  <div className="h-[800px]">
                    <AgentFlow />
                  </div>
                </TabsContent>

                {/* Simulation Tab */}
                <TabsContent value="simulation" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5" />
                        Agent Simulation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Test Simulation</h3>
                            <p className="text-sm text-muted-foreground">
                              Run end-to-end tests to validate agent behavior
                            </p>
                          </div>
                          <Dialog
                            open={isTestDialogOpen}
                            onOpenChange={setIsTestDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button onClick={() => setIsTestDialogOpen(true)}>
                                <Play className="h-4 w-4 mr-2" />
                                Run Test
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-screen-xl max-h-[90vh] overflow-hidden flex flex-col">
                              <DialogHeader>
                                <DialogTitle>Agent Test Simulation</DialogTitle>
                                <DialogDescription>
                                  Real-time simulation of agent execution
                                </DialogDescription>
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    onClick={startTest}
                                    disabled={isTestRunning}
                                    size="sm"
                                  >
                                    {isTestRunning ? (
                                      <>
                                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                                        Running...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 mr-1" />
                                        Start Test
                                      </>
                                    )}
                                  </Button>
                                  {testConversation.length > 0 && (
                                    <Button
                                      onClick={() => {
                                        setTestConversation([]);
                                        setTestLogs([]);
                                      }}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                              </DialogHeader>

                              <div className="flex flex-1 gap-4 min-h-0">
                                {/* Left Side - Conversation */}
                                <div className="w-1/2 flex flex-col">
                                  <div className="p-4 border-b">
                                    <h3 className="font-medium">
                                      Conversation
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      Real-time simulation of agent execution
                                    </p>
                                  </div>

                                  {/* Conversation Feed */}
                                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {testConversation.map((item, index) => (
                                      <div key={index}>
                                        {item.type === "agent-action" ? (
                                          <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex-shrink-0 mt-1">
                                              {getStatusIcon(
                                                item.status || "pending"
                                              )}
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
                                                <p className="text-sm">
                                                  {item.message}
                                                </p>
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
                                  <div className="p-4 border-t">
                                    <div className="flex space-x-2">
                                      <Textarea
                                        placeholder="Send a message to the agent..."
                                        value={testChatMessage}
                                        onChange={(e) =>
                                          setTestChatMessage(e.target.value)
                                        }
                                        className="flex-1 min-h-[40px] max-h-[80px]"
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" &&
                                            !e.shiftKey
                                          ) {
                                            e.preventDefault();
                                            handleTestChatMessage();
                                          }
                                        }}
                                      />
                                      <Button
                                        onClick={handleTestChatMessage}
                                        disabled={!testChatMessage.trim()}
                                        size="sm"
                                      >
                                        <Send className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side - Logs */}
                                <div className="w-1/2 flex flex-col">
                                  <div className="p-4 border-b">
                                    <h3 className="font-medium">
                                      Execution Logs
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      Detailed trace of agent actions
                                    </p>
                                  </div>

                                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {testLogs.map((log, index) => (
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
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {log.type}
                                              </Badge>
                                            </div>
                                            <span className="text-xs">
                                              {log.timestamp}
                                            </span>
                                          </div>
                                          <div className="text-sm font-medium mb-1">
                                            {log.action}
                                          </div>
                                          <div className="text-sm mb-2">
                                            {log.details}
                                          </div>
                                          {log.metadata && (
                                            <div className="text-xs p-2 rounded border">
                                              <div className="font-mono">
                                                {Object.entries(
                                                  log.metadata
                                                ).map(([key, value]) => (
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
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Release Tab */}
                <TabsContent value="release" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Ready to Release
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Publish New Version</h3>
                            <p className="text-sm text-muted-foreground">
                              Create an immutable snapshot of this agent
                            </p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button onClick={handleSave}>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Publish Version
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-screen-xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Agent Lifecycle Management
                                </DialogTitle>
                                <DialogDescription>
                                  Define goals, run tests, and manage the
                                  release pipeline for {agent?.name}
                                </DialogDescription>
                              </DialogHeader>
                              <AgentLifecycle
                                agentId={agentId}
                                agentName={agent?.name || "Agent"}
                                currentVersion={agent?.version || "v1.0"}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Feedbacks Tab */}
                <TabsContent value="feedbacks" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Agent Feedbacks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Feedback Collection</h3>
                            <p className="text-sm text-muted-foreground">
                              Review human feedback on agent performance and
                              responses
                            </p>
                          </div>
                          <Button onClick={() => router.push("/feedbacks")}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            View All Feedbacks
                          </Button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {currentWorkspace.feedbacks?.filter(
                                (f: any) => f.agentId === agentId
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total Feedbacks
                            </div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {currentWorkspace.feedbacks?.filter(
                                (f: any) =>
                                  f.agentId === agentId &&
                                  f.status === "addressed"
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Addressed
                            </div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                              {currentWorkspace.feedbacks?.filter(
                                (f: any) =>
                                  f.agentId === agentId &&
                                  f.status === "pending"
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Pending
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Rules Tab */}
                <TabsContent value="rules" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        LLM-as-Judge Rules
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Evaluation Rules</h3>
                            <p className="text-sm text-muted-foreground">
                              Automated rules generated from feedback to
                              evaluate agent performance
                            </p>
                          </div>
                          <Button onClick={() => router.push("/rules")}>
                            <Scale className="h-4 w-4 mr-2" />
                            View All Rules
                          </Button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {currentWorkspace.rules?.filter(
                                (r: any) => r.agentId === agentId
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total Rules
                            </div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {currentWorkspace.rules?.filter(
                                (r: any) =>
                                  r.agentId === agentId && r.status === "active"
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Active
                            </div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {currentWorkspace.rules?.filter(
                                (r: any) =>
                                  r.agentId === agentId &&
                                  r.sourceType === "feedback"
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              From Feedback
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Experiments Tab */}
                <TabsContent value="experiments" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        A/B Testing & Experiments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              Performance Experiments
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Compare agent versions with statistical
                              significance
                            </p>
                          </div>
                          <Button onClick={() => router.push("/experiments")}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View All Experiments
                          </Button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {currentWorkspace.experiments?.filter(
                                (e: any) => e.agentId === agentId
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total Experiments
                            </div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {currentWorkspace.experiments?.filter(
                                (e: any) =>
                                  e.agentId === agentId &&
                                  e.status === "running"
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Running
                            </div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {currentWorkspace.experiments?.filter(
                                (e: any) =>
                                  e.agentId === agentId &&
                                  e.status === "completed"
                              ).length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Completed
                            </div>
                          </div>
                        </div>

                        {/* Simulation Link */}
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">
                                Agent Training Simulations
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Run historical tasks through rule scenarios to
                                train new versions
                              </p>
                            </div>
                            <Button
                              onClick={() => router.push("/simulations")}
                              variant="outline"
                            >
                              <TestTube className="h-4 w-4 mr-2" />
                              View Simulations
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
