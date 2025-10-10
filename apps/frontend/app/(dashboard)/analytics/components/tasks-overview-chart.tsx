"use client";

import type { OverviewTimeSeries } from "@/app/actions/analytics";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TasksOverviewChartProps {
  data: OverviewTimeSeries[];
}

// Format large numbers for display (1.2K, 1.5M, etc.)
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 10_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  if (num >= 1_000) {
    return num.toLocaleString();
  }
  return num.toString();
}

export default function TasksOverviewChart({ data }: TasksOverviewChartProps) {
  // Handle no data case
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxTasks = Math.max(...data.map(d => d.taskCount));
  const avgSuccessRate = data.reduce((sum, d) => sum + d.successRate, 0) / data.length;
  const trend = data.length > 1 ? data[data.length - 1].successRate - data[0].successRate : 0;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total tasks</p>
          <p className="text-2xl font-bold">
            {formatNumber(data.reduce((sum, d) => sum + d.taskCount, 0))}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg success rate</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">
              {(avgSuccessRate * 100).toFixed(1)}%
            </p>
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg daily tasks</p>
          <p className="text-2xl font-bold">
            {formatNumber(Math.round(data.reduce((sum, d) => sum + d.taskCount, 0) / data.length))}
          </p>
        </div>
      </div>

      {/* Dual-axis chart */}
      <div className="space-y-4">
        {/* Task Count Bars */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Task volume</p>
          <div className="h-32 flex items-end gap-1">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                style={{ height: `${(item.taskCount / maxTasks) * 100}%` }}
                title={`${new Date(item.date).toLocaleDateString()}\n${formatNumber(item.taskCount)} tasks`}
              />
            ))}
          </div>
        </div>

        {/* Success Rate Line */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Success rate</p>
          <div className="relative h-24 border-b border-l border-muted">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              <div className="border-t border-dashed border-muted" />
              <div className="border-t border-dashed border-muted" />
              <div className="border-t border-dashed border-muted" />
            </div>
            
            {/* Line chart */}
            <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
              {data.length === 1 ? (
                // Single point - show as horizontal line
                <>
                  <line 
                    x1="10" 
                    y1={(1 - data[0].successRate) * 100} 
                    x2="90" 
                    y2={(1 - data[0].successRate) * 100} 
                    stroke="rgb(34, 197, 94)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx="50"
                    cy={(1 - data[0].successRate) * 100}
                    r="2"
                    fill="rgb(34, 197, 94)"
                    stroke="white"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : (
                // Multiple points - show as connected line
                <polyline
                  fill="none"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  points={data.map((item, idx) => {
                    const x = (idx / (data.length - 1)) * 100;
                    const y = (1 - item.successRate) * 100;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}
            </svg>
            
            {/* Y-axis labels */}
            <div className="absolute right-0 inset-y-0 flex flex-col justify-between text-xs text-muted-foreground py-1 opacity-50">
              <span>100%</span>
              <span>90%</span>
              <span>80%</span>
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            {data.length > 1 && <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

