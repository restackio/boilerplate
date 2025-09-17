import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <PageHeader 
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" }, 
          { label: "Loading..." }
        ]} 
        actions={
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        }
        fixed={true}
      />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Chat interface skeleton */}
        <div className="w-full max-w-4xl mx-auto flex flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center text-muted-foreground py-8">
              <div className="animate-pulse">
                <div className="h-12 w-12 mx-auto mb-4 bg-muted rounded-full"></div>
                <div className="h-4 w-32 mx-auto bg-muted rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Chat input skeleton */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Skeleton className="flex-1 h-10" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
