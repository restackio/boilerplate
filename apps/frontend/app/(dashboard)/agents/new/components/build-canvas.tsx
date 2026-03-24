"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Bot,
  Database,
  LayoutGrid,
  Workflow,
  Calendar,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { PatternFlowViewer } from "@workspace/ui/components/pattern-flow-viewer";
import { AgentsTable } from "@/app/(dashboard)/agents/components/agents-table";
import type { Agent } from "@/app/(dashboard)/agents/components/agents-table";
import { DatasetsTable } from "@/app/(dashboard)/datasets/components/datasets-table";
import type { Dataset } from "@/app/(dashboard)/datasets/components/datasets-table";
import { ViewsTable } from "@/app/(dashboard)/datasets/components/views-table";
import type { ViewSpecRow } from "@/app/(dashboard)/datasets/components/views-table";
import { TasksTable } from "@/app/(dashboard)/tasks/components/tasks-table";
import { deriveCreatedFromPatternSpecs } from "@/app/(dashboard)/tasks/[taskId]/components/task-created-list";
import type { DatasetFileSummary } from "@/app/(dashboard)/datasets/components/dataset-files-table";
import { TaskFilesList } from "@/app/(dashboard)/tasks/[taskId]/components/task-files-list";
import type { PatternSpecs, Task } from "@/hooks/use-workspace-scoped-actions";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { cn } from "@workspace/ui/lib/utils";

export interface BuildSummaryAgent {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  type?: string;
}

export interface BuildSummaryDataset {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
}

export interface BuildSummaryViewSpec {
  id: string;
  name: string;
  columns: { key: string; label: string }[];
  dataset_id: string;
}

export interface BuildSummary {
  agents: BuildSummaryAgent[];
  datasets: BuildSummaryDataset[];
  tasks: Task[];
  view_specs: BuildSummaryViewSpec[];
}

type BuildStage = "starting" | "plan" | "building" | "built";

function getStage(task: Task): BuildStage {
  const hasPatternNodes = (task.pattern_specs?.nodes?.length ?? 0) > 0;
  const fromPattern = deriveCreatedFromPatternSpecs(task.pattern_specs);
  const hasCreatedEntities =
    fromPattern.agents.length > 0 ||
    fromPattern.datasets.length > 0 ||
    fromPattern.views.length > 0;
  if (!hasPatternNodes) return "starting";
  if (!hasCreatedEntities) return "plan";
  if (task.status === "in_progress") return "building";
  return "built";
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultExpanded: boolean;
  /** When this becomes true after being false (e.g. first sync adds rows), expand once without overriding manual toggles for already-filled sections. */
  hasContent?: boolean;
  sectionKey: string;
  taskId: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultExpanded,
  hasContent,
  sectionKey,
  taskId,
  children,
}: CollapsibleSectionProps) {
  const storageKey = `build-canvas-${taskId}-${sectionKey}`;
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return defaultExpanded;
    const stored = sessionStorage.getItem(storageKey);
    if (stored !== null) return stored === "1";
    return defaultExpanded;
  });

  const prevHasContent = useRef<boolean | null>(null);
  useEffect(() => {
    if (hasContent === undefined) return;
    if (prevHasContent.current === null) {
      prevHasContent.current = hasContent;
      return;
    }
    if (hasContent && !prevHasContent.current) {
      setExpanded(true);
    }
    prevHasContent.current = hasContent;
  }, [hasContent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(storageKey, expanded ? "1" : "0");
  }, [expanded, storageKey]);

  return (
    <section className="rounded-lg border border-border/60 bg-background/60 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={`${sectionKey}-content`}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div id={`${sectionKey}-content`} className="px-3 pb-3">
          {children}
        </div>
      )}
    </section>
  );
}

function toTableTask(t: Task): {
  id: string;
  title: string;
  description?: string;
  status: Task["status"];
  agent_id: string;
  agent_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  team_id?: string;
  team_name?: string;
  created: string;
  updated: string;
  [key: string]: unknown;
} {
  return {
    ...t,
    created: t.created_at ?? "",
    updated: t.updated_at ?? "",
  };
}

function toAgentRow(a: BuildSummaryAgent, isPlanned: boolean): Agent {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? "",
    instructions: "",
    status: isPlanned ? "planned" : "published",
    type: (a.type as Agent["type"]) ?? "interactive",
    team_name: "No Team",
  };
}

function toDatasetRow(d: BuildSummaryDataset): Dataset {
  return {
    id: d.id,
    workspace_id: d.workspace_id,
    name: d.name,
    description: d.description ?? "",
    storage_type: "—",
    storage_config: {},
    last_updated_at: null,
    created_at: "",
    updated_at: "",
  };
}

/** True when the row exists in the build summary API or the pattern node has a real link (materialized). */
function isMaterializedAgent(
  id: string,
  buildSummary: BuildSummary | null | undefined,
  fromPattern: ReturnType<typeof deriveCreatedFromPatternSpecs>,
): boolean {
  if (buildSummary?.agents.some((x) => x.id === id)) return true;
  const p = fromPattern.agents.find((x) => x.id === id);
  return Boolean(p?.href && p.href.startsWith("/"));
}

function isMaterializedDataset(
  id: string,
  buildSummary: BuildSummary | null | undefined,
  fromPattern: ReturnType<typeof deriveCreatedFromPatternSpecs>,
): boolean {
  if (buildSummary?.datasets.some((x) => x.id === id)) return true;
  const p = fromPattern.datasets.find((x) => x.id === id);
  return Boolean(p?.href && p.href.startsWith("/"));
}

function isMaterializedView(
  id: string,
  buildSummary: BuildSummary | null | undefined,
  fromPattern: ReturnType<typeof deriveCreatedFromPatternSpecs>,
): boolean {
  if (buildSummary?.view_specs?.some((x) => x.id === id)) return true;
  const p = fromPattern.views.find((x) => x.id === id);
  return Boolean(p?.href && p.href.startsWith("/"));
}

export interface BuildCanvasProps {
  task: Task;
  buildSummary: BuildSummary | null | undefined;
  buildSummaryLoading?: boolean;
  buildSummaryError?: string | null;
  onRefresh?: () => void | Promise<void>;
  /** Increment to refresh the files list in the Data section (e.g. after adding files in chat). */
  filesRefreshTrigger?: number;
  /** From build-session snapshot workflow (avoids listing all datasets on each poll). */
  taskFilesSnapshot?: DatasetFileSummary[];
  onTaskFilesRefresh?: () => void | Promise<void>;
  /** Passed by parent for future use (e.g. stage derivation from agent state). */
  responseState?: unknown;
  onBuildClick?: () => void;
}

export function BuildCanvas({
  task,
  buildSummary,
  buildSummaryLoading = false,
  buildSummaryError = null,
  onRefresh,
  filesRefreshTrigger,
  taskFilesSnapshot,
  onTaskFilesRefresh,
  onBuildClick,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- prop accepted for API compatibility
  responseState: _responseState,
}: BuildCanvasProps) {
  const stage = useMemo(() => getStage(task), [task]);

  const hasPattern = (task.pattern_specs?.nodes?.length ?? 0) > 0;
  const fromPattern = useMemo(
    () => deriveCreatedFromPatternSpecs(task.pattern_specs),
    [task.pattern_specs],
  );

  const agents = useMemo(() => {
    if (buildSummary != null) return buildSummary.agents;
    return fromPattern.agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: undefined as string | undefined,
      workspace_id: task.workspace_id ?? "",
      type: "interactive" as const,
    }));
  }, [buildSummary, fromPattern.agents, task.workspace_id]);
  const datasets = useMemo(() => {
    if (buildSummary != null) return buildSummary.datasets;
    return fromPattern.datasets.map((d) => ({
      id: d.id,
      name: d.name,
      description: undefined as string | undefined,
      workspace_id: task.workspace_id ?? "",
    }));
  }, [buildSummary, fromPattern.datasets, task.workspace_id]);
  const tasks = useMemo(() => buildSummary?.tasks ?? [], [buildSummary?.tasks]);
  const viewSpecs = useMemo(
    () => buildSummary?.view_specs ?? task.view_specs ?? [],
    [buildSummary?.view_specs, task.view_specs],
  );

  const scheduleTasks = useMemo(
    () => tasks.filter((t) => t.schedule_spec),
    [tasks],
  );
  const oneOffTasks = useMemo(
    () => tasks.filter((t) => !t.schedule_spec),
    [tasks],
  );

  const oneOffTableData = useMemo(
    () => oneOffTasks.map(toTableTask),
    [oneOffTasks],
  );
  const scheduleTableData = useMemo(
    () => scheduleTasks.map(toTableTask),
    [scheduleTasks],
  );

  const agentRows = useMemo(
    () =>
      agents.map((a) =>
        toAgentRow(a, !isMaterializedAgent(a.id, buildSummary, fromPattern)),
      ),
    [agents, buildSummary, fromPattern],
  );
  const datasetRows = useMemo(
    () => datasets.map(toDatasetRow),
    [datasets],
  );
  const plannedDatasetIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of datasets) {
      if (!isMaterializedDataset(d.id, buildSummary, fromPattern)) {
        s.add(d.id);
      }
    }
    return s;
  }, [datasets, buildSummary, fromPattern]);
  const plannedViewIds = useMemo(() => {
    const s = new Set<string>();
    for (const v of viewSpecs) {
      if (!isMaterializedView(v.id, buildSummary, fromPattern)) {
        s.add(v.id);
      }
    }
    return s;
  }, [viewSpecs, buildSummary, fromPattern]);
  const viewRows: ViewSpecRow[] = useMemo(
    () =>
      viewSpecs.map((v) => ({
        id: v.id,
        name: v.name,
        columns: v.columns,
        dataset_id: v.dataset_id,
      })),
    [viewSpecs],
  );

  const hasTasksContent =
    oneOffTableData.length > 0 || scheduleTableData.length > 0;
  const hasDataContent = datasetRows.length > 0 || viewRows.length > 0;

  const patternDefaultExpanded =
    hasPattern || stage === "starting" || stage === "plan";
  const agentsDefaultExpanded =
    agentRows.length > 0 || stage === "building" || stage === "built";
  const tasksDefaultExpanded =
    hasTasksContent || stage === "building" || stage === "built";
  const dataDefaultExpanded =
    hasDataContent || stage === "building" || stage === "built";

  return (
    <div className="flex flex-col h-full min-h-0 bg-muted overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-medium text-foreground">Build</h2>
          {buildSummaryLoading && (
            <span className="text-xs text-muted-foreground truncate">
              Syncing…
            </span>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onRefresh()}
            disabled={buildSummaryLoading}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                buildSummaryLoading && "animate-spin",
              )}
            />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {buildSummaryError && (
          <p className="text-sm text-destructive">{buildSummaryError}</p>
        )}

        <CollapsibleSection
          title="Pattern"
          icon={Workflow}
          defaultExpanded={patternDefaultExpanded}
          hasContent={hasPattern}
          sectionKey="pattern"
          taskId={task.id}
        >
          {hasPattern && task.pattern_specs ? (
            <div className="space-y-2">
              <div className="rounded-md border border-border/60 bg-background/80 overflow-hidden">
                <PatternFlowViewer
                  patternSpecs={task.pattern_specs as PatternSpecs}
                  height={220}
                  className="w-full"
                />
              </div>
              {stage === "plan" && onBuildClick && (
                <Button size="sm" onClick={onBuildClick}>
                  Build
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No design pattern yet. Describe what you want to build and the
              builder will propose a plan.
            </p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Agents"
          icon={Bot}
          defaultExpanded={agentsDefaultExpanded}
          hasContent={agentRows.length > 0}
          sectionKey="agents"
          taskId={task.id}
        >
          <AgentsTable
            data={agentRows}
            showFilters={false}
            showTeamFilter={false}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Tasks"
          icon={Calendar}
          defaultExpanded={tasksDefaultExpanded}
          hasContent={hasTasksContent}
          sectionKey="tasks"
          taskId={task.id}
        >
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="tasks" className="text-xs">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="schedules" className="text-xs">
                Schedules
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-2">
              {oneOffTableData.length > 0 ? (
                <TasksTable
                  data={oneOffTableData}
                  viewTaskHref={(t) => `/tasks/${t.id}`}
                  withFilters={false}
                  teams={[]}
                  showTeamFilter={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No one-off tasks yet.
                </p>
              )}
            </TabsContent>
            <TabsContent value="schedules" className="mt-2">
              {scheduleTableData.length > 0 ? (
                <TasksTable
                  data={scheduleTableData}
                  viewTaskHref={(t) => `/tasks/schedules/${t.id}`}
                  withFilters={false}
                  teams={[]}
                  showTeamFilter={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No schedules yet.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CollapsibleSection>

        <CollapsibleSection
          title="Data"
          icon={Database}
          defaultExpanded={dataDefaultExpanded}
          hasContent={hasDataContent}
          sectionKey="data"
          taskId={task.id}
        >
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Database className="h-3 w-3" /> Datasets
              </h4>
              <DatasetsTable
                datasets={datasetRows}
                showFilters={false}
                plannedIds={plannedDatasetIds}
              />
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" /> Views
              </h4>
              <ViewsTable views={viewRows} plannedIds={plannedViewIds} />
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Files
              </h4>
              <TaskFilesList
                taskId={task.id}
                refreshTrigger={filesRefreshTrigger}
                taskFilesSnapshot={taskFilesSnapshot}
                onTaskFilesRefresh={onTaskFilesRefresh}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Task files can be added in the chat via the attachment menu.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
