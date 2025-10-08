"use client";

import { Card, CardContent } from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { type MetricsFilters } from "@/app/actions/metrics";

interface MetricsFiltersProps {
  filters: MetricsFilters;
  onFiltersChange: (filters: MetricsFilters) => void;
}

export default function MetricsFilters({ filters, onFiltersChange }: MetricsFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select
              value={filters.dateRange || "7d"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, dateRange: value as any })
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

          <div className="flex-1">
            {/* TODO: Add agent selector */}
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
            </Select>
          </div>

          <div className="flex-1">
            {/* TODO: Add version selector */}
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="All versions" />
              </SelectTrigger>
            </Select>
          </div>

          <Button variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
