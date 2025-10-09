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

  const passRates = filtered.map(d => d.passRate * 100);
  const avgPassRate = passRates.reduce((sum, s) => sum + s, 0) / passRates.length;

  const getPassRateColor = (passRate: number) => {
    if (passRate >= 90) return { stroke: "rgb(34, 197, 94)", fill: "rgba(34, 197, 94, 0.1)", text: "text-green-600" };
    if (passRate >= 70) return { stroke: "rgb(234, 179, 8)", fill: "rgba(234, 179, 8, 0.1)", text: "text-yellow-600" };
    return { stroke: "rgb(239, 68, 68)", fill: "rgba(239, 68, 68, 0.1)", text: "text-red-600" };
  };

  const avgColor = getPassRateColor(avgPassRate);

  // Calculate points for the chart
  const points = filtered.map((item, idx) => ({
    x: filtered.length === 1 ? 50 : (idx / (filtered.length - 1)) * 100,
    y: (1 - item.passRate) * 100,
    value: item.passRate * 100,
    label: `${new Date(item.date).toLocaleDateString()}: ${(item.passRate * 100).toFixed(1)}% pass rate`
  }));

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Avg Pass Rate</p>
          <p className={`text-2xl font-bold ${avgColor.text}`}>
            {avgPassRate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-2xl font-bold">{Math.min(...passRates).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-2xl font-bold">{Math.max(...passRates).toFixed(1)}%</p>
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
      {filtered.length > 1 && (
        <div className="flex justify-between text-xs text-muted-foreground px-2">
          <span>{new Date(filtered[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          {filtered.length > 2 && (
            <span>{new Date(filtered[Math.floor(filtered.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
          <span>{new Date(filtered[filtered.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}

