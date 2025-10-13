"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { 
  CheckCircle, 
  Circle, 
  CircleDashed, 
  CirclePause, 
  CircleX,
  TrendingUp
} from "lucide-react";
import { executeWorkflow } from "@/app/actions/workflow";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

interface TaskStats {
  in_progress: number;
  in_review: number;
  closed: number;
  completed: number;
  total: number;
}

// Status configuration with specific icons and colors
const statusConfig = {
  in_progress: {
    label: "In progress",
    icon: CircleDashed,
    color: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
  },
  in_review: {
    label: "In review",
    icon: CirclePause,
    color: "bg-orange-500",
    textColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
  },
  closed: {
    label: "Closed",
    icon: CircleX,
    color: "bg-gray-500",
    textColor: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950/50",
    borderColor: "border-gray-200 dark:border-gray-800",
    badgeColor: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200"
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    borderColor: "border-green-200 dark:border-green-800",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
  }
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function TaskStatsCard() {
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const router = useRouter();
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle clicking on a status card to filter tasks
  const handleStatusClick = (status: keyof typeof statusConfig) => {
    router.push(`/tasks?status=${status}`);
  };

  const fetchStats = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await executeWorkflow("TasksGetStatsWorkflow", {
        workspace_id: currentWorkspaceId
      });

      if (result.success && result.data) {
        // Backend applies demo multipliers if enabled via DEMO_MULTIPLIER env var
        setStats(result.data as TaskStats);
      } else {
        setError(result.error || "Failed to fetch task statistics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 shadow-none">
            <div className="space-y-2">
              {/* Icon and Badge skeleton */}
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              {/* Number skeleton */}
              <Skeleton className="h-8 w-16" />
              {/* Percentage skeleton */}
              <Skeleton className="h-3 w-10" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 shadow-none">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-red-500" />
          <span className="font-medium text-sm">Task Statistics</span>
        </div>
        <div className="text-red-600 dark:text-red-400 text-sm">
          Error loading statistics: {error}
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Card */}
        <Card className="p-4 shadow-none">
          <div className="flex items-center justify-between mb-2">
            <Circle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <Badge variant="secondary" className="text-xs">
              Total
            </Badge>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(stats.total)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            All tasks
          </div>
        </Card>

        {/* Status Cards */}
        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = stats[status];
          
          return (
            <Card
              key={status}
              className={`p-4 border ${config.borderColor} ${config.bgColor} shadow-none cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105`}
              onClick={() => handleStatusClick(status)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-4 w-4 ${config.textColor}`} />
                <Badge 
                  className={`${config.badgeColor} border-0 text-xs`}
                >
                  {config.label}
                </Badge>
              </div>
              <div className={`text-2xl font-bold ${config.textColor}`}>
                {formatNumber(count)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {count > 0 ? `${((count / stats.total) * 100).toFixed(1)}%` : '0%'}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
