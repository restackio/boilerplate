"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions, Agent } from "@/hooks/use-workspace-scoped-actions";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/ui/tabs";
import {
  TooltipProvider,
} from "@workspace/ui/components/ui/tooltip";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { PageHeader } from "@workspace/ui/components/page-header";
import AgentFlow from "@workspace/ui/components/agent-flow";
import {
  Bot,
  Play,
  Pause,
  Trash2,
  Settings,
  Workflow,
  History,
  Wrench,
  Webhook,
} from "lucide-react";
import { 
  AgentSetupTab, 
  AgentVersionsTab, 
  DeleteAgentModal,
  AgentToolsManager,
  WebhookTab
} from "./components";
import { getAgentTools, createAgentTool } from "@/app/actions/workflow";

export default function AgentEditPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const { isReady, workspaceId } = useDatabaseWorkspace();
  const { fetchAgents, updateAgent, createAgent, deleteAgent, agentsLoading, getAgentVersions, getAgentById } = useWorkspaceScopedActions();
  void agentsLoading; // Suppress unused warning

  // State for the individual agent
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loading states for buttons
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  // Track draft edits from AgentSetupTab to ensure Save uses latest UI state
  const [draft, setDraft] = useState<{ name: string; version: string; description: string; instructions: string; model?: string; reasoning_effort?: string } | null>(null);

  // Tab navigation state - default to setup
  const [activeTab, setActiveTab] = useState("setup");

  // Fetch the agent by ID on component mount
  useEffect(() => {
    const fetchAgent = async () => {
      if (!agentId || !isReady) return;
      
      setIsLoading(true);
      try {
        // Fetch only the specific agent by ID - much faster!
        const result = await getAgentById(agentId);
        if (result.success && result.data) {
          setAgent(result.data);
        } else {
          console.error("Failed to fetch agent:", result.error);
          setAgent(null);
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
        setAgent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, getAgentById, isReady]);

  const handleSave = async (agentData: { name: string; version: string; description: string; instructions: string; model?: string; reasoning_effort?: string }) => {
    if (!agent) return;

    setIsSaving(true);
    try {
      // Create a new version of the agent
      const latest = { ...(draft || {}), ...agentData };
      const newAgentData = {
        workspace_id: workspaceId,
        name: latest.name,
        version: latest.version,
        description: latest.description,
        instructions: latest.instructions,
        // propagate model settings if present
        model: latest.model,
        reasoning_effort: latest.reasoning_effort,
        status: "inactive" as const, // New versions start as inactive
        parent_agent_id: agentId, // Link to the current agent as parent
      };

      const result = await createAgent(newAgentData);
      if (result.success) {
        console.log("New agent version created successfully");
        const newAgent: any = result.data;
        // Clone tools from current agent to new version
        try {
          const toolsRes: any = await getAgentTools(agentId);
          const tools: any[] = toolsRes?.agent_tools || [];
          if (newAgent?.id && Array.isArray(tools) && tools.length > 0) {
            await Promise.all(
              tools.map((t: any) => {
                const payload: any = {
                  agent_id: newAgent.id,
                  tool_type: t.tool_type,
                };
                if (t.tool_type === "mcp") {
                  if (t.mcp_server_id) payload.mcp_server_id = t.mcp_server_id;
                  if (t.allowed_tools?.length) payload.allowed_tools = t.allowed_tools;
                }
                if (t.tool_type === "custom") {
                  if (t.config) payload.config = t.config;
                }
                if (typeof t.execution_order === "number") payload.execution_order = t.execution_order;
                return createAgentTool(payload);
              })
            );
            console.log(`Cloned ${tools.length} tools to new version ${newAgent.id}`);
          }
        } catch (e) {
          console.error("Failed to clone tools to new version", e);
        }
        alert("New version created successfully!");
        // Navigate to the new agent so UI reflects its instructions and tools
        if (newAgent?.id) {
          router.push(`/agents/${newAgent.id}`);
          return;
        }
        // Fallback: refresh agents list
        await fetchAgents();
      } else {
        console.error("Failed to create new agent version:", result.error);
        alert("Failed to create new version: " + result.error);
      }
    } catch (error) {
      console.error("Error creating new agent version:", error);
      alert("Error creating new version");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!agent) return;

    setIsTogglingStatus(true);
    try {
      const newStatus = agent.status === "active" ? "inactive" : "active";
      
      // Include all current agent data to avoid null constraint violations
      // Ensure required fields have valid values
      const updateData = {
        name: agent.name || "Unnamed Agent",
        version: agent.version || "v1.0",
        description: agent.description || "",
        instructions: agent.instructions || "You are a helpful agent. Please provide assistance to users.",
        status: newStatus as "active" | "inactive",
      };
      
      const result = await updateAgent(agentId, updateData);
      if (result.success) {
        setAgent({ ...agent, status: newStatus });
        console.log(`Agent status updated to ${newStatus}`);
      } else {
        console.error("Failed to update agent status:", result.error);
        alert("Failed to update status: " + result.error);
      }
    } catch (error) {
      console.error("Error updating agent status:", error);
      alert("Error updating status");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agent) return;

    setIsDeleting(true);
    try {
      const result = await deleteAgent(agentId);
      if (result.success) {
        console.log("Agent deleted successfully");
        // Redirect to agents list
        router.push("/agents");
      } else {
        console.error("Failed to delete agent:", result.error);
        alert("Failed to delete agent: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Error deleting agent");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Tab configuration
  const tabsConfig = [
    {
      id: "setup",
      label: "Setup",
      icon: Settings,
      enabled: true,
    },
    {
      id: "webhooks",
      label: "Webhooks",
      icon: Webhook,
      enabled: true,
    },
    {
      id: "flow",
      label: "Flow",
      icon: Workflow,
      enabled: true,
    },
    {
      id: "versions",
      label: "Versions",
      icon: History,
      enabled: true,
    },
  ];

  // Show loading state with skeleton layout
  if (!isReady || isLoading) {
    const skeletonBreadcrumbs = [
      { label: "Agents", href: "/agents" },
      { label: "Loading..." }, // Placeholder for agent name
    ];

    const skeletonActions = (
      <>
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </>
    );

    return (
      <TooltipProvider>
        <div className="flex-1">
          {/* Use actual PageHeader with skeleton content */}
          <PageHeader 
            breadcrumbs={skeletonBreadcrumbs} 
            actions={skeletonActions} 
            fixed={true}
          />

          {/* Main Content - with top padding for fixed header */}
          <div className="bg-primary-foreground p-4">
            <div className="space-y-6">
              {/* Tab Navigation Skeleton */}
              <div className="bg-background rounded-lg border">
                <div className="border-b bg-muted/30 rounded-t-lg px-4 py-2">
                  <div className="flex gap-1">
                    {tabsConfig.map((tab) => (
                      <div key={tab.id} className="flex items-center gap-2 px-4 py-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tab Content Skeleton */}
                <div className="p-6 space-y-6">
                  {/* Agent Setup Form Skeleton */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-32 w-full" />
                    </div>

                    {/* Model Settings Skeleton */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <Skeleton className="h-5 w-32" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>
                    </div>

                    {/* Tools Section Skeleton */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Show not found state
  if (!agent) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Agent not found</h2>
          <p className="text-muted-foreground">
            The agent you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button 
            onClick={() => router.push("/agents")} 
            className="mt-4"
            variant="outline"
          >
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: `${agent.name} ${agent.version}` },
  ];

  const actions = (
    <>
    <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowDeleteModal(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleToggleStatus}
        disabled={isTogglingStatus}
      >
        {isTogglingStatus ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {agent.status === "active" ? "Setting Inactive..." : "Setting Active..."}
          </>
        ) : agent.status === "active" ? (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Set inactive
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Set active
          </>
        )}
      </Button>
      <Button 
        onClick={() => handleSave({
          name: draft?.name ?? agent.name,
          version: draft?.version ?? agent.version,
          description: draft?.description ?? agent.description,
          instructions: draft?.instructions ?? agent.instructions,
          model: draft?.model,
          reasoning_effort: draft?.reasoning_effort,
        })} 
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Saving...
          </>
        ) : (
          "Save"
        )}
      </Button>
      
    </>
  );

  return (
    <TooltipProvider>
      <div className="flex-1">
        <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />

        {/* Delete Confirmation Modal */}
        <DeleteAgentModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAgent}
          agent={agent}
          isDeleting={isDeleting}
        />

        {/* Main Content - with top padding for fixed header */}
        <div className="bg-primary-foreground p-4">
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-background rounded-lg border">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b bg-muted/30 rounded-t-lg px-4 py-2">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                    {tabsConfig.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
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
                    })}
                  </TabsList>
                </div>

                {/* Setup Tab */}
                <TabsContent value="setup" className="p-6 space-y-6">
                  <AgentSetupTab
                    agent={agent}
                    onSave={handleSave}
                    isSaving={isSaving}
                    workspaceId={workspaceId}
                    onChange={(d) => setDraft(d)}
                  />
                </TabsContent>

                {/* Webhooks Tab */}
                <TabsContent value="webhooks" className="p-6">
                  <WebhookTab
                    agent={agent}
                    workspaceId={workspaceId}
                  />
                </TabsContent>

                {/* Flow Tab */}
                <TabsContent value="flow" className="p-0">
                  <div className="h-[800px]">
                    <AgentFlow />
                  </div>
                </TabsContent>

                {/* Versions Tab */}
                <TabsContent value="versions" className="p-6 space-y-6">
                  <AgentVersionsTab
                    agentId={agentId}
                    getAgentVersions={getAgentVersions}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
