import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={[
          { label: "Datasets", href: "/datasets" },
          { label: "Loading..." }
        ]}
        actions={
          <Skeleton className="h-9 w-24" />
        }
        fixed={true}
      />
      
      <div className="bg-primary-foreground p-4">
        <div className="space-y-6">
          {/* Dataset Info */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-96" />
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <Skeleton className="h-10 flex-1 min-w-[200px]" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <div className="h-12 bg-muted animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 border-t bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
