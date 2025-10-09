"use server";

import { executeWorkflow } from "./workflow";

/**
 * Create a new metric definition
 */
export async function createMetricDefinition(data: {
  workspaceId: string;
  name: string;
  description?: string;
  category: string;
  metricType: "llm_judge" | "python_code" | "formula";
  config: any;
}) {
  const result = await executeWorkflow("CreateMetricDefinitionWorkflow", {
    workspace_id: data.workspaceId,
    name: data.name,
    description: data.description,
    category: data.category,
    metric_type: data.metricType,
    config: data.config,
  });

  return result;
}

/**
 * Update a metric definition
 */
export async function updateMetricDefinition(data: {
  metricId: string;
  name?: string;
  description?: string;
  category?: string;
  config?: any;
  isActive?: boolean;
}) {
  const result = await executeWorkflow("UpdateMetricDefinitionWorkflow", {
    metric_id: data.metricId,
    name: data.name,
    description: data.description,
    category: data.category,
    config: data.config,
    is_active: data.isActive,
  });
  
  return result;
}

/**
 * Delete a metric definition
 */
export async function deleteMetricDefinition(metricId: string) {
  const result = await executeWorkflow("DeleteMetricDefinitionWorkflow", {
    metric_id: metricId,
  });
  
  return result;
}

/**
 * List all metric definitions for a workspace
 */
export async function listMetricDefinitions(workspaceId: string) {
  const result = await executeWorkflow("ListMetricDefinitionsWorkflow", { 
    workspace_id: workspaceId 
  });
  
  return result;
}

/**
 * Get all metric results for a specific task execution
 * Returns both performance and quality metrics from ClickHouse
 */

// Quality metrics (LLM judge, python code, formula evaluations)
export interface QualityMetricResult {
  metricCategory: 'quality';
  metricName: string;
  metricType: string;
  passed: boolean;
  score?: number;
  reasoning?: string;
  evalDurationMs: number;
  evalCostUsd: number;
  evaluatedAt: string;
  // Response tracking for continuous metrics
  responseId?: string;
  responseIndex?: number;
  messageCount?: number;
}

// Performance metrics (speed, tokens, cost)
export interface PerformanceMetricResult {
  metricCategory: 'performance';
  agentName: string;
  agentVersion: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  status: string;
  executedAt: string;
  // Response tracking for continuous metrics
  responseId?: string;
  responseIndex?: number;
  messageCount?: number;
}

export interface TaskMetricsResult {
  performance: PerformanceMetricResult[];
  quality: QualityMetricResult[];
}

export async function getTaskMetricResults(taskId: string): Promise<TaskMetricsResult> {
  try {
    const result = await executeWorkflow("GetTaskMetricsWorkflow", { 
      task_id: taskId 
    });
    
    if (result.success && result.data) {
      return result.data as TaskMetricsResult;
    }
    
    return { performance: [], quality: [] };
  } catch (error) {
    console.error("Failed to fetch task metric results:", error);
    return { performance: [], quality: [] };
  }
}

// Alias for backward compatibility - returns only quality metrics
export async function getTaskQualityMetrics(taskId: string): Promise<QualityMetricResult[]> {
  const result = await getTaskMetricResults(taskId);
  return result.quality;
}
