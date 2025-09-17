"use client";

import { AgentStatusBadge } from "@workspace/ui/components/agent-status-badge";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Agent } from "@/hooks/use-workspace-scoped-actions";

interface PlaygroundHeaderProps {
  draftAgent: Agent;
  comparisonAgent: Agent | null;
}

export function PlaygroundHeader({ draftAgent, comparisonAgent }: PlaygroundHeaderProps) {
  const breadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: draftAgent.name, href: `/agents/${draftAgent.id}` },
    { label: "Playground" },
  ];

  const actions = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Draft:</span>
        <AgentStatusBadge status={draftAgent.status as "draft" | "published" | "archived"} size="sm" />
        <span className="text-sm text-muted-foreground">
          {draftAgent.id.slice(-8)}
        </span>
      </div>
      
      {comparisonAgent && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">vs</span>
          <AgentStatusBadge status={comparisonAgent.status as "draft" | "published" | "archived"} size="sm" />
          <span className="text-sm text-muted-foreground">
            {comparisonAgent.id.slice(-8)}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <PageHeader
      breadcrumbs={breadcrumbs}
      actions={actions}
      fixed={false}
    />
  );
}
