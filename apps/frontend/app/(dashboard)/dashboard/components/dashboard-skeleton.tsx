import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full max-w-screen-lg mx-auto overflow-x-hidden">
      <div className="space-y-6 md:space-y-10 max-w-full mx-auto p-4 md:p-6 pt-8 md:pt-20">
        {/* Header */}
        <div className="flex justify-center items-center text-center">
          <Skeleton className="h-9 w-80" />
        </div>

        {/* Create Task Form Skeleton */}
        <div className="space-y-4">
          {/* Task Description Textarea */}
          <Skeleton className="h-32 w-full rounded-lg" />
          
          {/* Bottom Row with Agent Select and Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        {/* My Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-36" />
          </div>
          
          {/* Tasks Table */}
          <div className="rounded-lg border">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30">
              <Skeleton className="h-4 w-16 col-span-3" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-16 col-span-1" />
            </div>
            
            {/* Table Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0 items-center">
                {/* Task Column */}
                <div className="col-span-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                
                {/* Status Column */}
                <div className="col-span-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                
                {/* Agent Column */}
                <div className="col-span-2">
                  <Skeleton className="h-4 w-20" />
                </div>
                
                {/* Team Column */}
                <div className="col-span-2">
                  <Skeleton className="h-4 w-20" />
                </div>
                
                {/* Created by Column */}
                <div className="col-span-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                
                {/* Updated Column */}
                <div className="col-span-1">
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

