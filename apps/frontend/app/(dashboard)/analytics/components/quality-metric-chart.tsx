"use client";

import type { QualityTimeSeries } from "@/app/actions/analytics";
import BaseLineChart from "./base-line-chart";

interface QualityMetricChartProps {
  data: QualityTimeSeries[];
  metricName: string;
}

export default function QualityMetricChart({ data, metricName }: QualityMetricChartProps) {
  const filtered = data.filter(d => d.metricName === metricName);

  if (filtered.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No evaluation data yet</p>
        <p className="text-xs text-muted-foreground mt-1">This metric will appear after evaluating tasks</p>
      </div>
    );
  }

  const failRates = filtered.map(d => d.failRate * 100);
  const avgFailRate = failRates.reduce((sum, s) => sum + s, 0) / failRates.length;

  const getFailRateColor = (failRate: number) => {
    if (failRate >= 30) return { stroke: "rgb(239, 68, 68)", fill: "rgba(239, 68, 68, 0.1)", text: "text-red-600" };
    if (failRate >= 10) return { stroke: "rgb(234, 179, 8)", fill: "rgba(234, 179, 8, 0.1)", text: "text-yellow-600" };
    return { stroke: "rgb(34, 197, 94)", fill: "rgba(34, 197, 94, 0.1)", text: "text-green-600" };
  };

  const avgColor = getFailRateColor(avgFailRate);

  // Calculate points for the chart
  const points = filtered.map((item, idx) => ({
    x: filtered.length === 1 ? 50 : (idx / (filtered.length - 1)) * 100,
    y: item.failRate * 100,
    value: item.failRate * 100,
    label: `${new Date(item.date).toLocaleDateString()}: ${(item.failRate * 100).toFixed(1)}% fail rate`
  }));

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Avg Fail Rate</p>
          <p className={`text-2xl font-bold ${avgColor.text}`}>
            {avgFailRate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-2xl font-bold">{Math.min(...failRates).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-2xl font-bold">{Math.max(...failRates).toFixed(1)}%</p>
        </div>
      </div>
      
      {/* Show avg score if available */}
      {filtered.some(d => d.avgScore !== undefined) && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Avg Score</p>
            <p className="text-sm font-medium">
              {(filtered.reduce((sum, d) => sum + (d.avgScore || 0), 0) / filtered.length).toFixed(1)}/100
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <BaseLineChart
        data={points}
        color={avgColor.stroke}
        fillColor={avgColor.fill}
        height={192}
        showGrid
        formatValue={(v) => `${v.toFixed(1)}%`}
      />

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-2">
        {filtered.map((item, idx) => {
          // Show labels based on data length:
          // - 1-8 days: show all
          // - 9-15 days: show every 2nd
          // - 16-45 days: show every 5th
          // - 46+ days: show every 10th
          let showLabel = false;
          if (filtered.length <= 8) {
            showLabel = true;
          } else if (filtered.length <= 15) {
            showLabel = idx % 2 === 0 || idx === filtered.length - 1;
          } else if (filtered.length <= 45) {
            showLabel = idx % 5 === 0 || idx === filtered.length - 1;
          } else {
            showLabel = idx % 10 === 0 || idx === filtered.length - 1;
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

