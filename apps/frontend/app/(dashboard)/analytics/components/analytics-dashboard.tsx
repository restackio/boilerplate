"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { getAnalytics, type AnalyticsData, type AnalyticsFilters } from "@/app/actions/analytics";
import MetricsFilters from "./metrics-filters";
import TasksOverviewChart from "./tasks-overview-chart";
import PerformanceMetricChart from "./performance-metric-chart";
import QualityMetricChart from "./quality-metric-chart";

export default function AnalyticsDashboard() {
  const { currentWorkspaceId, isReady, loading } = useDatabaseWorkspace();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    agentId: null,
    dateRange: "7d",
    version: null,
    workspaceId: currentWorkspaceId || "",
  });
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Update filters when workspace ID becomes available
  useEffect(() => {
    if (currentWorkspaceId) {
      setFilters(prev => ({ ...prev, workspaceId: currentWorkspaceId }));
    }
  }, [currentWorkspaceId]);

  // Fetch all analytics data in one call
  useEffect(() => {
    if (!filters.workspaceId) return;
    
    async function fetchAnalytics() {
      setIsLoading(true);
      
      try {
        const data = await getAnalytics({
          workspaceId: filters.workspaceId,
          agentId: filters.agentId,
          version: filters.version,
          dateRange: filters.dateRange,
        });
        
        setAnalyticsData(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [filters]);

  // Show loading state while workspace is initializing
  if (loading.isLoading || !isReady || !currentWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MetricsFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Main Overview Chart - Tasks & Success Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Task volume and success rate over time
              </p>
            </CardHeader>
            <CardContent>
              <TasksOverviewChart data={analyticsData?.overview?.timeseries || []} />
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Performance Metrics</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMetricChart 
                    data={analyticsData?.performance?.timeseries || []}
                    metric="duration"
                    label="ms"
                    color="blue"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Token Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMetricChart 
                    data={analyticsData?.performance?.timeseries || []}
                    metric="tokens"
                    label="tokens"
                    color="green"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMetricChart 
                    data={analyticsData?.performance?.timeseries || []}
                    metric="cost"
                    label="$"
                    color="purple"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Quality Metrics</h2>
            
            {analyticsData?.quality?.summary && analyticsData.quality.summary.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {analyticsData.quality.summary.map((metric) => (
                  <Card key={metric.metricName}>
                    <CardHeader>
                      <CardTitle className="text-base">{metric.metricName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QualityMetricChart 
                        data={analyticsData?.quality?.timeseries || []}
                        metricName={metric.metricName}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No quality metrics available</p>
                  </div>
                </CardContent>
              </Card>
            )}</div>
        </>
      )}
    </div>
  );
}

