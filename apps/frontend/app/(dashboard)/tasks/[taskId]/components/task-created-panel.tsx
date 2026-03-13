"use client";

import Link from "next/link";
import { Bot, Database, LayoutGrid, Plug, ExternalLink } from "lucide-react";
import { Task } from "@/hooks/use-workspace-scoped-actions";

interface TaskCreatedPanelProps {
  task: Task;
}

interface CreatedItem {
  id: string;
  name: string;
  href?: string;
}

export function TaskCreatedPanel({ task }: TaskCreatedPanelProps) {
  const viewSpecs = task.view_specs ?? [];
  const agentState = task.agent_state as
    | {
        created_agents?: CreatedItem[];
        created_datasets?: CreatedItem[];
        created_integrations?: CreatedItem[];
      }
    | undefined;
  const createdAgents = agentState?.created_agents ?? [];
  const createdDatasets = agentState?.created_datasets ?? [];
  const createdIntegrations = agentState?.created_integrations ?? [];

  const hasAny =
    viewSpecs.length > 0 ||
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

      {viewSpecs.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <LayoutGrid className="h-4 w-4" />
            Views
          </h3>
          <ul className="space-y-1.5">
            {viewSpecs.map((view) => (
              <li key={view.id}>
                <Link
                  href={`/datasets/${view.dataset_id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {view.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <span className="text-xs text-muted-foreground ml-6">
                  Dataset: {view.dataset_id.slice(0, 8)}…
                </span>
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
