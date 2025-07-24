"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import { useWorkspaceScopedActions, Agent } from "@/hooks/use-workspace-scoped-actions";
import { Button } from "@workspace/ui/components/ui/button";
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
import AgentFlow from "@workspace/ui/components/agent-flow";
import {
  Bot,
  Play,
  Pause,
  Trash2,
  Settings,
  Workflow,
  History,
} from "lucide-react";
import { 
  AgentSetupTab, 
  AgentVersionsTab, 
  DeleteAgentModal 
} from "./components";
import { Agent as LocalAgent } from "./types";

export default function AgentEditPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const { currentWorkspace } = useWorkspace();
  const { agents, fetchAgents, updateAgent, createAgent, deleteAgent, agentsLoading, getAgentVersions } = useWorkspaceScopedActions();

  // State for the individual agent
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loading states for buttons
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Tab navigation state - default to setup
  const [activeTab, setActiveTab] = useState("setup");

  // Fetch the agent by ID on component mount
  useEffect(() => {
    const fetchAgent = async () => {
      if (!agentId) return;
      
      setIsLoading(true);
      try {
        // Fetch all agents and find the specific one
        const result = await fetchAgents();
        if (result.success && result.data) {
          const foundAgent = result.data.find((a: Agent) => a.id === agentId);
          if (foundAgent) {
            setAgent(foundAgent);
          } else {
            console.error("Agent not found:", agentId);
            // Fallback to demo data if API fails
            const fallbackAgent = currentWorkspace.agents.find((a) => a.id === agentId);
            if (fallbackAgent) {
              // Convert demo agent to backend agent format
              const convertedAgent: Agent = {
                id: fallbackAgent.id,
                name: fallbackAgent.name,
                version: fallbackAgent.version,
                description: fallbackAgent.description,
                instructions: fallbackAgent.instructions,
                status: fallbackAgent.status === "active" ? "active" : "inactive", // Convert status
                parent_agent_id: undefined, // Demo data doesn't have this
                created_at: undefined, // Demo data doesn't have this
                updated_at: undefined, // Demo data doesn't have this
                version_count: 1, // Default value
                latest_version: fallbackAgent.version, // Use current version
              };
              setAgent(convertedAgent);
            } else {
              setAgent(null);
            }
          }
        } else {
          console.error("Failed to fetch agents:", result.error);
          // Fallback to demo data if API fails
          const fallbackAgent = currentWorkspace.agents.find((a) => a.id === agentId);
          if (fallbackAgent) {
            // Convert demo agent to backend agent format
            const convertedAgent: Agent = {
              id: fallbackAgent.id,
              name: fallbackAgent.name,
              version: fallbackAgent.version,
              description: fallbackAgent.description,
              instructions: fallbackAgent.instructions,
              status: fallbackAgent.status === "active" ? "active" : "inactive", // Convert status
              parent_agent_id: undefined, // Demo data doesn't have this
              created_at: undefined, // Demo data doesn't have this
              updated_at: undefined, // Demo data doesn't have this
              version_count: 1, // Default value
              latest_version: fallbackAgent.version, // Use current version
            };
            setAgent(convertedAgent);
          } else {
            setAgent(null);
          }
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
        // Fallback to demo data if API fails
        const fallbackAgent = currentWorkspace.agents.find((a) => a.id === agentId);
        if (fallbackAgent) {
          // Convert demo agent to backend agent format
          const convertedAgent: Agent = {
            id: fallbackAgent.id,
            name: fallbackAgent.name,
            version: fallbackAgent.version,
            description: fallbackAgent.description,
            instructions: fallbackAgent.instructions,
            status: fallbackAgent.status === "active" ? "active" : "inactive", // Convert status
            parent_agent_id: undefined, // Demo data doesn't have this
            created_at: undefined, // Demo data doesn't have this
            updated_at: undefined, // Demo data doesn't have this
            version_count: 1, // Default value
            latest_version: fallbackAgent.version, // Use current version
          };
          setAgent(convertedAgent);
        } else {
          setAgent(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, fetchAgents, currentWorkspace.agents]);

  const handleSave = async (agentData: any) => {
    if (!agent) return;

    setIsSaving(true);
    try {
      // Create a new version of the agent
      const newAgentData = {
        name: agentData.name,
        version: agentData.version,
        description: agentData.description,
        instructions: agentData.instructions,
        status: "inactive" as const, // New versions start as inactive
        parent_agent_id: agentId, // Link to the current agent as parent
      };

      const result = await createAgent(newAgentData);
      if (result.success) {
        console.log("New agent version created successfully");
        // Optionally redirect to the new agent or refresh the current one
        // For now, we'll just show a success message
        alert("New version created successfully!");
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <h2 className="text-lg font-semibold mb-2">Loading agent...</h2>
          <p className="text-muted-foreground">
            Fetching agent details from the database.
          </p>
        </div>
      </div>
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
            The agent you're looking for doesn't exist or has been removed.
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
          name: agent.name,
          version: agent.version,
          description: agent.description,
          instructions: agent.instructions,
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
        <div className="bg-primary-foreground pt-8 p-4">
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
