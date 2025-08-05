import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { ArrowLeft } from "lucide-react";

interface TaskErrorStateProps {
  error: string;
  taskId: string;
  onBack: () => void;
}

export function TaskErrorState({ error, taskId, onBack }: TaskErrorStateProps) {
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: "Error" }]} actions={
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      } fixed={true} />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error Loading Task</h2>
          <p className="text-muted-foreground">
            {error}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Task ID: {taskId}
          </p>
        </div>
      </div>
    </div>
  );
} 