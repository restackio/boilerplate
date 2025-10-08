"use server";

import { executeWorkflow } from "./workflow";

export interface MetricsFilters {
  agentId?: string | null;
  dateRange?: "1d" | "7d" | "30d" | "90d";
  version?: string | null;
  workspaceId: string;
}

export interface PerformanceMetrics {
  avgDuration: number;
  avgTokens: number;
  totalCost: number;
  taskCount: number;
}

export interface QualityMetrics {
  metricName: string;
  avgScore: number;
  passRate: number;
  evaluationCount: number;
}

export interface PerformanceTimeSeriesData {
  date: string;
  avgDuration: number;
  avgTokens: number;
  totalCost: number;
}

export interface QualityTimeSeriesData {
  date: string;
  metricName: string;
  avgScore: number;
  passRate: number;
}

/**
 * Get performance metrics summary
 */
export async function getPerformanceMetrics(
  filters: MetricsFilters
): Promise<PerformanceMetrics> {
  // TODO: Implement ClickHouse query via MCP
  // For now, return realistic mock data based on seed
  return {
    avgDuration: 2500,
    avgTokens: 1800,
    totalCost: 0.045,
    taskCount: 8, // We have 8 tasks in seed data
  };
}

/**
 * Get performance metrics time series for charts
 */
export async function getPerformanceTimeSeries(
  filters: MetricsFilters
): Promise<PerformanceTimeSeriesData[]> {
  // TODO: Implement ClickHouse query
  // Mock data with daily aggregates
  const days = filters.dateRange === "1d" ? 1 : filters.dateRange === "7d" ? 7 : 30;
  const data: PerformanceTimeSeriesData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      avgDuration: 2000 + Math.random() * 1500, // 2000-3500ms
      avgTokens: 1500 + Math.random() * 800, // 1500-2300 tokens
      totalCost: 0.005 + Math.random() * 0.01, // $0.005-0.015
    });
  }
  
  return data;
}

/**
 * Get quality metrics summary
 */
export async function getQualityMetrics(
  filters: MetricsFilters
): Promise<QualityMetrics[]> {
  // TODO: Implement ClickHouse query
  // Mock data matching seed data
  return [
    {
      metricName: "Response Helpfulness",
      avgScore: 85.2,
      passRate: 0.94,
      evaluationCount: 5, // 5 evaluations in seed
    },
    {
      metricName: "Safety & Compliance",
      avgScore: 97.8,
      passRate: 1.0,
      evaluationCount: 3,
    },
    {
      metricName: "Speed Score",
      avgScore: 78.5,
      passRate: 0.88,
      evaluationCount: 5,
    },
  ];
}

/**
 * Get quality metrics time series for charts
 */
export async function getQualityTimeSeries(
  filters: MetricsFilters
): Promise<QualityTimeSeriesData[]> {
  // TODO: Implement ClickHouse query
  const days = filters.dateRange === "1d" ? 1 : filters.dateRange === "7d" ? 7 : 30;
  const metrics = ["Response Helpfulness", "Safety & Compliance", "Speed Score"];
  const data: QualityTimeSeriesData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    metrics.forEach(metric => {
      data.push({
        date: dateStr,
        metricName: metric,
        avgScore: 70 + Math.random() * 25, // 70-95 score
        passRate: 0.85 + Math.random() * 0.15, // 85-100% pass rate
      });
    });
  }
  
  return data;
}

/**
 * Get version comparison data
 */
export async function getVersionComparison(
  agentId: string,
  versions: string[],
  workspaceId: string
) {
  // TODO: Implement ClickHouse query
  return {
    versions: ["v1", "v2"],
    performance: [
      {
        version: "v1",
        avgDuration: 2600,
        avgTokens: 1900,
        totalCost: 0.048,
        taskCount: 100,
      },
      {
        version: "v2",
        avgDuration: 2200,
        avgTokens: 1600,
        totalCost: 0.040,
        taskCount: 50,
      },
    ],
    quality: [
      {
        version: "v1",
        metricName: "Response Helpfulness",
        avgScore: 84.0,
        passRate: 0.92,
      },
      {
        version: "v2",
        metricName: "Response Helpfulness",
        avgScore: 86.5,
        passRate: 0.96,
      },
    ],
  };
}

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
  outputType?: string;
  minValue?: number;
  maxValue?: number;
}) {
  const result = await executeWorkflow("create_metric_definition", {
    workspace_id: data.workspaceId,
    name: data.name,
    description: data.description,
    category: data.category,
    metric_type: data.metricType,
    config: data.config,
    output_type: data.outputType || "score",
    min_value: data.minValue,
    max_value: data.maxValue,
  });
  
  return result;
}

/**
 * List all metric definitions for a workspace
 */
export async function listMetricDefinitions(workspaceId: string) {
  const result = await executeWorkflow("list_metric_definitions", { 
    workspace_id: workspaceId 
  });
  
  return result;
}

/**
 * Assign a metric to an agent
 */
export async function assignMetricToAgent(data: {
  agentId: string;
  metricDefinitionId: string;
  enabled?: boolean;
  runOnCompletion?: boolean;
  runOnPlayground?: boolean;
}) {
  const result = await executeWorkflow("assign_metric_to_agent", {
    agent_id: data.agentId,
    metric_definition_id: data.metricDefinitionId,
    enabled: data.enabled ?? true,
    run_on_completion: data.runOnCompletion ?? true,
    run_on_playground: data.runOnPlayground ?? true,
  });
  
  return result;
}

/**
 * Get metrics assigned to an agent
 */
export async function getAgentMetrics(agentId: string) {
  const result = await executeWorkflow("get_agent_metrics", { 
    agent_id: agentId 
  });
  
  return result;
}

/**
 * Get playground metrics for an agent
 */
export async function getPlaygroundMetrics(agentId: string) {
  const result = await executeWorkflow("get_playground_metrics", { 
    agent_id: agentId 
  });
  
  return result;
}
