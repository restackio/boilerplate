"use client";

import { useMemo } from "react";
import { TasksTable } from "@/app/(dashboard)/tasks/components/tasks-table";
import type { Task as WorkspaceTask } from "@/hooks/use-workspace-scoped-actions";

interface BuildTasksBlockProps {
  tasks: WorkspaceTask[];
  teams?: Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

/** Map workspace task to TasksTable Task shape (created/updated required). */
function toTableTask(t: WorkspaceTask): {
  id: string;
  title: string;
  description?: string;
  status: WorkspaceTask["status"];
  agent_id: string;
  agent_name: string;
  type?: "interactive" | "pipeline";
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

export function BuildTasksBlock({ tasks, teams = [] }: BuildTasksBlockProps) {
  const tableData = useMemo(() => tasks.map(toTableTask), [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        In progress
      </h2>
      <TasksTable
        data={tableData}
        viewTaskHref={(task) => `/agents/new/${task.id}`}
        withFilters={true}
        teams={teams}
        showTeamFilter={true}
      />
    </div>
  );
}
