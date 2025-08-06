import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { ArrowLeft } from "lucide-react";

interface TaskNotFoundStateProps {
  taskId: string;
  onBack: () => void;
}

export function TaskNotFoundState({ taskId, onBack }: TaskNotFoundStateProps) {
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: "Task Not Found" }]} actions={
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      } fixed={true} />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Task Not Found</h2>
          <p className="text-muted-foreground">
            The requested task could not be found.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Task ID: {taskId}
          </p>
        </div>
      </div>
    </div>
  );
} 