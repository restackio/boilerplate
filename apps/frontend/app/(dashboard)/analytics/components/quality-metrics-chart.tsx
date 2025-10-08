"use client";

import { useEffect, useState } from "react";
import { type MetricsFilters, getQualityTimeSeries, type QualityTimeSeriesData } from "@/app/actions/metrics";
import { Award } from "lucide-react";

interface QualityMetricsChartProps {
  filters: MetricsFilters;
  detailed?: boolean;
}

export default function QualityMetricsChart({ filters, detailed }: QualityMetricsChartProps) {
  const [data, setData] = useState<QualityTimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getQualityTimeSeries(filters);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch quality data:", error);
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

  // Group by metric name and get latest scores
  const metricNames = [...new Set(data.map(d => d.metricName))];
  const latestData = metricNames.map(name => {
    const metricData = data.filter(d => d.metricName === name);
    return metricData[metricData.length - 1];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Award className="h-4 w-4" />
        <span>Quality metrics scores</span>
      </div>
      
      <div className="space-y-3">
        {latestData.map((item, idx) => {
          const scoreColor = 
            item.avgScore >= 90 ? "bg-green-500" :
            item.avgScore >= 70 ? "bg-yellow-500" :
            "bg-red-500";
          
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.metricName}</span>
                <span className="text-sm text-muted-foreground">
                  {item.avgScore.toFixed(1)}/100
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Score bar */}
                <div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden">
                  <div
                    className={`${scoreColor} h-full rounded-full transition-all`}
                    style={{ width: `${item.avgScore}%` }}
                  />
                </div>
                
                {/* Pass rate */}
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {(item.passRate * 100).toFixed(0)}% pass
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {detailed && data.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Trend (last 7 days)</p>
          <div className="h-20 flex items-end gap-1">
            {data.slice(-7).map((item, idx) => (
              <div
                key={idx}
                className="flex-1 bg-blue-500 rounded-t"
                style={{ height: `${item.avgScore}%` }}
                title={`${new Date(item.date).toLocaleDateString()}: ${item.avgScore.toFixed(1)}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}