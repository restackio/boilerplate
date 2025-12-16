"use client";

import { useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { PageHeader } from "@workspace/ui/components/page-header";


import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

import {
  AgentsTable,
} from "../../../agents/components/agents-table";
import { CreateAgentDialog } from "../../../agents/components/create-agent-dialog";

export default function TeamAgentsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { agents, agentsLoading, fetchAgents } = useWorkspaceScopedActions();

  useEffect(() => {
    if (isReady && currentWorkspaceId) {
      fetchAgents({ teamId });
    }
  }, [isReady, currentWorkspaceId, fetchAgents, teamId]);

  const handleAgentClick = (agentId: string) => {
    router.push(`/agents/${agentId}`);
  };

  const handleRefresh = () => {
    fetchAgents({ teamId });
  };

  const breadcrumbs = [{label: 'Teams'} ,{ label: 'Agents' }];

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
      <CreateAgentDialog onAgentCreated={() => fetchAgents({ teamId })} teamId={teamId} />
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-4">
        {agentsLoading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Error: {agentsLoading.error}
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
            onViewAgent={handleAgentClick}
            showTeamFilter={false}
          />
        )}
      </div>
    </div>
  );
}
