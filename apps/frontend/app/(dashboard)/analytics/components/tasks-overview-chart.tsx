"use client";

import { useEffect, useState } from "react";
import { type MetricsFilters } from "@/app/actions/metrics";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TasksOverviewData {
  date: string;
  taskCount: number;
  successRate: number;
}

interface TasksOverviewChartProps {
  filters: MetricsFilters;
}

export default function TasksOverviewChart({ filters }: TasksOverviewChartProps) {
  const [data, setData] = useState<TasksOverviewData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // TODO: Fetch from ClickHouse via MCP
        // For now, generate mock time-series data
        const days = filters.dateRange === "1d" ? 1 : filters.dateRange === "7d" ? 7 : 30;
        const mockData: TasksOverviewData[] = [];
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          mockData.push({
            date: date.toISOString().split('T')[0],
            taskCount: Math.floor(10 + Math.random() * 20), // 10-30 tasks per day
            successRate: 0.85 + Math.random() * 0.14, // 85-99% success rate
          });
        }
        
        setData(mockData);
      } catch (error) {
        console.error("Failed to fetch tasks overview:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filters]);

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading chart...</p>
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
          <p className="text-sm text-muted-foreground">Total Tasks</p>
          <p className="text-2xl font-bold">
            {data.reduce((sum, d) => sum + d.taskCount, 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg Success Rate</p>
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
          <p className="text-sm text-muted-foreground">Avg Daily Tasks</p>
          <p className="text-2xl font-bold">
            {Math.round(data.reduce((sum, d) => sum + d.taskCount, 0) / data.length)}
          </p>
        </div>
      </div>

      {/* Dual-axis chart */}
      <div className="space-y-4">
        {/* Task Count Bars */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Task Volume</p>
          <div className="h-32 flex items-end gap-1">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                style={{ height: `${(item.taskCount / maxTasks) * 100}%` }}
                title={`${new Date(item.date).toLocaleDateString()}\n${item.taskCount} tasks`}
              />
            ))}
          </div>
        </div>

        {/* Success Rate Line */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Success Rate</p>
          <div className="relative h-24 border-b border-l border-muted">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              <div className="border-t border-dashed border-muted" />
              <div className="border-t border-dashed border-muted" />
              <div className="border-t border-dashed border-muted" />
            </div>
            
            {/* Line chart */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="rgb(34, 197, 94)"
                strokeWidth="2"
                points={data.map((item, idx) => {
                  const x = (idx / (data.length - 1)) * 100;
                  const y = (1 - item.successRate) * 100;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
            </svg>
            
            {/* Y-axis labels */}
            <div className="absolute -left-8 inset-y-0 flex flex-col justify-between text-xs text-muted-foreground">
              <span>100%</span>
              <span>90%</span>
              <span>80%</span>
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
