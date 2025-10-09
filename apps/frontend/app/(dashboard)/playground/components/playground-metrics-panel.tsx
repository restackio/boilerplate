"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";

interface PlaygroundMetricsPanelProps {
  agentId: string;
  taskResult?: {
    duration_ms: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    quality_metrics?: Array<{
      metric_name: string;
      score: number;
      passed: boolean;
      reasoning?: string;
    }>;
  };
}

export default function PlaygroundMetricsPanel({
  agentId,
  taskResult,
}: PlaygroundMetricsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Task Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        {taskResult && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Performance</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{taskResult.duration_ms}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">${taskResult.cost_usd.toFixed(4)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Tokens:</span>
                <span className="font-medium ml-2">
                  {taskResult.input_tokens} in / {taskResult.output_tokens} out
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quality Metrics */}
        {taskResult?.quality_metrics && taskResult.quality_metrics.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Quality Evaluations</h4>
            <div className="space-y-2">
              {taskResult.quality_metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {metric.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{metric.metric_name}</span>
                    </div>
                    {metric.reasoning && (
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {metric.reasoning}
                      </p>
                    )}
                  </div>
                  <Badge variant={metric.passed ? "default" : "destructive"}>
                    {metric.score.toFixed(0)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {!taskResult?.quality_metrics && (
          <div className="text-sm text-muted-foreground">
            Run a task to see quality metric evaluations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
