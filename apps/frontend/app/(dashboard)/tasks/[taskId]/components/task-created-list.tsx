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
import { PatternFlowViewer } from "@workspace/ui/components/pattern-flow-viewer";
import {
  Task,
  type PatternSpecs,
} from "@/hooks/use-workspace-scoped-actions";

interface CreatedItem {
  id: string;
  name: string;
  href?: string;
}

/** Derive created agents, datasets, views, integrations from task.pattern_specs nodes (single source of truth when present). */
function deriveCreatedFromPatternSpecs(patternSpecs: PatternSpecs | undefined): {
  agents: CreatedItem[];
  datasets: CreatedItem[];
  views: { id: string; name: string; href: string }[];
  integrations: CreatedItem[];
} {
  const nodes = patternSpecs?.nodes ?? [];
  const agents: CreatedItem[] = [];
  const datasets: CreatedItem[] = [];
  const views: { id: string; name: string; href: string }[] = [];
  const integrations: CreatedItem[] = [];
  const seen = {
    agent: new Set<string>(),
    dataset: new Set<string>(),
    view: new Set<string>(),
    integration: new Set<string>(),
  };
  for (const node of nodes) {
    const et = node.data?.entityType;
    const id = node.data?.entityId ?? node.id;
    const name = node.data?.label ?? "Unnamed";
    const href = node.data?.href;
    if (et === "agent" && id && !seen.agent.has(id)) {
      seen.agent.add(id);
      agents.push({ id, name, href: href ?? `/agents/${id}` });
    } else if (et === "dataset" && id && !seen.dataset.has(id)) {
      seen.dataset.add(id);
      datasets.push({ id, name, href: href ?? `/datasets/${id}` });
    } else if (et === "view" && id && !seen.view.has(id)) {
      seen.view.add(id);
      views.push({
        id,
        name,
        href: href ?? "#",
      });
    } else if (et === "integration" && id && !seen.integration.has(id)) {
      seen.integration.add(id);
      integrations.push({ id, name, href: href ?? `/integrations/${id}` });
    }
  }
  return { agents, datasets, views, integrations };
}

/** First dataset id created by the build (from pattern_specs or agent_state), or null. Use when adding files in agent builder to prefer that dataset. */
export function getBuildCreatedDatasetId(task: Task): string | null {
  const fromPattern = deriveCreatedFromPatternSpecs(task.pattern_specs);
  if (fromPattern.datasets.length > 0) return fromPattern.datasets[0].id;
  const fromEvents = deriveCreatedFromEvents(task.agent_state);
  if (fromEvents.datasets.length > 0) return fromEvents.datasets[0].id;
  return null;
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

    if ((tool === "updateagent" || tool === "createagent") && out.agent_id) {
      const id = String(out.agent_id);
      if (!seen.agent.has(id)) {
        seen.agent.add(id);
        agents.push({ id, name, href: `/agents/${id}` });
      }
    } else if (
      (tool === "updatedataset" || tool === "createdataset") &&
      out.dataset_id
    ) {
      const id = String(out.dataset_id);
      if (!seen.dataset.has(id)) {
        seen.dataset.add(id);
        datasets.push({ id, name, href: `/datasets/${id}` });
      }
    } else if (
      (tool === "updateintegration" ||
        tool === "createintegrationfromremotemcp" ||
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
  /** Live agent state while task is in progress (so created list appears during build without refresh). */
  responseState?: unknown;
}

export function TaskCreatedList({
  task,
  onRefresh,
  responseState,
}: TaskCreatedListProps) {
  const viewSpecs = task.view_specs ?? [];
  const isTaskActive = task?.status === "in_progress";
  const liveState = useMemo(() => {
    if (
      isTaskActive &&
      responseState &&
      typeof responseState === "object" &&
      Array.isArray((responseState as { events?: unknown[] }).events)
    ) {
      return { events: (responseState as { events: unknown[] }).events };
    }
    return null;
  }, [isTaskActive, responseState]);

  const agentState = task.agent_state as
    | {
        events?: unknown[];
        created_agents?: CreatedItem[];
        created_datasets?: CreatedItem[];
        created_integrations?: CreatedItem[];
      }
    | undefined;

  const fromPatternSpecs = useMemo(
    () => deriveCreatedFromPatternSpecs(task.pattern_specs),
    [task.pattern_specs],
  );
  const derived = useMemo(
    () => deriveCreatedFromEvents(liveState ?? task.agent_state),
    [liveState, task.agent_state],
  );

  const hasPatternEntities =
    (task.pattern_specs?.nodes?.length ?? 0) > 0 &&
    (fromPatternSpecs.agents.length > 0 ||
      fromPatternSpecs.datasets.length > 0 ||
      fromPatternSpecs.views.length > 0 ||
      fromPatternSpecs.integrations.length > 0);

  const createdAgents = hasPatternEntities
    ? fromPatternSpecs.agents
    : (agentState?.created_agents?.length
        ? agentState.created_agents
        : derived.agents) ?? [];
  const createdDatasets = hasPatternEntities
    ? fromPatternSpecs.datasets
    : (agentState?.created_datasets?.length
        ? agentState.created_datasets
        : derived.datasets) ?? [];
  const createdIntegrations = hasPatternEntities
    ? fromPatternSpecs.integrations
    : (agentState?.created_integrations?.length
        ? agentState.created_integrations
        : derived.integrations) ?? [];
  const createdViewsFromPattern = hasPatternEntities
    ? fromPatternSpecs.views
    : [];

  const viewItems =
    viewSpecs.length > 0
      ? viewSpecs.map((view) => ({
          id: view.id,
          name: view.name,
          href: `/datasets/${view.dataset_id}/views/${view.id}`,
        }))
      : createdViewsFromPattern;

  const hasAny =
    viewItems.length > 0 ||
    createdAgents.length > 0 ||
    createdDatasets.length > 0 ||
    createdIntegrations.length > 0;

  const hasPatternFlow =
    (task.pattern_specs?.nodes?.length ?? 0) > 0;

  const totalCount =
    viewItems.length +
    createdAgents.length +
    createdDatasets.length +
    createdIntegrations.length;

  const sectionTitle =
    task.status === "in_progress" ? "Plan" : "Created";

  const hasContent = hasPatternFlow || hasAny;

  const [isExpanded, setIsExpanded] = useState(hasContent);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-expand when content appears (flow or list)
  useEffect(() => {
    if (hasContent) setIsExpanded(true);
  }, [hasContent]);

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

  if (!hasContent) return null;

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
        <span className="text-sm font-medium text-foreground">{sectionTitle}</span>
        {hasAny && (
          <span className="text-sm text-muted-foreground">
            {totalCount} item{totalCount !== 1 ? "s" : ""}
          </span>
        )}
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
        <div className="space-y-3 pl-1">
          {hasPatternFlow && task.pattern_specs && (
            <div className="rounded-md border border-border/60 bg-background/80 overflow-hidden">
              <PatternFlowViewer
                patternSpecs={task.pattern_specs}
                height={260}
                className="w-full"
              />
            </div>
          )}
          <div className="space-y-2">
            <CreatedSection
              icon={LayoutGrid}
              items={viewItems}
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
        </div>
      )}
    </div>
  );
}
