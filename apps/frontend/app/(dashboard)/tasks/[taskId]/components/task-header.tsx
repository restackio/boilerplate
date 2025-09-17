import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Trash2, Archive } from "lucide-react";
import { Task } from "@/hooks/use-workspace-scoped-actions";

interface TaskHeaderProps {
  task: Task;
  onDelete: () => void;
  onUpdateTask: (updates: Partial<Task>) => Promise<void>;
}

export function TaskHeader({ task, onDelete, onUpdateTask }: TaskHeaderProps) {
  const breadcrumbs = [
    { label: "Tasks", href: "/tasks" },
    { label: task.title },
  ];

  const actions = (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {task.status !== "completed" && task.status !== "closed" && (
        <Button variant="ghost" size="sm" onClick={() => onUpdateTask({ status: "closed" })}>
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