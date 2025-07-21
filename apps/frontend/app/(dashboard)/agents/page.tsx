"use client";

import {
  AgentsTable,
  type AgentExperiment,
} from "@workspace/ui/components/agents-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AgentsTabs from "./AgentsTabs";

export default function TechnicalSupportAgentsPage() {
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  // Map workspace agent data to AgentExperiment format
  const experiments: AgentExperiment[] = currentWorkspace.agents
    .filter((agent) =>
      ["github", "slack", "email", "alerts", "intercom", "salesforce", "mailchimp", "bamboohr", "instagram"].includes(agent.channel)
    )
    .map((agent) => ({
      ...agent,
      version: agent.version || "v1.0", // Provide default if missing
    })) as AgentExperiment[];

  const handleAgentClick = (agentId: string) => {
    router.push(`/agents/${agentId}`);
  };

  const breadcrumbs = [{ label: "Agents" }];

  const actions = (
    <Button size="sm" variant="ghost">
      <Plus className="h-4 w-4 mr-1" />
      New Agent
    </Button>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <AgentsTabs />
      <div className="p-4">
        <AgentsTable data={experiments} onRowClick={handleAgentClick} />
      </div>
    </div>
  );
}
