"use client";

import { Suspense } from "react";
import AnalyticsDashboard from "./components/analytics-dashboard";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import CreateMetricDialog from "./components/create-metric-dialog";

export default function AnalyticsPage() {
  const breadcrumbs = [{ label: "Analytics" }];

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <CreateMetricDialog />
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-6 space-y-6">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsDashboard />
        </Suspense>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[400px]" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>
    </div>
  );
}