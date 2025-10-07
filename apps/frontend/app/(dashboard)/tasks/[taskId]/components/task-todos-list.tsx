"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { getStatusIcon } from "../../utils/task-status-utils";

interface TaskTodosListProps {
  todos: unknown[];
}

interface Todo {
  id: string;
  content: string;
  status: "in_progress" | "completed";
}

export function TaskTodosList({ todos: todosRaw }: TaskTodosListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse and calculate progress from todos
  const { todos, progress } = useMemo(() => {
    if (!todosRaw || todosRaw.length === 0) {
      return { todos: [], progress: { completed: 0, in_progress: 0, total: 0, percentage: 0 } };
    }

    const parsedTodos = todosRaw as Todo[];
    const completed = parsedTodos.filter(t => t.status === "completed").length;
    const in_progress = parsedTodos.filter(t => t.status === "in_progress").length;
    const total = parsedTodos.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      todos: parsedTodos,
      progress: { completed, in_progress, total, percentage }
    };
  }, [todosRaw]);

  if (todos.length === 0) {
    return null;
  }

  const { completed: completedCount, total: totalCount } = progress;

  return (
    <div className="max-w-4xl mx-auto border border-border/40 bg-muted/25 p-2 rounded-lg space-y-2">
      {/* Header with progress and toggle */}
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
        <span className="text-sm font-medium text-foreground">Todos</span>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} done
        </span>
      </div>

      {/* Clean vertical list - only shown when expanded */}
      {isExpanded && (
        <div className="space-y-1 pl-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 text-sm"
            >
              {getStatusIcon(todo.status)}
              <span className={todo.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}>
                {todo.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

