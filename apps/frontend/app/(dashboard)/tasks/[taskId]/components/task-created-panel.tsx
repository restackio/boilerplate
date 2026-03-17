"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bot, Database, LayoutGrid, Plug, ExternalLink } from "lucide-react";
import {
  Task,
  type PatternSpecs,
} from "@/hooks/use-workspace-scoped-actions";

interface TaskCreatedPanelProps {
  task: Task;
}

interface CreatedItem {
  id: string;
  name: string;
  href?: string;
}

function deriveFromPatternSpecs(patternSpecs: PatternSpecs | undefined) {
  const nodes = patternSpecs?.nodes ?? [];
  const agents: CreatedItem[] = [];
  const datasets: CreatedItem[] = [];
  const views: { id: string; name: string; href: string }[] = [];
  const integrations: CreatedItem[] = [];
  const seen = { agent: new Set<string>(), dataset: new Set<string>(), view: new Set<string>(), integration: new Set<string>() };
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
      views.push({ id, name, href: href ?? "#" });
    } else if (et === "integration" && id && !seen.integration.has(id)) {
      seen.integration.add(id);
      integrations.push({ id, name, href: href ?? `/integrations/${id}` });
    }
  }
  return { agents, datasets, views, integrations };
}

export function TaskCreatedPanel({ task }: TaskCreatedPanelProps) {
  const viewSpecs = task.view_specs ?? [];
  const fromPattern = useMemo(
    () => deriveFromPatternSpecs(task.pattern_specs),
    [task.pattern_specs],
  );
  const agentState = task.agent_state as
    | {
        created_agents?: CreatedItem[];
        created_datasets?: CreatedItem[];
        created_integrations?: CreatedItem[];
      }
    | undefined;
  const hasPattern =
    (task.pattern_specs?.nodes?.length ?? 0) > 0 &&
    (fromPattern.agents.length > 0 ||
      fromPattern.datasets.length > 0 ||
      fromPattern.views.length > 0 ||
      fromPattern.integrations.length > 0);
  const createdAgents = hasPattern ? fromPattern.agents : (agentState?.created_agents ?? []);
  const createdDatasets = hasPattern ? fromPattern.datasets : (agentState?.created_datasets ?? []);
  const createdIntegrations = hasPattern ? fromPattern.integrations : (agentState?.created_integrations ?? []);
  const viewItems =
    viewSpecs.length > 0
      ? viewSpecs.map((v) => ({
          id: v.id,
          name: v.name,
          href: `/datasets/${v.dataset_id}/views/${v.id}`,
          dataset_id: v.dataset_id,
        }))
      : fromPattern.views.map((v) => ({ ...v, dataset_id: undefined as string | undefined }));

  const hasAny =
    viewItems.length > 0 ||
    createdAgents.length > 0 ||
    createdDatasets.length > 0 ||
    createdIntegrations.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Agents, datasets, integrations, and views created during this build. Use
        the links below to open them.
      </p>

      {!hasAny && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nothing created. As the builder creates agents, datasets,
          integrations, or views, they will appear here.
        </div>
      )}

      {viewItems.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <LayoutGrid className="h-4 w-4" />
            Views
          </h3>
          <ul className="space-y-1.5">
            {viewItems.map((view) => (
              <li key={view.id}>
                <Link
                  href={view.href}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {view.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                {view.dataset_id && (
                  <span className="text-xs text-muted-foreground ml-6">
                    Dataset: {view.dataset_id.slice(0, 8)}…
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {createdAgents.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4" />
            Agents
          </h3>
          <ul className="space-y-1.5">
            {createdAgents.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href ?? `/agents/${item.id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {item.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {createdDatasets.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" />
            Datasets
          </h3>
          <ul className="space-y-1.5">
            {createdDatasets.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href ?? `/datasets/${item.id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {item.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {createdIntegrations.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Plug className="h-4 w-4" />
            Integrations
          </h3>
          <ul className="space-y-1.5">
            {createdIntegrations.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href ?? `/integrations/${item.id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {item.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
