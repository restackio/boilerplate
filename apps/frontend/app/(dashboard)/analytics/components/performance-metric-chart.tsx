"use client";

import type { PerformanceTimeSeries } from "@/app/actions/analytics";
import BaseLineChart from "./base-line-chart";

interface PerformanceMetricChartProps {
  data: PerformanceTimeSeries[];
  metric: "duration" | "tokens" | "cost";
  color: "blue" | "green" | "orange";
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
    blue: { stroke: "rgb(0, 213, 244)", fill: "rgba(0, 213, 244, 0.1)" },
    green: { stroke: "rgb(0, 244, 78)", fill: "rgba(0, 244, 78, 0.1)" },
    orange: { stroke: "rgb(242, 98, 0)", fill: "rgba(242, 98, 0, 0.1)" },
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
      <div className="flex justify-between text-[10px] text-muted-foreground px-2">
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
  );
}

