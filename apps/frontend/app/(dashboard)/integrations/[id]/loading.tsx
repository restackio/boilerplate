import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={[
          { label: "Integrations", href: "/integrations" }, 
          { label: "Loading..." }
        ]} 
        actions={
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        }
        fixed={true}
      />
      
      <div className="bg-primary-foreground p-4">
        <div className="space-y-6">
          <div className="bg-background rounded-lg border">
            {/* Tab Navigation Skeleton */}
            <div className="border-b bg-muted/30 rounded-t-lg px-4 py-2">
              <div className="flex gap-1">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>

            {/* Tab Content Skeleton */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
