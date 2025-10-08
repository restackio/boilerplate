"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { getPerformanceMetrics, getQualityMetrics, type MetricsFilters } from "@/app/actions/metrics";
import { Activity, Clock, DollarSign, CheckCircle2 } from "lucide-react";

interface MetricsOverviewProps {
  filters: MetricsFilters;
}

export default function MetricsOverview({ filters }: MetricsOverviewProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [perf, qual] = await Promise.all([
          getPerformanceMetrics(filters),
          getQualityMetrics(filters),
        ]);
        setPerformanceMetrics(perf);
        setQualityMetrics(qual);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filters]);

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  // Calculate overall pass rate from quality metrics
  const overallPassRate = qualityMetrics.length > 0
    ? qualityMetrics.reduce((sum, m) => sum + m.passRate, 0) / qualityMetrics.length
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {performanceMetrics?.avgDuration ? `${performanceMetrics.avgDuration}ms` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {performanceMetrics?.taskCount || 0} tasks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Tokens</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {performanceMetrics?.avgTokens?.toLocaleString() || "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Input + Output
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${performanceMetrics?.totalCost?.toFixed(3) || "0.000"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last {filters.dateRange || "7 days"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality Pass Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(overallPassRate * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {qualityMetrics.length} metrics
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
