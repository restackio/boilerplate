import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { PageHeader } from "@workspace/ui/components/page-header";

export function DatasetsPageSkeleton() {
  const skeletonBreadcrumbs = [{ label: "Context" }];

  const skeletonActions = (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={skeletonBreadcrumbs} 
        actions={skeletonActions}
        fixed={true}
      />
      
      <div className="p-4">
        <div className="space-y-6">
          {/* Table Header */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-96" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

