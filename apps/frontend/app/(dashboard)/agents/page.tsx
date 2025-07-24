"use client";

import { useEffect } from "react";
import {
  AgentsTable,
} from "@workspace/ui/components/agents-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import AgentsTabs from "./AgentsTabs";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useApiHealth } from "@/hooks/use-api-health";
import { CreateAgentModal } from "@/components/create-agent-modal";

export default function TechnicalSupportAgentsPage() {
  const router = useRouter();
  const { agents, agentsLoading, fetchAgents } = useWorkspaceScopedActions();
  const { isHealthy, checkHealth } = useApiHealth();

  useEffect(() => {
    fetchAgents();
    checkHealth();
  }, [fetchAgents, checkHealth]);

  const handleAgentClick = (agentId: string) => {
    router.push(`/agents/${agentId}`);
  };

  const handleRefresh = () => {
    fetchAgents();
  };

  const breadcrumbs = [{ label: "Agents" }];

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleRefresh}
        disabled={agentsLoading.isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${agentsLoading.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <CreateAgentModal onAgentCreated={() => fetchAgents()} />
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <AgentsTabs />
      <div className="p-4">
        {agentsLoading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Error: {agentsLoading.error}
              {!isHealthy && " (API may be unavailable)"}
            </p>
          </div>
        )}
        {agentsLoading.isLoading && agents.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          </div>
        ) : (
          <AgentsTable 
            data={agents} 
            onRowClick={handleAgentClick}
          />
        )}
      </div>
    </div>
  );
}
