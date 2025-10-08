"use client";

import { useEffect, useState } from "react";
import { type MetricsFilters, getPerformanceTimeSeries, type PerformanceTimeSeriesData } from "@/app/actions/metrics";
import { TrendingUp } from "lucide-react";

interface PerformanceChartProps {
  filters: MetricsFilters;
  detailed?: boolean;
}

export default function PerformanceChart({ filters, detailed }: PerformanceChartProps) {
  const [data, setData] = useState<PerformanceTimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getPerformanceTimeSeries(filters);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch performance data:", error);
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

  // Simple bar chart visualization using CSS
  const maxDuration = Math.max(...data.map(d => d.avgDuration));
  const maxTokens = Math.max(...data.map(d => d.avgTokens));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        <span>Performance trends over time</span>
      </div>
      
      <div className="space-y-3">
        {/* Duration Chart */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Average Duration (ms)</p>
          <div className="space-y-1">
            {data.slice(-7).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(item.avgDuration / maxDuration) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">
                      {Math.round(item.avgDuration)}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens Chart */}
        {detailed && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Average Tokens</p>
            <div className="space-y-1">
              {data.slice(-7).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(item.avgTokens / maxTokens) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {Math.round(item.avgTokens)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}