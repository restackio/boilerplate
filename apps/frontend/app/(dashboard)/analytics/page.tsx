"use client";

import { Suspense, useState } from "react";
import AnalyticsDashboard from "./components/analytics-dashboard";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import { CreateMetricDialog } from "./components/create-metric-dialog";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export default function AnalyticsPage() {
  const breadcrumbs = [{ label: "Analytics" }];
  const { currentWorkspaceId, currentUserId } = useDatabaseWorkspace();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    window.location.reload();
  };

  const handleMetricCreated = () => {
    setRefreshKey(prev => prev + 1);
    // Optionally reload to show new metric in dashboard
    setTimeout(() => window.location.reload(), 1000);
  };

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      {currentWorkspaceId && (
        <CreateMetricDialog
          workspaceId={currentWorkspaceId}
          userId={currentUserId}
          onMetricCreated={handleMetricCreated}
        />
      )}
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      <div className="p-6 space-y-6">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsDashboard key={refreshKey} />
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