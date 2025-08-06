import { Loader2 } from "lucide-react";

interface TaskLoadingStateProps {
  taskId: string;
}

export function TaskLoadingState({ taskId }: TaskLoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="ml-4">
        <p>Loading task {taskId}...</p>
      </div>
    </div>
  );
} 