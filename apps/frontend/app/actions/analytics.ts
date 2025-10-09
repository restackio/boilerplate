"use server";

import { executeWorkflow } from "./workflow";

/**
 * Simplified Analytics API
 * Uses unified GetAnalyticsMetrics workflow for faster, more efficient data fetching
 */

export interface AnalyticsFilters {
  workspaceId: string;
  agentId?: string | null;
  version?: string | null;
  dateRange?: "1d" | "7d" | "30d" | "90d";
}

export interface PerformanceData {
  avgDuration: number;
  avgTokens: number;
  totalCost: number;
  taskCount: number;
}

export interface PerformanceTimeSeries {
  date: string;
  avgDuration: number;
  avgTokens: number;
  totalCost: number;
}

export interface QualitySummary {
  metricName: string;
  metricId: string;
  isDefault: boolean;
  passRate: number;
  avgScore?: number;
  evaluationCount: number;
}

export interface QualityTimeSeries {
  date: string;
  metricName: string;
  passRate: number;
  avgScore?: number;
}

export interface OverviewTimeSeries {
  date: string;
  taskCount: number;
  successRate: number;
}

export interface FeedbackTimeSeries {
  date: string;
  totalTasks: number;
  tasksWithFeedback: number;
  positiveCount: number;
  negativeCount: number;
  feedbackCount: number;
  feedbackCoverage: number;
}

export interface DetailedFeedback {
  taskId: string;
  isPositive: boolean;
  comment?: string | null;
  createdAt: string;
}

export interface AnalyticsData {
  performance?: {
    summary: PerformanceData;
    timeseries: PerformanceTimeSeries[];
  };
  quality?: {
    summary: QualitySummary[];
    timeseries: QualityTimeSeries[];
  };
  overview?: {
    timeseries: OverviewTimeSeries[];
  };
  feedback?: {
    timeseries: FeedbackTimeSeries[];
    detailed: DetailedFeedback[];
  };
}

/**
 * Fetch all analytics metrics in one unified call
 * Much faster than calling separate endpoints
 * 
 * @param filters - workspace, agent, version, date range
 * @param metricTypes - which metrics to fetch (default: all)
 * @returns All requested analytics data
 */
export async function getAnalytics(
  filters: AnalyticsFilters,
  metricTypes: ("performance" | "quality" | "overview")[] | "all" = "all"
): Promise<AnalyticsData> {
  try {
    const result = await executeWorkflow("GetAnalyticsMetrics", {
      workspace_id: filters.workspaceId,
      agent_id: filters.agentId || null,
      version: filters.version || null,
      date_range: filters.dateRange || "7d",
      metric_types: metricTypes,
    });

    // Handle double-wrapped response structure
    if (result?.success && result.data) {
      const workflowResult = result.data;
      
      // Check if workflow itself was successful
      if (typeof workflowResult === 'object' && workflowResult !== null && 'success' in workflowResult) {
        if (workflowResult.success && 'data' in workflowResult) {
          return workflowResult.data as AnalyticsData;
        }
      }
      
      // Fallback: return data as-is
      return workflowResult as AnalyticsData;
    }

    // Return empty structure on error
    return {
      performance: { summary: { avgDuration: 0, avgTokens: 0, totalCost: 0, taskCount: 0 }, timeseries: [] },
      quality: { summary: [], timeseries: [] },
      overview: { timeseries: [] }
    };
  } catch (error) {
    console.error("[getAnalytics] Error:", error);
    return {
      performance: { summary: { avgDuration: 0, avgTokens: 0, totalCost: 0, taskCount: 0 }, timeseries: [] },
      quality: { summary: [], timeseries: [] },
      overview: { timeseries: [] }
    };
  }
}
