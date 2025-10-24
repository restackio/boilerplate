"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/ui/tabs";
import {
  Settings,
  Webhook,
  History,
} from "lucide-react";
import { Agent, ApiResponse } from "@/hooks/use-workspace-scoped-actions";
import { AgentSetupTab, AgentVersionsTab, WebhookTab, AgentConfigData } from "./";

import AgentFlow from "@workspace/ui/components/agent-flow";

interface RawAgent {
  id: string;
  name: string;
  description?: string;
  status: "published" | "draft" | "archived";
  created_at?: string;
  updated_at?: string;
  parent_agent_id?: string;
}

interface AgentTabNavigationProps {
  agent: Agent;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onChange: (draft: Partial<AgentConfigData>) => void;
  draft: AgentConfigData | null;
  isSaving: boolean;
  workspaceId: string;
  agentId: string;
  getAgentVersions: (agentId: string) => Promise<ApiResponse<RawAgent[]>>;
}

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
  // {
  //   id: "flow",
  //   label: "Flow",
  //   icon: Workflow,
  //   enabled: true,
  // },
  {
    id: "versions",
    label: "Version history",
    icon: History,
    enabled: true,
  },
];

export function AgentTabNavigation({
  agent,
  activeTab,
  onTabChange,
  onChange,
  draft,
  isSaving,
  workspaceId,
  agentId,
  getAgentVersions,
}: AgentTabNavigationProps) {
  return (
    <div className="bg-background rounded-lg border">
      <Tabs value={activeTab} onValueChange={onTabChange}>
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
          {agent.status === "published" && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                This agent is published and cannot be edited. Click &quot;New version&quot; to create a draft version for editing.
              </p>
            </div>
          )}
          <AgentSetupTab
            agent={agent}
            draft={draft}
            onChange={onChange}
            isSaving={isSaving}
            workspaceId={workspaceId}
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
  );
}
