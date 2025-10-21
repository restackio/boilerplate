import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { PageHeader } from "@workspace/ui/components/page-header";

interface TaskDetailSkeletonProps {
  taskId?: string;
}

export function TaskDetailSkeleton({ taskId }: TaskDetailSkeletonProps) {
  const skeletonBreadcrumbs = [
    { label: "Tasks", href: "/tasks" },
    { label: taskId ? "Loading..." : "Loading..." },
  ];

  const skeletonActions = (
    <div className="flex gap-2">
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-32" />
    </div>
  );

  return (
    <div>
      <PageHeader 
        breadcrumbs={skeletonBreadcrumbs} 
        actions={skeletonActions} 
        fixed={true}
      />
      
      <div className="flex h-[calc(100vh-80px)]">
        <TaskChatInterfaceSkeleton />
      </div>
    </div>
  );
}

function TaskChatInterfaceSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col bg-background">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial Message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] space-y-2">
            <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
          </div>
        </div>

        {/* Response with Reasoning and Tools */}
        <div className="flex justify-start">
          <div className="max-w-[85%] w-full space-y-3">
            {/* Reasoning */}
            <div className="border rounded-lg p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>

            {/* Tool Cards */}
            <div className="space-y-2">
              <ToolCardSkeleton />
              <ToolCardSkeleton />
            </div>

            {/* Response Text */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* Another Message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] space-y-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

function ToolCardSkeleton() {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 mt-0.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

