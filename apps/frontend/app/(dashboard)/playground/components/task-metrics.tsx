"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Activity, CheckCircle2, XCircle, Clock, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { getTaskQualityMetrics, type QualityMetricResult } from "@/app/actions/metrics";

interface TaskMetricsProps {
  taskId: string;
  onViewTraces?: () => void;
}

export function TaskMetrics({ taskId, onViewTraces }: TaskMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [metrics, setMetrics] = useState<QualityMetricResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      fetchMetrics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, hasLoaded]);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const results = await getTaskQualityMetrics(taskId);
      const typedResults = (Array.isArray(results) ? results : []) as QualityMetricResult[];
      setMetrics(typedResults);
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !hasLoaded) {
    return (
      <div className="max-w-4xl mx-auto border border-border/40 bg-muted/25 p-3 rounded-lg">
        <div className="text-sm text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  if (!hasLoaded || metrics.length === 0) {
    return null;
  }

  // Calculate summary stats
  const totalPassed = metrics.filter(m => m.passed).length;
  const overallPassRate = (totalPassed / metrics.length) * 100;
  const totalCost = metrics.reduce((sum, m) => sum + m.evalCostUsd, 0);
  const totalDuration = metrics.reduce((sum, m) => sum + m.evalDurationMs, 0);

  // Group by response index
  const metricsByResponse = metrics.reduce((acc, metric) => {
    const key = metric.responseIndex ?? 0;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(metric);
    return acc;
  }, {} as Record<number, QualityMetricResult[]>);

  const responseCount = Object.keys(metricsByResponse).length;

  return (
    <div className="max-w-4xl mx-auto border border-border/40 bg-muted/25 p-2 rounded-lg space-y-2">
      {/* Header with summary stats and toggle */}
      <div className="flex items-center justify-between gap-2">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <Activity className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-foreground">Quality Metrics</span>
          
          {/* Summary badges */}
          <Badge variant={overallPassRate >= 80 ? "default" : overallPassRate >= 60 ? "secondary" : "destructive"}>
            {overallPassRate.toFixed(0)}% Pass
          </Badge>
          <span className="text-xs text-muted-foreground">
            {totalPassed} of {metrics.length} passed
          </span>
          {responseCount > 1 && (
            <span className="text-xs text-muted-foreground">
              • {responseCount} responses
            </span>
          )}
        </div>

        {/* Performance stats and traces button */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDuration}ms
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${totalCost.toFixed(4)}
          </div>
          {onViewTraces && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onViewTraces();
              }}
            >
              <BarChart3 className="h-3 w-3" />
              View Traces
            </Button>
          )}
        </div>
      </div>

      {/* Metrics list - only shown when expanded */}
      {isExpanded && (
        <div className="space-y-3 pl-1 pt-2">
          {Object.entries(metricsByResponse).map(([responseIndex, responseMetrics]) => {
            const responsePassed = responseMetrics.filter(m => m.passed).length;
            const responsePassRate = (responsePassed / responseMetrics.length) * 100;

            return (
              <div key={responseIndex} className="space-y-2">
                {/* Response header (only if multiple responses) */}
                {responseCount > 1 && (
                  <div className="flex items-center gap-2 pb-1">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">{responseIndex}</span>
                    </div>
                    <div className="flex-1 border-t" />
                    <Badge variant="outline" className="text-xs">
                      {responsePassRate.toFixed(0)}% Pass
                    </Badge>
                  </div>
                )}
                
                {/* Metrics for this response */}
                {responseMetrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm hover:bg-background/50 p-2 rounded"
                  >
                    {metric.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{metric.metricName}</span>
                        {metric.score !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {metric.score.toFixed(0)}/100
                          </Badge>
                        )}
                      </div>
                      {metric.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {metric.reasoning}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="capitalize">{metric.metricType.replace("_", " ")}</span>
                        <span>•</span>
                        <span>{metric.evalDurationMs}ms</span>
                        {metric.evalCostUsd > 0 && (
                          <>
                            <span>•</span>
                            <span>${metric.evalCostUsd.toFixed(4)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

