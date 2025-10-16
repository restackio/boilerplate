"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, CircleCheck, CircleX, RefreshCw, Zap } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { getTaskMetrics } from "@/app/actions/metrics";
import { Task } from "@/hooks/use-workspace-scoped-actions";

interface TaskMetricsProps {
  taskId: string;
  task?: Task;
  onUpdateTask?: (updates: Partial<Task>) => Promise<void>;
}

interface QualityMetric {
  metricName: string;
  metricType: string;
  passed: boolean;
  score?: number;
  reasoning?: string;
  evalDurationMs: number;
  evalCostUsd: number;
  metricCategory: "quality";
  responseIndex?: number;
}

interface PerformanceMetric {
  responseId: string;
  responseIndex: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  status: string;
  metricCategory: "performance";
}

type Metric = QualityMetric | PerformanceMetric;

export function TaskMetrics({ taskId, task, onUpdateTask }: TaskMetricsProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      fetchMetrics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, hasLoaded]);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const results = await getTaskMetrics(taskId);
      const combined = [
        ...(Array.isArray(results.performance) ? results.performance : []),
        ...(Array.isArray(results.quality) ? results.quality : [])
      ] as Metric[];
      setMetrics(combined);
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const results = await getTaskMetrics(taskId);
      const combined = [
        ...(Array.isArray(results.performance) ? results.performance : []),
        ...(Array.isArray(results.quality) ? results.quality : [])
      ] as Metric[];
      setMetrics(combined);
    } catch (error) {
      console.error("Failed to refresh metrics:", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleMarkAsCompleted() {
    if (!onUpdateTask || !task) return;
    
    setIsUpdating(true);
    try {
      await onUpdateTask({ status: "completed" });
    } catch (error) {
      console.error("Failed to mark task as completed:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleMarkAsFailed() {
    if (!onUpdateTask || !task) return;
    
    setIsUpdating(true);
    try {
      await onUpdateTask({ status: "failed" });
    } catch (error) {
      console.error("Failed to mark task as failed:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  // Check if task is in a terminal state
  const isTaskCompleted = task?.status === "completed" || task?.status === "failed" || task?.status === "closed";

  return (
    <div className="max-w-4xl mx-auto border border-border/40 bg-muted/25 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Metrics</span>
          {loading && !hasLoaded && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
          {!loading && metrics.length === 0 && (
            <span className="text-xs text-muted-foreground">No metrics yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh metrics"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          {task && onUpdateTask && !isTaskCompleted && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 gap-1.5"
                onClick={handleMarkAsFailed}
                disabled={isUpdating}
              >
                <CircleX className="h-3 w-3" />
                Mark Failed
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="h-7 gap-1.5"
                onClick={handleMarkAsCompleted}
                disabled={isUpdating}
              >
                <CircleCheck className="h-3 w-3" />
                Mark Completed
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Table */}
      {!loading && metrics.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 font-medium text-xs">Status</th>
                <th className="text-left p-2 font-medium text-xs">Metric</th>
                <th className="text-left p-2 font-medium text-xs">Category</th>
                <th className="text-right p-2 font-medium text-xs">Details</th>
                <th className="text-right p-2 font-medium text-xs">Duration</th>
                <th className="text-right p-2 font-medium text-xs">Cost</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, idx) => {
                const isQuality = metric.metricCategory === "quality";
                const qualityMetric = metric as QualityMetric;
                const performanceMetric = metric as PerformanceMetric;
                
                return (
                  <tr key={idx} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="p-2">
                      {isQuality ? (
                        qualityMetric.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )
                      ) : (
                        <Zap className="h-4 w-4 text-blue-600" />
                      )}
                    </td>
                    <td className="p-2">
                      {isQuality ? (
                        <>
                          <div className="font-medium">{qualityMetric.metricName}</div>
                          {qualityMetric.reasoning && (
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-md line-clamp-2">
                              {qualityMetric.reasoning}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-medium">Performance</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Response {performanceMetric.responseIndex} • {performanceMetric.status}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="p-2 capitalize text-muted-foreground text-xs">
                      {isQuality ? qualityMetric.metricType.replace("_", " ") : "performance"}
                    </td>
                    <td className="p-2 text-right">
                      {isQuality ? (
                        qualityMetric.score != null && (
                          <Badge variant="outline" className="text-xs">
                            {qualityMetric.score.toFixed(0)}/100
                          </Badge>
                        )
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {performanceMetric.inputTokens + performanceMetric.outputTokens} tokens
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-right text-muted-foreground text-xs">
                      {isQuality ? `${qualityMetric.evalDurationMs}ms` : `${performanceMetric.durationMs}ms`}
                    </td>
                    <td className="p-2 text-right text-muted-foreground text-xs">
                      {isQuality 
                        ? (qualityMetric.evalCostUsd > 0 ? `$${qualityMetric.evalCostUsd.toFixed(4)}` : '-')
                        : (performanceMetric.costUsd > 0 ? `$${performanceMetric.costUsd.toFixed(4)}` : '-')
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

