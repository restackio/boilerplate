"use client";

import { TasksTable, type Task } from "@workspace/ui/components/tasks-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-context";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const tasksData: Task[] = currentWorkspace.tasks;

  const handleViewTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const breadcrumbs = [{ label: "Tasks", href: "/tasks" }];

  const actions = (
    <>
      <Button variant="ghost" size="sm">
        <Plus className="h-4 w-4 mr-1" />
        New Task
      </Button>
    </>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-4">
        <TasksTable data={tasksData} onViewTask={handleViewTask} />
      </div>
    </div>
  );
}
