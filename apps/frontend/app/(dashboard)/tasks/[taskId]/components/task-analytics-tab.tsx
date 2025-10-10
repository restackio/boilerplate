import { useState, useEffect } from "react";
import { getTaskQualityMetrics } from "@/app/actions/metrics";
import { getTaskTraces, GetTaskTracesOutput, Span } from "@/app/actions/traces";
import { getTaskFeedback } from "@/app/actions/feedback";
import type { FeedbackRecord } from "@/app/actions/feedback";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/ui/table";
import { CheckCircle2, XCircle, Clock, DollarSign, RefreshCw, Zap, MessageSquare, FunctionSquare, ThumbsUp, ThumbsDown, ClipboardCheck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { MetricCard } from "./metric-card";
import { CreateMetricDialog } from "@/app/(dashboard)/analytics/components/create-metric-dialog";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

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
  const { currentWorkspaceId, currentUserId } = useDatabaseWorkspace();
  const [metrics, setMetrics] = useState<TaskQualityMetric[]>([]);
  const [tracesData, setTracesData] = useState<GetTaskTracesOutput | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [metricsResults, tracesResults, feedbackResults] = await Promise.all([
        getTaskQualityMetrics(taskId),
        getTaskTraces(taskId),
        getTaskFeedback(taskId),
      ]);
      
      // Ensure metrics is always an array and typed correctly
      const typedMetrics = (Array.isArray(metricsResults) ? metricsResults : []) as TaskQualityMetric[];
      setMetrics(typedMetrics);
      setTracesData(tracesResults);
      setFeedbacks(feedbackResults);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setMetrics([]);
      setTracesData(null);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch on mount only
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Calculate summary statistics - for potential future use
  // const totalMetrics = metrics.length;
  // const passedMetrics = metrics.filter((m) => m.passed).length;
  // const overallPassRate = totalMetrics > 0 ? (passedMetrics / totalMetrics) * 100 : 0;
  // const totalCost = metrics.reduce((sum, m) => sum + m.evalCostUsd, 0);
  // const avgDuration =
  //   totalMetrics > 0
  //     ? metrics.reduce((sum, m) => sum + m.evalDurationMs, 0) / totalMetrics
  //     : 0;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Analytics</h3>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        {tracesData && tracesData.spans.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Duration"
              value={`${((tracesData.total_duration_ms || 0) / 1000).toFixed(1)}s`}
              
            />
            <MetricCard
              label="Tokens"
              value={(tracesData.total_tokens || 0).toLocaleString()}
              
            />
            <MetricCard
              label="Cost"
              value={`$${(tracesData.total_cost_usd || 0).toFixed(4)}`}
              
            />
            <MetricCard
              label="LLM Calls"
              value={tracesData.generation_count || 0}
              
            />
          </div>
        )}

        {/* Loading State */}
        {loading && !tracesData && metrics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading data...</p>
          </div>
        )}

        {/* Quality Metrics Section */}
        {groupedMetrics.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Quality Metrics ({metrics.length})
            </h4>
            
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

        {/* User Feedback Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Feedbacks {feedbacks.length > 0 && `(${feedbacks.length})`}
          </h4>
          
          {feedbacks.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <MetricCard
                  label="Positive"
                  value={feedbacks.filter(f => f.isPositive).length}
                />
                <MetricCard
                  label="Negative"
                  value={feedbacks.filter(f => !f.isPositive).length}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[80px]">Response</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((feedback, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {feedback.isPositive ? (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-600 bg-green-600/10">
                            <ThumbsUp className="h-3 w-3" />
                            Positive
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-red-600 border-red-600 bg-red-600/10">
                            <ThumbsDown className="h-3 w-3" />
                            Negative
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        #{feedback.responseIndex + 1}
                      </TableCell>
                      <TableCell className="text-sm">
                        {feedback.feedbackText || <span className="text-muted-foreground italic">No details provided</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(feedback.createdAt)}
                      </TableCell>
                      <TableCell>
                        {currentWorkspaceId && (
                          <CreateMetricDialog
                            workspaceId={currentWorkspaceId}
                            userId={currentUserId}
                            onMetricCreated={fetchData}
                            feedbackContext={{
                              isPositive: feedback.isPositive,
                              feedbackText: feedback.feedbackText,
                            }}
                            trigger={
                              <Button variant="outline" size="sm" className="h-7 px-2">
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Create metric
                              </Button>
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No feedback yet</p>
              <p className="text-xs mt-2">
                Feedback will appear here when users rate responses
              </p>
            </div>
          )}
        </div>

        {/* Traces Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Traces {tracesData && `(${tracesData.spans.length})`}
          </h4>
          
          {tracesData && tracesData.spans.length > 0 ? (
            <div className="space-y-3">
              {tracesData.spans.map((span) => (
                <TraceSpanCard key={span.span_id} span={span} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <p className="text-sm">No traces captured yet</p>
              <p className="text-xs mt-2">
                Traces will appear here as the agent executes
              </p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// TraceSpanCard Component
interface TraceSpanCardProps {
  span: Span;
}

function TraceSpanCard({ span }: TraceSpanCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getSpanIcon = (type: string) => {
    switch (type) {
      case "generation":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "function":
        return <FunctionSquare className="h-4 w-4 text-green-500" />;
      case "response":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "error" ? (
      <Badge variant="destructive" className="ml-2">Error</Badge>
    ) : (
      <Badge variant="secondary" className="ml-2">OK</Badge>
    );
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="bg-background rounded-lg border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-4 h-auto hover:bg-muted/50">
            <div className="flex items-center w-full gap-2">
              {getSpanIcon(span.span_type)}
              <span className="font-medium">{span.span_name || span.span_type}</span>
              {getStatusBadge(span.status)}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDuration(span.duration_ms)}
              </span>
              {isOpen ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4 text-sm">
          <div className="space-y-3">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {span.model_name && (
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <span className="ml-2 font-mono">{span.model_name}</span>
                </div>
              )}
              {span.input_tokens > 0 && (
                <div>
                  <span className="text-muted-foreground">Input Tokens:</span>
                  <span className="ml-2">{span.input_tokens.toLocaleString()}</span>
                </div>
              )}
              {span.output_tokens > 0 && (
                <div>
                  <span className="text-muted-foreground">Output Tokens:</span>
                  <span className="ml-2">{span.output_tokens.toLocaleString()}</span>
                </div>
              )}
              {span.cost_usd > 0 && (
                <div>
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="ml-2">${span.cost_usd.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {span.error_message && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-xs">
                <p className="font-semibold">Error: {span.error_type || "Unknown"}</p>
                <p>{span.error_message}</p>
              </div>
            )}

            {/* Input/Output */}
            {span.input && (
              <div>
                <p className="text-xs font-semibold mb-1 text-muted-foreground">Input:</p>
                <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                  {typeof span.input === 'string' ? span.input : JSON.stringify(JSON.parse(span.input), null, 2)}
                </div>
              </div>
            )}

            {span.output && (
              <div>
                <p className="text-xs font-semibold mb-1 text-muted-foreground">Output:</p>
                <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                  {typeof span.output === 'string' ? span.output : JSON.stringify(JSON.parse(span.output), null, 2)}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "—";
  
  try {
    // Handle various date formats
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Try parsing ISO format manually if auto-parse fails
      const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        const parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }
      return "—";
    }
    
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

