"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { type MetricsFilters } from "@/app/actions/metrics";

interface AgentVersionComparisonProps {
  filters: MetricsFilters;
}

export default function AgentVersionComparison({ filters }: AgentVersionComparisonProps) {
  // TODO: Implement version comparison
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">A/B Test Comparison</p>
            <p className="text-xs mt-1">Coming soon - Side-by-side version metrics</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
