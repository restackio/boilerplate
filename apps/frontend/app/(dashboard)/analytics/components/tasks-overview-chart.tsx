"use client";

import type { OverviewTimeSeries } from "@/app/actions/analytics";
import type { AgentPublishEvent } from "@/app/actions/agents";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface TasksOverviewChartProps {
  data: OverviewTimeSeries[];
  publishEvents?: AgentPublishEvent[];
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

export default function TasksOverviewChart({ data, publishEvents = [] }: TasksOverviewChartProps) {
  // Handle no data case
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxTasks = Math.max(...data.map(d => d.taskCount));
  const avgFailRate = data.reduce((sum, d) => sum + d.failRate, 0) / data.length;
  const trend = data.length > 1 ? data[data.length - 1].failRate - data[0].failRate : 0;

  // Calculate annotation positions
  const startDate = new Date(data[0].date).getTime();
  const endDate = new Date(data[data.length - 1].date).getTime();
  const timeRange = endDate - startDate || 1;

  const annotations = publishEvents.map((event) => {
    const eventDate = new Date(event.publishedAt).getTime();
    const position = ((eventDate - startDate) / timeRange) * 100;
    return { ...event, position };
  }).filter(a => a.position >= 0 && a.position <= 100);

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
          <p className="text-sm text-muted-foreground">Avg fail rate</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">
              <Link href={`/tasks?status=failed`}>{(avgFailRate * 100).toFixed(1)}%</Link>
            </p>
            {trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-600" />
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
          <div className="relative h-32">
            <div className="h-full flex items-end gap-1">
              {data.map((item, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-neutral-800 dark:bg-neutral-200 rounded-t transition-all hover:bg-black/80 dark:hover:bg-white/80 cursor-pointer"
                  style={{ height: `${(item.taskCount / maxTasks) * 100}%` }}
                  title={`${new Date(item.date).toLocaleDateString()}\n${formatNumber(item.taskCount)} tasks`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Fail Rate Line */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Fail rate</p>
          <div className="relative h-24 border-b border-l border-muted">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              <div className="border-t border-dashed border-muted" />
              <div className="border-t border-dashed border-muted" />
              <div className="border-t border-dashed border-muted" />
            </div>
            
            {/* Line chart */}
            <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Fail rate line */}
              {data.length === 1 ? (
                // Single point - show as horizontal line
                <>
                  <line 
                    x1="10" 
                    y1={(1 - data[0].failRate) * 100} 
                    x2="90" 
                    y2={(1 - data[0].failRate) * 100} 
                    stroke="rgb(239, 68, 68)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx="50"
                    cy={(1 - data[0].failRate) * 100}
                    r="2"
                    fill="rgb(239, 68, 68)"
                    stroke="white"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : (
                // Multiple points - show as connected line
                <polyline
                  fill="none"
                  stroke="rgb(239, 68, 68)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  points={data.map((item, idx) => {
                    const x = (idx / (data.length - 1)) * 100;
                    const y = (1 - item.failRate) * 100;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}
              
              {/* Annotation markers for agent publishes */}
              {annotations.map((annotation, idx) => (
                <line
                  key={idx}
                  x1={annotation.position}
                  y1="0"
                  x2={annotation.position}
                  y2="100"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.5"
                />
              ))}
            </svg>
            
            {/* Annotation tooltips */}
            {annotations.map((annotation, idx) => (
              <div
                key={idx}
                className="absolute bottom-0 group"
                style={{ left: `${annotation.position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mb-1" />
                  <div className="text-[10px] text-purple-600 font-medium cursor-pointer">
                    {annotation.version}
                  </div>
                </div>
                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 w-56 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border">
                  <div className="font-semibold text-sm">{annotation.agentName}</div>
                  <div className="text-purple-600 text-[10px] mt-0.5">
                    {annotation.version} published
                  </div>
                  <div className="text-muted-foreground text-[10px] mt-1">
                    {new Date(annotation.publishedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                  {annotation.description && (
                    <div className="mt-2 text-[10px] border-t pt-2">{annotation.description}</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Y-axis labels */}
            <div className="absolute right-0 inset-y-0 flex flex-col justify-between text-xs text-muted-foreground py-1 opacity-50">
              <span>100%</span>
              <span>90%</span>
              <span>80%</span>
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            {data.map((item, idx) => {
              // Show labels based on data length:
              // - 1-8 days: show all
              // - 9-15 days: show every 2nd
              // - 16-45 days: show every 5th
              // - 46+ days: show every 10th
              let showLabel = false;
              if (data.length <= 8) {
                showLabel = true;
              } else if (data.length <= 15) {
                showLabel = idx % 2 === 0 || idx === data.length - 1;
              } else if (data.length <= 45) {
                showLabel = idx % 5 === 0 || idx === data.length - 1;
              } else {
                showLabel = idx % 10 === 0 || idx === data.length - 1;
              }

              if (!showLabel) return null;

              return (
                <span key={idx} className="flex-shrink-0">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

