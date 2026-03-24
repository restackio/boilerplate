"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentsTable } from "./components/agents-table";
import { BuildTasksBlock } from "./components/build-tasks-block";
import { PageHeader } from "@workspace/ui/components/page-header";
import Link from "next/link";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Users } from "lucide-react";
import { getLucideIcon } from "@workspace/ui/lib/get-lucide-icon";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { CreateAgentDialog } from "./components/create-agent-dialog";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { isInProgressBuildTask } from "@/lib/build-task-utils";

export default function TechnicalSupportAgentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const {
    agents,
    agentsLoading,
    fetchAgents,
    tasks,
    fetchTasks,
    teams,
    fetchTeams,
    getBuildAgent,
  } = useWorkspaceScopedActions();

  const [buildAgentId, setBuildAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && currentWorkspaceId) {
      fetchAgents();
      fetchTasks();
      fetchTeams();
    }
  }, [isReady, currentWorkspaceId, fetchAgents, fetchTasks, fetchTeams]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    void getBuildAgent().then((r) => {
      if (cancelled || !r.success || !r.data) return;
      const id = (r.data as { id?: string }).id;
      if (id) setBuildAgentId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, getBuildAgent]);

  const handleAgentClick = (agentId: string) => {
    // Optimized navigation - uses Next.js router for instant navigation
    router.push(`/agents/${agentId}`);
  };

  const handleRefresh = () => {
    fetchAgents();
    fetchTasks();
  };

  const buildTasks = useMemo(
    () => tasks.filter((t) => isInProgressBuildTask(t, buildAgentId)),
    [tasks, buildAgentId],
  );

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
        options.push({
          label: team.name,
          value: team.name,
          icon: getLucideIcon(team.icon),
        });
      }
    });

    return options;
  }, [teams]);

  // Get initial filters from URL parameters
  const initialFilters = useMemo(() => {
    const teamParam = searchParams.get("team");
    if (teamParam) {
      return [
        {
          columnId: "team",
          type: "option" as const,
          operator: "is any of" as const,
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
        <RefreshCw
          className={`h-4 w-4 mr-1 ${agentsLoading.isLoading ? "animate-spin" : ""}`}
        />
        Refresh
      </Button>
      <CreateAgentDialog
        onAgentCreated={() => fetchAgents()}
        triggerLabel="New sub agent"
      />
      <Button size="sm" asChild>
        <Link href="/agents/new">
          <Plus className="h-4 w-4 mr-1" />
          New agent
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-4 space-y-6">
        {agentsLoading.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">Error: {agentsLoading.error}</p>
          </div>
        )}
        <BuildTasksBlock tasks={buildTasks} teams={teamOptions} />
        {agentsLoading.isLoading && agents.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-muted-foreground">
              Agents
            </h2>
            <AgentsTable
              data={agents}
              onRowClick={handleAgentClick}
              onViewAgent={handleAgentClick}
              teams={teamOptions}
              defaultFilters={initialFilters}
            />
          </>
        )}
      </div>
    </div>
  );
}
