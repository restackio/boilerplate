"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { AlertCircle, Ellipsis } from "lucide-react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { getAnalytics, type AnalyticsData, type AnalyticsFilters } from "@/app/actions/analytics";
import { getAgentPublishHistory, type AgentPublishEvent } from "@/app/actions/agents";
import MetricsFilters from "./metrics-filters";
import TasksOverviewChart from "./tasks-overview-chart";
import PerformanceMetricChart from "./performance-metric-chart";
import QualityMetricChart from "./quality-metric-chart";
import { EditMetricDialog } from "./edit-metric-dialog";
import { AnalyticsDashboardSkeleton } from "./analytics-dashboard-skeleton";

export default function AnalyticsDashboard() {
  const { currentWorkspaceId, isReady, loading } = useDatabaseWorkspace();
  const { agents, fetchAgents } = useWorkspaceScopedActions();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    agentId: null,
    dateRange: "7d",
    version: null,
    workspaceId: currentWorkspaceId || "",
  });
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [agentPublishEvents, setAgentPublishEvents] = useState<AgentPublishEvent[]>([]);
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

  // Fetch agents for filter dropdown
  useEffect(() => {
    if (isReady && currentWorkspaceId) {
      fetchAgents({ publishedOnly: true });
    }
  }, [isReady, currentWorkspaceId, fetchAgents]);

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
      const [data, publishEvents] = await Promise.all([
        getAnalytics({
          workspaceId: filters.workspaceId,
          agentId: filters.agentId,
          version: filters.version,
          dateRange: filters.dateRange,
        }),
        getAgentPublishHistory({
          workspaceId: filters.workspaceId,
          agentId: filters.agentId,
          dateRange: filters.dateRange,
        }),
      ]);
      
      setAnalyticsData(data);
      setAgentPublishEvents(publishEvents);
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
    return <AnalyticsDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MetricsFilters filters={filters} onFiltersChange={setFilters} agents={agents} />

      {isLoading ? (
        <AnalyticsDashboardSkeleton />
      ) : (
        <>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tasks volume and fail rate</h2>
            <Card>
              <CardContent>
                <TasksOverviewChart 
                  data={analyticsData?.overview?.timeseries || []} 
                  publishEvents={agentPublishEvents}
                />
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
                    color="orange"
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
                    <CardTitle className="text-base">User feedbacks</CardTitle>
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
                        // Fail = tasks with negative feedback
                        const failRate = item.totalTasks > 0 ? item.negativeCount / item.totalTasks : 0;
                        
                        return {
                          date: item.date,
                          metricName: "Feedback",
                          failRate: failRate,
                          avgScore: (1 - failRate) * 100,
                        };
                      })}
                      metricName="Feedback"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Other quality metrics */}
              {analyticsData?.quality?.summary && analyticsData.quality.summary.length > 0 && 
                analyticsData.quality.summary.map((metric) => {
                  // Find agent names and IDs for this metric
                  const metricAgents = metric.parentAgentIds && metric.parentAgentIds.length > 0
                    ? metric.parentAgentIds
                        .map(agentId => {
                          const agent = agents.find(a => a.id === agentId);
                          return agent ? { id: agent.id, name: agent.name } : null;
                        })
                        .filter(Boolean) as { id: string; name: string }[]
                    : [];

                  return (
                  <Card key={metric.metricName}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex flex-col gap-1">
                        <CardTitle className="text-base">{metric.metricName}</CardTitle>
                        <div className="flex flex-wrap gap-1 min-h-[20px]">
                          {metricAgents.length > 0 ? (
                            metricAgents.map((agent) => (
                              <Link
                                key={agent.id}
                                href={`/playground?agentId=${agent.id}`}
                                className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                {agent.name}
                              </Link>
                            ))
                          ) : (
                            <span className="text-xs text-transparent select-none">&nbsp;</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          asChild
                        >
                          <Link href={`/tasks?metric=${encodeURIComponent(metric.metricName)}&metricStatus=failed&dateRange=${filters.dateRange}${filters.agentId ? `&agentId=${filters.agentId}` : ''}${filters.version ? `&version=${encodeURIComponent(filters.version)}` : ''}`}>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            See fails
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleEditMetric(metric)}
                        >
                          <Ellipsis className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <QualityMetricChart 
                        data={analyticsData?.quality?.timeseries || []}
                        metricName={metric.metricName}
                      />
                    </CardContent>
                  </Card>
                  );
                })
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
      {selectedMetric && currentWorkspaceId && (
        <EditMetricDialog
          metricId={selectedMetric.id}
          metricName={selectedMetric.name}
          isActive={selectedMetric.isActive}
          config={selectedMetric.config}
          workspaceId={currentWorkspaceId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onMetricUpdated={fetchAnalytics}
        />
      )}
    </div>
  );
}

