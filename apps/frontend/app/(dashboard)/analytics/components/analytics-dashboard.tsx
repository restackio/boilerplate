"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import MetricsFilters from "./metrics-filters";
import TasksOverviewChart from "./tasks-overview-chart";
import PerformanceMetricChart from "./performance-metric-chart";
import QualityMetricChart from "./quality-metric-chart";

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState({
    agentId: null as string | null,
    dateRange: "7d" as "1d" | "7d" | "30d" | "90d",
    version: null as string | null,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MetricsFilters filters={filters} onFiltersChange={setFilters} />

      {/* Main Overview Chart - Tasks & Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Task volume and success rate over time
          </p>
        </CardHeader>
        <CardContent>
          <TasksOverviewChart filters={filters} />
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Performance Metrics</h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceMetricChart 
                filters={filters} 
                metric="duration" 
                label="ms"
                color="blue"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Token Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceMetricChart 
                filters={filters} 
                metric="tokens" 
                label="tokens"
                color="green"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceMetricChart 
                filters={filters} 
                metric="cost" 
                label="$"
                color="purple"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quality Metrics</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Helpfulness</CardTitle>
            </CardHeader>
            <CardContent>
              <QualityMetricChart 
                filters={filters} 
                metricName="Response Helpfulness"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Safety & Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <QualityMetricChart 
                filters={filters} 
                metricName="Safety & Compliance"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Speed Score</CardTitle>
            </CardHeader>
            <CardContent>
              <QualityMetricChart 
                filters={filters} 
                metricName="Speed Score"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conciseness</CardTitle>
            </CardHeader>
            <CardContent>
              <QualityMetricChart 
                filters={filters} 
                metricName="Conciseness"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}