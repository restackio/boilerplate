import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Trash2, Archive, BarChart3 } from "lucide-react";
import { Task } from "@/hooks/use-workspace-scoped-actions";

interface TaskHeaderProps {
  task: Task;
  onDelete: () => void;
  onUpdateTask: (updates: Partial<Task>) => Promise<void>;
  onOpenAnalytics: () => void;
}

export function TaskHeader({ task, onDelete, onUpdateTask, onOpenAnalytics }: TaskHeaderProps) {
  const breadcrumbs = [
    { label: "Tasks", href: "/tasks" },
    { label: task.title },
  ];

  const actions = (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenAnalytics}
        title="View Analytics"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        title="Delete Task"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {task.status !== "completed" && task.status !== "closed" && (
        <Button variant="ghost" size="sm" onClick={() => onUpdateTask({ status: "closed" })} title="Archive Task">
          <Archive className="h-4 w-4" />
        </Button>
      )}
      {task.status !== "completed" && task.status !== "closed" && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onUpdateTask({ status: "completed" })}
        >
          Mark as completed
        </Button>
      )}
    </div>
  );

  return <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />;
} 