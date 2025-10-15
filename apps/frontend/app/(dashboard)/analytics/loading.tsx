import { PageHeader } from "@workspace/ui/components/page-header";
import { AnalyticsDashboardSkeleton } from "./components/analytics-dashboard-skeleton";

export default function Loading() {
  const skeletonBreadcrumbs = [{ label: "Metrics" }];

  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={skeletonBreadcrumbs}
        fixed={true}
      />
      
      <div className="p-4">
        <AnalyticsDashboardSkeleton />
      </div>
    </div>
  );
}

