"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { CheckCircle2, XCircle, Clock, DollarSign, Activity, RefreshCw } from "lucide-react";
import { getTaskQualityMetrics, type QualityMetricResult } from "@/app/actions/metrics";

interface PlaygroundMetricsResultsProps {
  taskId: string;
}

// Group metrics by response index for timeline view
interface ResponseMetrics {
  responseIndex: number | null;
  metrics: QualityMetricResult[];
  passRate: number;
}

export function PlaygroundMetricsResults({ taskId }: PlaygroundMetricsResultsProps) {
  const [metrics, setMetrics] = useState<QualityMetricResult[]>([]);
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

  // Group metrics by response index for timeline view
  const groupedMetrics: ResponseMetrics[] = [];
  const metricsByResponse = (metrics || []).reduce((acc, metric) => {
    const key = metric.responseIndex ?? 0;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(metric);
    return acc;
  }, {} as Record<number, QualityMetricResult[]>);

  Object.entries(metricsByResponse).forEach(([responseIndex, responseMetrics]) => {
    const passed = responseMetrics.filter(m => m.passed).length;
    const passRate = (passed / responseMetrics.length) * 100;
    groupedMetrics.push({
      responseIndex: Number(responseIndex),
      metrics: responseMetrics,
      passRate,
    });
  });

  // Sort by response index
  groupedMetrics.sort((a, b) => (a.responseIndex || 0) - (b.responseIndex || 0));

  if (metrics.length === 0 && !lastUpdate) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Quality Metrics</CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Load Metrics
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Click to load quality metrics for this task.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0 && lastUpdate) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Quality Metrics</CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No metrics available for this task yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPassed = metrics.filter(m => m.passed).length;
  const overallPassRate = (totalPassed / metrics.length) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            Quality Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant={overallPassRate >= 80 ? "default" : overallPassRate >= 60 ? "secondary" : "destructive"}>
              {overallPassRate.toFixed(0)}% Pass
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedMetrics.map((responseGroup, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            {/* Response Header */}
            {responseGroup.responseIndex > 0 && (
              <div className="flex items-center gap-2 pb-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium">{responseGroup.responseIndex}</span>
                </div>
                <div className="flex-1 border-t" />
                <Badge variant="outline" className="text-xs">
                  {responseGroup.passRate.toFixed(0)}% Pass
                </Badge>
              </div>
            )}
            
            {/* Metrics for this response */}
            {responseGroup.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="space-y-2 pb-3 border-b last:border-b-0 last:pb-0 pl-8"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {metric.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{metric.metricName}</p>
                      <p className="text-xs text-muted-foreground">
                        {metric.metricType.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  {metric.score !== undefined && (
                    <Badge variant="outline" className="flex-shrink-0">
                      {metric.score.toFixed(0)}/100
                    </Badge>
                  )}
                </div>

                {metric.reasoning && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {metric.reasoning}
                  </p>
                )}

                <div className="flex items-center gap-3 pl-6 text-xs text-muted-foreground">
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
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {totalPassed} of {metrics.length} passed • {groupedMetrics.length} response(s)
            </span>
            <span className="text-muted-foreground">
              Total: ${metrics.reduce((sum, m) => sum + m.evalCostUsd, 0).toFixed(4)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

