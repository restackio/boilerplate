import { useState, useEffect } from "react";
import { getTaskQualityMetrics } from "@/app/actions/metrics";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { CheckCircle2, XCircle, Clock, DollarSign, RefreshCw } from "lucide-react";

interface TaskQualityMetric {
  metricName: string;
  metricType: string;
  passed: boolean;
  score?: number;
  reasoning?: string;
  evalDurationMs: number;
  evalCostUsd: number;
  evaluatedAt: string;
  responseId?: string;
  responseIndex?: number;
  messageCount?: number;
}

interface ResponseMetrics {
  responseIndex: number;
  metrics: TaskQualityMetric[];
  passRate: number;
}

interface TaskAnalyticsTabProps {
  taskId: string;
}

export function TaskAnalyticsTab({ taskId }: TaskAnalyticsTabProps) {
  const [metrics, setMetrics] = useState<TaskQualityMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const results = await getTaskQualityMetrics(taskId);
      // Ensure results is always an array
      setMetrics(Array.isArray(results) ? results : []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchMetrics();
  }, [taskId]);

  // Group metrics by response index for timeline view
  const groupedMetrics: ResponseMetrics[] = [];
  const metricsByResponse = (metrics || []).reduce((acc, metric) => {
    const key = metric.responseIndex ?? 0;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(metric);
    return acc;
  }, {} as Record<number, TaskQualityMetric[]>);

  Object.entries(metricsByResponse).forEach(([responseIndex, responseMetrics]) => {
    const passed = responseMetrics.filter((m) => m.passed).length;
    const passRate = (passed / responseMetrics.length) * 100;
    groupedMetrics.push({
      responseIndex: Number(responseIndex),
      metrics: responseMetrics,
      passRate,
    });
  });

  // Sort by response index
  groupedMetrics.sort((a, b) => (a.responseIndex || 0) - (b.responseIndex || 0));

  // Calculate summary statistics
  const totalMetrics = metrics.length;
  const passedMetrics = metrics.filter((m) => m.passed).length;
  const overallPassRate = totalMetrics > 0 ? (passedMetrics / totalMetrics) * 100 : 0;
  const totalCost = metrics.reduce((sum, m) => sum + m.evalCostUsd, 0);
  const avgDuration =
    totalMetrics > 0
      ? metrics.reduce((sum, m) => sum + m.evalDurationMs, 0) / totalMetrics
      : 0;

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Task Analytics</h3>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchMetrics}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {totalMetrics > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Overall Pass Rate</p>
            <p className="text-2xl font-bold">{overallPassRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {passedMetrics} / {totalMetrics} passed
            </p>
          </div>
          <div className="bg-background rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg Duration</p>
            <p className="text-2xl font-bold">{avgDuration.toFixed(0)}ms</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total cost: ${totalCost.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Timeline */}
      {metrics.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No metrics evaluated yet</p>
          <p className="text-xs mt-2">
            Quality metrics will appear here as they are evaluated
          </p>
        </div>
      )}

      {loading && metrics.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading metrics...</p>
        </div>
      )}

      {groupedMetrics.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Evaluation Timeline</h4>
          
          {groupedMetrics.map((responseGroup, groupIdx) => (
            <div key={groupIdx} className="space-y-2">
              {/* Response header if there are multiple responses */}
              {groupedMetrics.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono">
                    Response #{responseGroup.responseIndex + 1}
                  </Badge>
                  <span className="text-xs">
                    Pass rate: {responseGroup.passRate.toFixed(0)}%
                  </span>
                </div>
              )}

              {/* Metrics for this response */}
              {responseGroup.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="bg-background rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {metric.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {metric.metricName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {metric.metricType.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    {metric.score !== undefined && (
                      <Badge
                        variant={metric.passed ? "default" : "destructive"}
                        className="flex-shrink-0"
                      >
                        {metric.score.toFixed(0)}/100
                      </Badge>
                    )}
                  </div>

                  {metric.reasoning && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {metric.reasoning}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {metric.evalDurationMs}ms
                    </div>
                    {metric.evalCostUsd > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${metric.evalCostUsd.toFixed(4)}
                      </div>
                    )}
                    <div className="flex-1 text-right">
                      {new Date(metric.evaluatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

