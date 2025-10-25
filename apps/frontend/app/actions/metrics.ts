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
  parent_agent_ids?: string[]; // Optional: Associate metric with specific parent agents
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
    const data = (result as { success?: boolean; data?: { quality?: unknown[] } })?.data;
    return data?.quality || [];
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

    const data = (result as { success?: boolean; data?: { performance?: unknown[]; quality?: unknown[] } })?.data;
    return {
      performance: data?.performance || [],
      quality: data?.quality || [],
    };
  } catch (error) {
    console.error("Error fetching task metrics:", error);
    return { performance: [], quality: [] };
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
  parent_agent_ids?: string[]; // Associated parent agents
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

// Update metric definition
export interface UpdateMetricInput {
  metric_id: string;
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  is_active?: boolean;
  parent_agent_ids?: string[];
  [key: string]: unknown;
}

export async function updateMetric(input: UpdateMetricInput): Promise<boolean> {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "UpdateMetricDefinitionWorkflow",
      input,
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return (result as { success?: boolean })?.success || false;
  } catch (error) {
    console.error("Error updating metric:", error);
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

export interface RunRetroactiveEvaluationInput {
  workspace_id: string;
  metric_definition_id: string;
  retroactive_date_from?: string;
  retroactive_date_to?: string;
  retroactive_sample_percentage?: number;
  retroactive_agent_id?: string;
  retroactive_agent_version?: string;
  retroactive_max_traces?: number;
}

export interface RunRetroactiveEvaluationOutput {
  success: boolean;
  workflow_id?: string;
  total_traces?: number;
  error?: string;
}

// Run retroactive evaluation on an existing metric
export async function runRetroactiveEvaluation(
  input: RunRetroactiveEvaluationInput
): Promise<RunRetroactiveEvaluationOutput> {
  try {
    // Build filters
    const filters: Record<string, unknown> = {};
    
    if (input.retroactive_date_from) {
      filters.date_from = input.retroactive_date_from;
    }
    if (input.retroactive_date_to) {
      filters.date_to = input.retroactive_date_to;
    }
    if (input.retroactive_agent_id) {
      filters.agent_id = input.retroactive_agent_id;
    }
    if (input.retroactive_agent_version) {
      filters.agent_version = input.retroactive_agent_version;
    }

    const { workflowId } = await runWorkflow({
      workflowName: "RetroactiveMetrics",
      input: {
        workspace_id: input.workspace_id,
        metric_definition_id: input.metric_definition_id,
        filters,
        batch_size: 100,
        max_traces: input.retroactive_max_traces,
        sample_percentage: input.retroactive_sample_percentage,
      },
    });

    // Note: RetroactiveMetrics may run for a while, so we don't wait for result
    // Just return the workflow ID for tracking
    return {
      success: true,
      workflow_id: `${workflowId}`,
    };
  } catch (error) {
    console.error("Error running retroactive evaluation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
