"use server";

import { executeWorkflow } from "./workflow";

export interface Span {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  agent_name: string | null;
  workspace_id: string | null;
  agent_version: string;
  temporal_agent_id: string | null;
  temporal_run_id: string | null;
  span_type: string;
  span_name: string;
  duration_ms: number;
  status: string;
  model_name: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  input: string;
  output: string;
  metadata: Record<string, unknown>;
  error_message: string | null;
  error_type: string | null;
  started_at: string;
  ended_at: string;
}

export interface GetTaskTracesOutput {
  spans: Span[];
  total_duration_ms: number;
  total_tokens: number;
  total_cost_usd: number;
  generation_count: number;
  function_count: number;
  error_count: number;
}

/**
 * Fetches all trace spans for a given task
 */
export async function getTaskTraces(
  taskId: string
): Promise<GetTaskTracesOutput> {
  try {
    const result = await executeWorkflow("GetTaskTracesWorkflow", { 
      task_id: taskId 
    });

    if (result.success && result.data) {
      return result.data as GetTaskTracesOutput;
    }
    
    return {
      spans: [],
      total_duration_ms: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      generation_count: 0,
      function_count: 0,
      error_count: 0,
    };
  } catch (error) {
    console.error("Error fetching task traces:", error);
    return {
      spans: [],
      total_duration_ms: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      generation_count: 0,
      function_count: 0,
      error_count: 0,
    };
  }
}

