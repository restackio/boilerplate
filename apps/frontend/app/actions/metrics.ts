"use server";

import { runWorkflow, getWorkflowResult } from "./workflow";

export interface CreateMetricWithRetroactiveInput {
  workspace_id: string;
  name: string;
  description?: string;
  category: string;
  metric_type: string;
  config: Record<string, unknown>;
  is_active?: boolean;
  created_by?: string;
  run_retroactive?: boolean;
  retroactive_date_from?: string; // ISO format datetime string
  retroactive_date_to?: string; // ISO format datetime string
  retroactive_sample_percentage?: number;
  retroactive_agent_id?: string;
  retroactive_agent_version?: string;
  retroactive_max_traces?: number;
}

export interface CreateMetricWithRetroactiveOutput {
  success: boolean;
  metric_id?: string;
  metric_name?: string;
  retroactive_workflow_id?: string;
  error?: string;
}

export async function createMetricWithRetroactive(
  input: CreateMetricWithRetroactiveInput
): Promise<CreateMetricWithRetroactiveOutput> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "CreateMetricWithRetroactiveWorkflow",
      input: input as unknown as Record<string, unknown>,
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return {
      success: true,
      metric_id: (result as { metric_id?: string })?.metric_id,
      metric_name: (result as { metric_name?: string })?.metric_name,
      retroactive_workflow_id: (result as { retroactive_evaluation?: { workflow_id?: string } })?.retroactive_evaluation?.workflow_id,
    };
  } catch (error) {
    console.error("Error creating metric with retroactive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fetch task quality metrics from ClickHouse
export async function getTaskQualityMetrics(taskId: string) {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "GetTaskMetricsWorkflow",
      input: { task_id: taskId },
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    // Return quality metrics only
    const allMetrics = (result as { metrics?: Array<{ metric_category?: string }> })?.metrics || [];
    return allMetrics.filter((m) => m.metric_category === "quality");
  } catch (error) {
    console.error("Error fetching task quality metrics:", error);
    return [];
  }
}

export interface QualityMetricResult {
  metricName: string;
  metricType: string;
  passed: boolean;
  score?: number;
  reasoning?: string;
  evalDurationMs: number;
  evalCostUsd: number;
  evaluatedAt: string;
  responseId?: string;
  responseIndex?: number;
  messageCount?: number;
}

// Fetch all metrics for a task (performance + quality)
export async function getTaskMetrics(taskId: string) {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "GetTaskMetricsWorkflow",
      input: { task_id: taskId },
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return (result as { metrics?: unknown[] })?.metrics || [];
  } catch (error) {
    console.error("Error fetching task metrics:", error);
    return [];
  }
}

export interface MetricDefinition {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string;
  metric_type: string;
  config: Record<string, unknown> | string;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// List all metric definitions for a workspace
export async function listMetrics(workspaceId: string): Promise<MetricDefinition[]> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "ListMetricDefinitionsWorkflow",
      input: { 
        workspace_id: workspaceId,
      },
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return (result as { metrics?: MetricDefinition[] })?.metrics || [];
  } catch (error) {
    console.error("Error listing metrics:", error);
    return [];
  }
}

// Toggle metric active status
export async function toggleMetricStatus(metricId: string, isActive: boolean): Promise<boolean> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "UpdateMetricDefinitionWorkflow",
      input: { 
        metric_id: metricId,
        is_active: isActive
      },
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return (result as { success?: boolean })?.success || false;
  } catch (error) {
    console.error("Error toggling metric status:", error);
    return false;
  }
}

// Delete metric (soft delete)
export async function deleteMetric(metricId: string): Promise<boolean> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "DeleteMetricDefinitionWorkflow",
      input: { metric_id: metricId },
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return (result as { success?: boolean })?.success || false;
  } catch (error) {
    console.error("Error deleting metric:", error);
    return false;
  }
}
