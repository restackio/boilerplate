"use client";

import { useEffect, useState } from "react";
import { getTaskTraces } from "@/app/actions/traces";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Clock, Zap, DollarSign, AlertCircle } from "lucide-react";

interface TraceSpan {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  span_type: string;
  span_name: string;
  duration_ms: number;
  status: string;
  model_name: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  input: string;
  output: string;
  error_message: string | null;
  started_at: string;
  ended_at: string;
}

interface TraceSummary {
  total_spans: number;
  total_duration_ms: number;
  total_tokens: number;
  total_cost_usd: number;
  generation_spans: number;
  function_spans: number;
}

interface PlaygroundTracesProps {
  taskId: string;
}

export function PlaygroundTraces({ taskId }: PlaygroundTracesProps) {
  const [spans, setSpans] = useState<TraceSpan[]>([]);
  const [summary, setSummary] = useState<TraceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTraces() {
      try {
        setLoading(true);
        setError(null);
        const result = await getTaskTraces(taskId);
        setSpans(result.spans);
        setSummary({
          total_spans: result.spans.length,
          total_duration_ms: result.total_duration_ms,
          total_tokens: result.total_tokens,
          total_cost_usd: result.total_cost_usd,
          generation_spans: result.generation_count,
          function_spans: result.function_count,
        });
      } catch (err) {
        console.error("Error fetching traces:", err);
        setError(err instanceof Error ? err.message : "Failed to load traces");
      } finally {
        setLoading(false);
      }
    }

    fetchTraces();
    
    // Poll for updates every 2 seconds while task is running
    const interval = setInterval(fetchTraces, 2000);
    return () => clearInterval(interval);
  }, [taskId]);

  if (loading && spans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Traces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading traces...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Traces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (spans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Traces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No traces yet. Traces will appear as the agent executes.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="text-sm font-semibold">
                  {summary.total_duration_ms}ms
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Tokens</div>
                <div className="text-sm font-semibold">
                  {summary.total_tokens.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="text-sm font-semibold">
                  ${summary.total_cost_usd.toFixed(4)}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div>
              <div className="text-xs text-muted-foreground">Spans</div>
              <div className="text-sm font-semibold">
                {summary.total_spans} ({summary.generation_spans} LLM)
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Trace Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trace Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {spans.map((span) => (
            <div
              key={span.span_id}
              className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={span.status === "ok" ? "default" : "destructive"}>
                    {span.span_type}
                  </Badge>
                  <span className="text-sm font-medium">{span.span_name}</span>
                  {span.model_name && (
                    <Badge variant="outline" className="text-xs">
                      {span.model_name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{span.duration_ms}ms</span>
                  {span.input_tokens !== null && span.output_tokens !== null && (
                    <span>
                      {span.input_tokens + span.output_tokens} tokens
                    </span>
                  )}
                  {span.cost_usd && (
                    <span>${span.cost_usd.toFixed(4)}</span>
                  )}
                </div>
              </div>
              
              {span.error_message && (
                <div className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {span.error_message}
                </div>
              )}
              
              {/* Show input/output for generation spans */}
              {span.span_type === "generation" && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View input/output
                  </summary>
                  <div className="mt-2 space-y-2">
                    {span.input && (
                      <div>
                        <div className="font-medium mb-1">Input:</div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                          {typeof span.input === 'string' 
                            ? span.input.substring(0, 500) + (span.input.length > 500 ? '...' : '')
                            : JSON.stringify(span.input, null, 2).substring(0, 500)
                          }
                        </pre>
                      </div>
                    )}
                    {span.output && (
                      <div>
                        <div className="font-medium mb-1">Output:</div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                          {typeof span.output === 'string'
                            ? span.output.substring(0, 500) + (span.output.length > 500 ? '...' : '')
                            : JSON.stringify(span.output, null, 2).substring(0, 500)
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

