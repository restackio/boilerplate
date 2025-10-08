"use client";

import { useEffect, useState } from "react";
import { type MetricsFilters, getQualityTimeSeries, type QualityTimeSeriesData } from "@/app/actions/metrics";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface QualityMetricChartProps {
  filters: MetricsFilters;
  metricName: string;
}

export default function QualityMetricChart({ filters, metricName }: QualityMetricChartProps) {
  const [data, setData] = useState<QualityTimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getQualityTimeSeries(filters);
        // Filter to only this metric
        const filtered = result.filter(d => d.metricName === metricName);
        setData(filtered);
      } catch (error) {
        console.error("Failed to fetch quality data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filters, metricName]);

  if (loading) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center bg-card rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const scores = data.map(d => d.avgScore);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const latestScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const trend = latestScore - firstScore;
  const avgPassRate = data.reduce((sum, d) => sum + d.passRate, 0) / data.length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return { stroke: "rgb(34, 197, 94)", fill: "rgba(34, 197, 94, 0.1)", text: "text-green-600" };
    if (score >= 70) return { stroke: "rgb(234, 179, 8)", fill: "rgba(234, 179, 8, 0.1)", text: "text-yellow-600" };
    return { stroke: "rgb(239, 68, 68)", fill: "rgba(239, 68, 68, 0.1)", text: "text-red-600" };
  };

  const avgColor = getScoreColor(avgScore);

  // Calculate points for the line
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = (1 - item.avgScore / 100) * 100;
    return { x, y, score: item.avgScore, date: item.date };
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <div className="flex items-baseline gap-1">
            <p className={`text-2xl font-bold ${avgColor.text}`}>
              {avgScore.toFixed(1)}
            </p>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pass Rate</p>
          <p className="text-2xl font-bold">
            {(avgPassRate * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trend</p>
          <div className="flex items-center gap-1">
            {trend > 1 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{trend.toFixed(1)}</span>
              </>
            ) : trend < -1 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">{trend.toFixed(1)}</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Stable</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Score Line Chart */}
      <div className="relative h-48 bg-card rounded-lg border border-border">
        <svg className="absolute inset-0 w-full h-full p-4" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${metricName.replace(/\s+/g, '-')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={avgColor.fill} stopOpacity="0.5" />
              <stop offset="100%" stopColor={avgColor.fill} stopOpacity="0" />
            </linearGradient>
            <filter id={`glow-quality-${metricName.replace(/\s+/g, '-')}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />
          
          {/* Area fill */}
          <polygon
            fill={`url(#gradient-${metricName.replace(/\s+/g, '-')})`}
            points={`
              0,100
              ${points.map(p => `${p.x},${p.y}`).join(' ')}
              100,100
            `}
          />
          
          {/* Main line */}
          <polyline
            fill="none"
            stroke={avgColor.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-quality-${metricName.replace(/\s+/g, '-')})`}
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
          />
          
          {/* Points */}
          {points.map((point, idx) => {
            const pointColor = getScoreColor(point.score);
            return (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={pointColor.stroke}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-6 transition-all"
              >
                <title>{`${new Date(point.date).toLocaleDateString()}: ${point.score.toFixed(1)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        {data.length > 2 && (
          <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
        <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}