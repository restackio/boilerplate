"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Bot,
  Database,
  LayoutGrid,
  Plug,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { Task } from "@/hooks/use-workspace-scoped-actions";

interface CreatedItem {
  id: string;
  name: string;
  href?: string;
}

/** Single row: icon + link + category label (e.g. "• View"). */
function CreatedSection({
  icon: Icon,
  items,
  categoryLabel,
}: {
  icon: LucideIcon;
  items: { id: string; name: string; href: string }[];
  categoryLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <Link
                href={item.href}
                target="_blank"
                className="text-primary hover:underline"
              >
                <span className="truncate">{item.name}</span>
              </Link>
              <span className="text-muted-foreground shrink-0">
                • {categoryLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Derive created agents, datasets, integrations from task.agent_state.events when backend doesn't persist them. */
function deriveCreatedFromEvents(agentState: Task["agent_state"]): {
  agents: CreatedItem[];
  datasets: CreatedItem[];
  integrations: CreatedItem[];
} {
  const events = agentState?.events ?? [];
  const agents: CreatedItem[] = [];
  const datasets: CreatedItem[] = [];
  const integrations: CreatedItem[] = [];
  const seen = {
    agent: new Set<string>(),
    dataset: new Set<string>(),
    integration: new Set<string>(),
  };

  for (const event of events) {
    if (event?.type !== "response.output_item.done" || !event.item) continue;
    const item = event.item as {
      type?: string;
      name?: string;
      output?: unknown;
      result?: unknown;
    };
    if (item.type !== "mcp_call" || !item.name) continue;
    const out = (item.output ?? item.result) as
      | Record<string, unknown>
      | undefined;
    if (!out || out.success !== true) continue;

    const name =
      (out.name as string) ?? (out.server_label as string) ?? "Unnamed";
    const tool = String(item.name).replace(/_/g, "").toLowerCase();

    if (tool === "createagent" && out.agent_id) {
      const id = String(out.agent_id);
      if (!seen.agent.has(id)) {
        seen.agent.add(id);
        agents.push({ id, name, href: `/agents/${id}` });
      }
    } else if (tool === "createdataset" && out.dataset_id) {
      const id = String(out.dataset_id);
      if (!seen.dataset.has(id)) {
        seen.dataset.add(id);
        datasets.push({ id, name, href: `/datasets/${id}` });
      }
    } else if (
      (tool === "createintegrationfromremotemcp" ||
        tool === "create_integration_from_remote_mcp") &&
      out.mcp_server_id
    ) {
      const id = String(out.mcp_server_id);
      if (!seen.integration.has(id)) {
        seen.integration.add(id);
        integrations.push({ id, name, href: `/integrations/${id}` });
      }
    }
  }

  return { agents, datasets, integrations };
}

interface TaskCreatedListProps {
  task: Task;
  /** Callback to refetch task (updates agent_state / view_specs so created items appear). */
  onRefresh?: () => void | Promise<void>;
}

export function TaskCreatedList({ task, onRefresh }: TaskCreatedListProps) {
  const viewSpecs = task.view_specs ?? [];
  const agentState = task.agent_state as
    | {
        events?: unknown[];
        created_agents?: CreatedItem[];
        created_datasets?: CreatedItem[];
        created_integrations?: CreatedItem[];
      }
    | undefined;

  const derived = useMemo(
    () => deriveCreatedFromEvents(task.agent_state),
    [task.agent_state],
  );

  const createdAgents =
    (agentState?.created_agents?.length
      ? agentState.created_agents
      : derived.agents) ?? [];
  const createdDatasets =
    (agentState?.created_datasets?.length
      ? agentState.created_datasets
      : derived.datasets) ?? [];
  const createdIntegrations =
    (agentState?.created_integrations?.length
      ? agentState.created_integrations
      : derived.integrations) ?? [];

  const hasAny =
    viewSpecs.length > 0 ||
    createdAgents.length > 0 ||
    createdDatasets.length > 0 ||
    createdIntegrations.length > 0;

  const totalCount =
    viewSpecs.length +
    createdAgents.length +
    createdDatasets.length +
    createdIntegrations.length;

  const [isExpanded, setIsExpanded] = useState(hasAny);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-expand when items appear (e.g. after refresh)
  useEffect(() => {
    if (hasAny) setIsExpanded(true);
  }, [hasAny]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Hide list only when there are no items and no way to refresh (e.g. not a build task)
  if (!hasAny && !onRefresh) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto border border-border/40 bg-muted/90 p-2 rounded-lg space-y-2">
      <div
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <span className="text-sm font-medium text-foreground">Created</span>
        <span className="text-sm text-muted-foreground">
          {totalCount} item{totalCount !== 1 ? "s" : ""}
        </span>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-auto"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh created items"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-2 pl-1">
          {!hasAny && (
            <p className="text-xs text-muted-foreground py-1">No items.</p>
          )}
          <CreatedSection
            icon={LayoutGrid}
            items={viewSpecs.map((view) => ({
              id: view.id,
              name: view.name,
              href: `/datasets/${view.dataset_id}/views/${view.id}`,
            }))}
            categoryLabel="View"
          />
          <CreatedSection
            icon={Bot}
            items={createdAgents.map((item) => ({
              id: item.id,
              name: item.name,
              href: item.href ?? `/agents/${item.id}`,
            }))}
            categoryLabel="Agent"
          />
          <CreatedSection
            icon={Database}
            items={createdDatasets.map((item) => ({
              id: item.id,
              name: item.name,
              href: item.href ?? `/datasets/${item.id}`,
            }))}
            categoryLabel="Dataset"
          />
          <CreatedSection
            icon={Plug}
            items={createdIntegrations.map((item) => ({
              id: item.id,
              name: item.name,
              href: item.href ?? `/integrations/${item.id}`,
            }))}
            categoryLabel="Integration"
          />
        </div>
      )}
    </div>
  );
}
