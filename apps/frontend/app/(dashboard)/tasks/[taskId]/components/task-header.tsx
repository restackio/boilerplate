import { EntityHeader, type ActionButton } from "@workspace/ui/components/action-button-group";
import { StatusBadge } from "@workspace/ui/components/status-indicators";
import { Trash2, Archive, CheckCircle } from "lucide-react";
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

  const actions: ActionButton[] = [
    // Mark as completed
    {
      key: "complete",
      label: "Mark as completed",
      icon: CheckCircle,
      variant: "default",
      onClick: () => onUpdateTask({ status: "completed" }),
      show: task.status !== "completed" && task.status !== "closed",
    },
    // Archive task
    {
      key: "archive", 
      label: "Archive",
      icon: Archive,
      variant: "ghost",
      onClick: () => onUpdateTask({ status: "closed" }),
      show: task.status !== "completed" && task.status !== "closed",
    },
    // Delete task
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "ghost",
      onClick: onDelete,
      requiresConfirmation: true,
      overflow: true,
    },
  ];

  return (
    <EntityHeader
      title={task.title}
      subtitle={task.description}
      breadcrumbs={breadcrumbs}
      statusBadge={<StatusBadge status={task.status} size="sm" />}
      actions={actions}
      className="border-b"
    />
  );
} 