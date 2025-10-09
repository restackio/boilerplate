"use client";

import type { PerformanceTimeSeries } from "@/app/actions/analytics";
import BaseLineChart from "./base-line-chart";

interface PerformanceMetricChartProps {
  data: PerformanceTimeSeries[];
  metric: "duration" | "tokens" | "cost";
  color: "blue" | "green" | "purple";
}

export default function PerformanceMetricChart({ data, metric, color }: PerformanceMetricChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const getValue = (item: PerformanceTimeSeries) => {
    switch (metric) {
      case "duration": return item.avgDuration;
      case "tokens": return item.avgTokens;
      case "cost": return item.totalCost * 1000;
    }
  };

  const values = data.map(getValue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  const colorConfig = {
    blue: { stroke: "rgb(59, 130, 246)", fill: "rgba(59, 130, 246, 0.1)" },
    green: { stroke: "rgb(34, 197, 94)", fill: "rgba(34, 197, 94, 0.1)" },
    purple: { stroke: "rgb(168, 85, 247)", fill: "rgba(168, 85, 247, 0.1)" },
  };

  const colors = colorConfig[color];

  const formatValue = (value: number) => {
    if (metric === "cost") return `$${(value / 1000).toFixed(4)}`;
    return Math.round(value).toLocaleString();
  };

  // Calculate points for the chart
  const points = data.map((item, idx) => {
    const value = getValue(item);
    return {
      x: data.length === 1 ? 50 : (idx / (data.length - 1)) * 100,
      y: (1 - (value - minValue) / (maxValue - minValue || 1)) * 100,
      value,
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Avg</p>
          <p className="font-medium">{formatValue(avgValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="font-medium">{formatValue(minValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="font-medium">{formatValue(maxValue)}</p>
        </div>
      </div>

      {/* Chart */}
      <BaseLineChart
        data={points}
        color={colors.stroke}
        fillColor={colors.fill}
        formatValue={formatValue}
      />

      {/* X-axis labels */}
      {data.length > 1 && (
        <div className="flex justify-between text-xs text-muted-foreground px-2">
          <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          {data.length > 2 && (
            <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
          <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}

