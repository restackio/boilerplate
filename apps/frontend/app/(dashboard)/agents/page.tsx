"use client";

import { useEffect, useMemo } from "react";
import {
  AgentsTable,
} from "./components/agents-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Users } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { CreateAgentDialog } from "./components/create-agent-dialog";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export default function TechnicalSupportAgentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { agents, agentsLoading, fetchAgents, teams, fetchTeams } = useWorkspaceScopedActions();

  useEffect(() => {
    if (isReady && currentWorkspaceId) {
      fetchAgents();
      fetchTeams();
    }
  }, [isReady, currentWorkspaceId, fetchAgents, fetchTeams]);

  const handleAgentClick = (agentId: string) => {
    // Optimized navigation - uses Next.js router for instant navigation
    router.push(`/agents/${agentId}`);
  };

  const handleRefresh = () => {
    fetchAgents();
  };

  // Create team options for filtering
  const teamOptions = useMemo(() => {
    const uniqueTeams = new Set<string>();
    const options = [];
    
    // Add "No Team" option
    options.push({ label: "No Team", value: "No Team", icon: Users });
    
    // Add teams from the teams list
    teams.forEach((team) => {
      if (!uniqueTeams.has(team.name)) {
        uniqueTeams.add(team.name);
        options.push({ label: team.name, value: team.name, icon: Users });
      }
    });
    
    return options;
  }, [teams]);

  // Get initial filters from URL parameters
  const initialFilters = useMemo(() => {
    const teamParam = searchParams.get('team');
    if (teamParam) {
      return [
        {
          columnId: 'team',
          type: 'option' as const,
          operator: 'is any of' as const,
          values: [teamParam],
        },
      ];
    }
    return [];
  }, [searchParams]);

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
      <CreateAgentDialog onAgentCreated={() => fetchAgents()} />
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
            teams={teamOptions}
            defaultFilters={initialFilters}
          />
        )}
      </div>
    </div>
  );
}
