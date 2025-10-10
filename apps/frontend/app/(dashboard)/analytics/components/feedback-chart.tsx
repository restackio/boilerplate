"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, TrendingUp, TrendingDown } from "lucide-react";
import type { FeedbackTimeSeries, FeedbackSummary } from "@/app/actions/analytics";
import Link from "next/link";
import { Button } from "@workspace/ui/components/ui/button";
import { DetailedFeedback } from "@/app/actions/feedback";
import { CreateMetricDialog } from "./create-metric-dialog";
import { ClipboardCheck } from "lucide-react";

interface FeedbackChartProps {
  data: FeedbackTimeSeries[];
  summary: FeedbackSummary;
  detailedFeedbacks?: DetailedFeedback[];
  workspaceId?: string;
  userId?: string;
  onMetricCreated?: () => void;
}

export default function FeedbackChart({ data, summary, detailedFeedbacks = [], workspaceId, userId, onMetricCreated }: FeedbackChartProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Handle no data case
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No feedback data available</p>
          <p className="text-xs text-muted-foreground mt-1">Feedback will appear here when users rate responses</p>
        </div>
      </div>
    );
  }

  const trend = data.length > 1 ? data[data.length - 1].negativePercentage - data[0].negativePercentage : 0;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Feedback</p>
          <p className="text-2xl font-bold">{summary.totalFeedback}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Positive Rate</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-green-600">
              {summary.positivePercentage.toFixed(1)}%
            </p>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Negative Rate</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-red-600">
              {summary.negativePercentage.toFixed(1)}%
            </p>
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {/* Y-axis labels */}
        <div className="flex items-center gap-4">
          <div className="w-12 text-right text-xs text-muted-foreground">
            100%
          </div>
          <div className="flex-1 border-b border-border" />
        </div>

        {/* Bars */}
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.date} className="flex items-center gap-2">
              <div className="w-12 text-right text-xs text-muted-foreground shrink-0">
                {new Date(item.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex-1 flex items-center gap-1">
                {/* Stacked bar */}
                <div className="relative flex-1 h-8 bg-muted rounded overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-green-500/70 transition-all"
                    style={{
                      width: `${(item.positiveCount / item.totalCount) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute right-0 top-0 h-full bg-red-500/70 transition-all"
                    style={{
                      width: `${(item.negativeCount / item.totalCount) * 100}%`,
                    }}
                  />
                  {/* Labels */}
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-white drop-shadow">
                      {item.positiveCount > 0 && `${item.positiveCount}`}
                    </span>
                    <span className="text-xs font-medium text-white drop-shadow">
                      {item.negativeCount > 0 && `${item.negativeCount}`}
                    </span>
                  </div>
                </div>
                <div className="w-16 text-xs text-muted-foreground text-right">
                  {item.negativePercentage.toFixed(0)}% neg
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500/70" />
            <span className="text-sm text-muted-foreground">Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/70" />
            <span className="text-sm text-muted-foreground">Negative</span>
          </div>
        </div>
      </div>

      {/* Detailed Feedbacks Table */}
      {detailedFeedbacks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent Feedback</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>
          </div>

          {showDetails && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Response</th>
                      <th className="text-left p-2 font-medium">Feedback</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      {workspaceId && (
                        <th className="text-left p-2 font-medium w-[120px]">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detailedFeedbacks.map((feedback, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          {feedback.isPositive ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <ThumbsUp className="h-3 w-3" />
                              <span className="text-xs">Positive</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <ThumbsDown className="h-3 w-3" />
                              <span className="text-xs">Negative</span>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Link
                            href={`/tasks/${feedback.taskId}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            #{feedback.responseIndex + 1}
                          </Link>
                        </td>
                        <td className="p-2 max-w-md truncate">
                          {feedback.feedbackText || (
                            <span className="text-muted-foreground italic text-xs">
                              No details
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {formatDate(feedback.createdAt)}
                        </td>
                        {workspaceId && (
                          <td className="p-2">
                            <CreateMetricDialog
                              workspaceId={workspaceId}
                              userId={userId}
                              onMetricCreated={onMetricCreated}
                              feedbackContext={{
                                isPositive: feedback.isPositive,
                                feedbackText: feedback.feedbackText,
                              }}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                >
                                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                                  Create metric
                                </Button>
                              }
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
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

