"use client";

import { Button } from "@workspace/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { type AnalyticsFilters } from "@/app/actions/analytics";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface MetricsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

export default function MetricsFilters({ filters, onFiltersChange }: MetricsFiltersProps) {
  const { agents } = useWorkspaceScopedActions();

  const handleReset = () => {
    onFiltersChange({
      ...filters,
      agentId: null,
      version: null,
      dateRange: "7d"
    });
  };

  return (

        <div className="flex items-center justify-start gap-2">
          <div >
            <Select
              value={filters.dateRange || "7d"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, dateRange: value as "1d" | "7d" | "30d" | "90d" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={filters.agentId || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, agentId: value === "all" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="All versions" />
              </SelectTrigger>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
  );
}
