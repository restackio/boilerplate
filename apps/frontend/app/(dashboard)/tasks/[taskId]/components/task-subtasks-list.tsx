"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import Link from "next/link";
import { getStatusIcon, getStatusBadge } from "../../utils/task-status-utils";

interface TaskSubtasksListProps {
  subtasks: unknown[];
}

interface Subtask {
  task_id: string;
  title: string;
  agent_name: string;
  status: string;
  error?: string;
}

export function TaskSubtasksList({ subtasks: subtasksRaw }: TaskSubtasksListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse and calculate status from subtasks (real-time from agent state)
  const { subtasks, statusCounts } = useMemo(() => {
    if (!subtasksRaw || subtasksRaw.length === 0) {
      return { 
        subtasks: [], 
        statusCounts: { completed: 0, active: 0, failed: 0, total: 0 } 
      };
    }

    const parsedSubtasks = subtasksRaw as Subtask[];
    const completed = parsedSubtasks.filter(s => s.status === "completed").length;
    const inProgress = parsedSubtasks.filter(s => s.status === "in_progress").length;
    const failed = parsedSubtasks.filter(s => s.status === "failed").length;
    const total = parsedSubtasks.length;

    return {
      subtasks: parsedSubtasks,
      statusCounts: { completed, inProgress, failed, total }
    };
  }, [subtasksRaw]);

  if (subtasks.length === 0) {
    return null;
  }

  const { completed: completedCount, inProgress: inProgressCount, failed: failedCount, total: totalCount } = statusCounts;

  return (
    <div className="max-w-4xl mx-auto border border-border/40 bg-muted/25 p-2 rounded-lg space-y-2">
      {/* Header with status counts and toggle */}
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
        <span className="text-sm font-medium text-foreground">Subtasks</span>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} done
        </span>
        {inProgressCount > 0 && (
          <span className="text-sm text-muted-foreground">
            • {inProgressCount} in progress
          </span>
        )}
        {failedCount > 0 && (
          <span className="text-sm text-red-600">
            • {failedCount} failed
          </span>
        )}
      </div>

      {/* Subtasks list - only shown when expanded */}
      {isExpanded && (
        <div className="space-y-2 pl-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.task_id}
              className="flex items-center justify-between gap-2 text-sm hover:bg-background/50"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon(subtask.status)}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={`font-medium truncate ${
                    subtask.status === "completed"
                      ? "text-muted-foreground line-through" 
                      : "text-foreground"
                  }`}>
                    <Link href={`/tasks/${subtask.task_id}`} className="block hover:underline" target="_blank">
                      {subtask.title}
                    </Link>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {subtask.agent_name}
                    </span>
                    {subtask.error && subtask.status === "failed" && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-red-600" title={subtask.error}>
                          {subtask.error.substring(0, 30)}...
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(subtask.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

