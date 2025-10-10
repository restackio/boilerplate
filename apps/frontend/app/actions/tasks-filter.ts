"use server";

import { executeWorkflow } from "./workflow";

/**
 * Filter tasks by metric failures or feedback
 */

export interface TasksByMetricInput {
  workspaceId: string;
  metricName: string;
  status?: "failed" | "passed";
  agentId?: string | null;
  version?: string | null;
  dateRange?: "1d" | "7d" | "30d" | "90d" | "all";
}

export interface TasksByFeedbackInput {
  workspaceId: string;
  feedbackType?: "positive" | "negative";
  agentId?: string | null;
  version?: string | null;
  dateRange?: "1d" | "7d" | "30d" | "90d" | "all";
}

export interface TaskIdsResult {
  success: boolean;
  task_ids: string[];
  count: number;
  error?: string;
}

/**
 * Get task IDs that failed or passed a specific metric
 */
export async function getTasksByMetric(
  input: TasksByMetricInput
): Promise<TaskIdsResult> {
  try {
    const result = await executeWorkflow("GetTasksByMetricWorkflow", {
      workspace_id: input.workspaceId,
      metric_name: input.metricName,
      status: input.status || "failed",
      agent_id: input.agentId || null,
      version: input.version || null,
      date_range: input.dateRange || "7d",
    });

    if (result?.success && result.data) {
      return {
        success: true,
        task_ids: result.data.task_ids || [],
        count: result.data.count || 0,
      };
    }

    return {
      success: false,
      task_ids: [],
      count: 0,
      error: result?.error || "Failed to fetch tasks by metric",
    };
  } catch (error) {
    console.error("[getTasksByMetric] Error:", error);
    return {
      success: false,
      task_ids: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get task IDs with specific feedback
 */
export async function getTasksByFeedback(
  input: TasksByFeedbackInput
): Promise<TaskIdsResult> {
  try {
    const result = await executeWorkflow("GetTasksByFeedbackWorkflow", {
      workspace_id: input.workspaceId,
      feedback_type: input.feedbackType || "negative",
      agent_id: input.agentId || null,
      version: input.version || null,
      date_range: input.dateRange || "7d",
    });

    if (result?.success && result.data) {
      return {
        success: true,
        task_ids: result.data.task_ids || [],
        count: result.data.count || 0,
      };
    }

    return {
      success: false,
      task_ids: [],
      count: 0,
      error: result?.error || "Failed to fetch tasks by feedback",
    };
  } catch (error) {
    console.error("[getTasksByFeedback] Error:", error);
    return {
      success: false,
      task_ids: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

