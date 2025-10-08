"use client";

import { useEffect, useState } from "react";
import { type MetricsFilters, getPerformanceTimeSeries, type PerformanceTimeSeriesData } from "@/app/actions/metrics";

interface PerformanceMetricChartProps {
  filters: MetricsFilters;
  metric: "duration" | "tokens" | "cost";
  label: string;
  color: "blue" | "green" | "purple";
}

export default function PerformanceMetricChart({ filters, metric, label, color }: PerformanceMetricChartProps) {
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
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getValue = (item: PerformanceTimeSeriesData) => {
    switch (metric) {
      case "duration": return item.avgDuration;
      case "tokens": return item.avgTokens;
      case "cost": return item.totalCost * 1000; // Convert to display scale
    }
  };

  const values = data.map(getValue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  const colorConfig = {
    blue: {
      stroke: "rgb(59, 130, 246)",
      fill: "rgba(59, 130, 246, 0.1)",
      point: "rgb(59, 130, 246)",
      glow: "rgba(59, 130, 246, 0.5)",
    },
    green: {
      stroke: "rgb(34, 197, 94)",
      fill: "rgba(34, 197, 94, 0.1)",
      point: "rgb(34, 197, 94)",
      glow: "rgba(34, 197, 94, 0.5)",
    },
    purple: {
      stroke: "rgb(168, 85, 247)",
      fill: "rgba(168, 85, 247, 0.1)",
      point: "rgb(168, 85, 247)",
      glow: "rgba(168, 85, 247, 0.5)",
    },
  };

  const colors = colorConfig[color];

  const formatValue = (value: number) => {
    if (metric === "cost") {
      return `$${(value / 1000).toFixed(4)}`;
    }
    return Math.round(value).toLocaleString();
  };

  // Calculate points for the line
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const value = getValue(item);
    const y = (1 - (value - minValue) / (maxValue - minValue || 1)) * 100;
    return { x, y, value: getValue(item) };
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

      {/* Line Chart */}
      <div className="relative h-40 bg-card rounded-lg border border-border">
        <svg className="absolute inset-0 w-full h-full p-4" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity="0.5" />
              <stop offset="100%" stopColor={colors.fill} stopOpacity="0" />
            </linearGradient>
            <filter id={`glow-${color}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Area fill */}
          <polygon
            fill={`url(#gradient-${color})`}
            points={`
              0,100
              ${points.map(p => `${p.x},${p.y}`).join(' ')}
              100,100
            `}
          />
          
          {/* Main line */}
          <polyline
            fill="none"
            stroke={colors.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${color})`}
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
          />
          
          {/* Points */}
          {points.map((point, idx) => (
            <circle
              key={idx}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={colors.point}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all"
            >
              <title>{`${new Date(data[idx].date).toLocaleDateString()}: ${formatValue(point.value)}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>{new Date(data[0]?.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        {data.length > 2 && (
          <span>{new Date(data[Math.floor(data.length / 2)]?.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
        <span>{new Date(data[data.length - 1]?.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}