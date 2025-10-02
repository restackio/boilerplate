import { PageHeader } from "@workspace/ui/components/page-header";
import { TableLoading } from "@workspace/ui/components/loading-states";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={[{ label: "Datasets" }]} 
        actions={
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        }
        fixed={true}
      />
      
      <div className="bg-primary-foreground p-4">
        <div className="space-y-6">
          {/* Table loading */}
          <TableLoading rows={8} />
        </div>
      </div>
    </div>
  );
}
