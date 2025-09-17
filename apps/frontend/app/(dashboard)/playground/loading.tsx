import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-screen flex flex-col">
      <PageHeader 
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: "Loading...", href: "" },
          { label: "Playground" },
        ]} 
        actions={
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-32" />
          </div>
        }
        fixed={false}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel Skeleton */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-4 border-b bg-background">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>

        {/* Middle Panel Skeleton */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-4 border-b bg-background">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 p-4 flex flex-col space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="flex-1 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Right Panel Skeleton */}
        <div className="w-1/3 flex flex-col">
          <div className="p-4 border-b bg-background">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-4 border-b bg-background space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
