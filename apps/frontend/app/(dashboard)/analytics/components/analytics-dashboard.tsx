"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { AlertCircle, Ellipsis } from "lucide-react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { getAnalytics, type AnalyticsData, type AnalyticsFilters } from "@/app/actions/analytics";
import MetricsFilters from "./metrics-filters";
import TasksOverviewChart from "./tasks-overview-chart";
import PerformanceMetricChart from "./performance-metric-chart";
import QualityMetricChart from "./quality-metric-chart";
import { EditMetricDialog } from "./edit-metric-dialog";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    id: string;
    name: string;
    isActive: boolean;
    config: Record<string, unknown>;
  } | null>(null);

  const handleEditMetric = (metric: { metricId: string; metricName: string; isActive: boolean; config: Record<string, unknown> }) => {
    setSelectedMetric({
      id: metric.metricId,
      name: metric.metricName,
      isActive: metric.isActive,
      config: metric.config,
    });
    setEditDialogOpen(true);
  };

  // Update filters when workspace ID becomes available
  useEffect(() => {
    if (currentWorkspaceId) {
      setFilters(prev => ({ ...prev, workspaceId: currentWorkspaceId }));
    }
  }, [currentWorkspaceId]);

  // Fetch all analytics data in one call
  const fetchAnalytics = async () => {
    if (!filters.workspaceId) return;
    
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
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tasks volume and success rate</h2>
            <Card>
              <CardContent>
                <TasksOverviewChart data={analyticsData?.overview?.timeseries || []} />
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Quantitative metrics</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Latency (in s)</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMetricChart 
                    data={analyticsData?.performance?.timeseries || []}
                    metric="duration"
                    color="blue"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Token usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMetricChart 
                    data={analyticsData?.performance?.timeseries || []}
                    metric="tokens"
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
                    color="purple"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Qualitative metrics</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
              {/* User Feedback as first quality metric */}
              {analyticsData?.feedback?.timeseries && analyticsData.feedback.timeseries.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">Feedbacks</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        asChild
                      >
                        <Link href={`/tasks?feedback=negative&dateRange=${filters.dateRange}${filters.agentId ? `&agentId=${filters.agentId}` : ''}${filters.version ? `&version=${encodeURIComponent(filters.version)}` : ''}`}>
                          <AlertCircle className="h-4 w-4 mr-1" />
                          See fails
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <QualityMetricChart 
                      data={analyticsData.feedback.timeseries.map(item => {
                        // Pass = tasks with positive feedback OR no feedback at all
                        // Fail = tasks with negative feedback
                        const tasksWithNoFeedback = item.totalTasks - item.tasksWithFeedback;
                        const passedTasks = item.positiveCount + tasksWithNoFeedback;
                        const passRate = item.totalTasks > 0 ? passedTasks / item.totalTasks : 1;
                        
                        return {
                          date: item.date,
                          metricName: "Feedback",
                          passRate: passRate,
                          avgScore: passRate * 100,
                        };
                      })}
                      metricName="Feedback"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Other quality metrics */}
              {analyticsData?.quality?.summary && analyticsData.quality.summary.length > 0 && 
                analyticsData.quality.summary.map((metric) => (
                  <Card key={metric.metricName}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base">{metric.metricName}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          asChild
                        >
                          <Link href={`/tasks?metric=${encodeURIComponent(metric.metricName)}&status=failed&dateRange=${filters.dateRange}${filters.agentId ? `&agentId=${filters.agentId}` : ''}${filters.version ? `&version=${encodeURIComponent(filters.version)}` : ''}`}>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            See fails
                          </Link>
                        </Button>
                        {!metric.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleEditMetric(metric)}
                          >
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <QualityMetricChart 
                        data={analyticsData?.quality?.timeseries || []}
                        metricName={metric.metricName}
                      />
                    </CardContent>
                  </Card>
                ))
              }
            </div>

            {/* Empty state if no metrics */}
            {(!analyticsData?.feedback?.timeseries || analyticsData.feedback.timeseries.length === 0) && 
             (!analyticsData?.quality?.summary || analyticsData.quality.summary.length === 0) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No qualitative metrics available</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Edit Metric Dialog */}
      {selectedMetric && (
        <EditMetricDialog
          metricId={selectedMetric.id}
          metricName={selectedMetric.name}
          isActive={selectedMetric.isActive}
          config={selectedMetric.config}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onMetricUpdated={fetchAnalytics}
        />
      )}
    </div>
  );
}

