"""Export Temporal workflow history to ClickHouse for analytics.

Instead of adding OpenAI Agents SDK for tracing, leverage Temporal's native observability:
- Temporal/Restack captures ALL execution history (inputs, outputs, duration, errors)
- Export to ClickHouse in OpenTelemetry-compatible format
- Compatible with OpenAI Agents tracing schema (for potential future integration)

Why NOT use OpenAI Agents tracing directly:
- ❌ We use Restack/Temporal, not OpenAI Agents SDK runtime
- ❌ Different orchestration systems (incompatible)
- ❌ Would require rewriting all workflows

Why Temporal native observability is better:
- ✅ Zero code changes - Temporal captures everything automatically
- ✅ No performance overhead during execution
- ✅ Built-in retries, error handling, state management
- ✅ Can reprocess history retroactively (stored in Temporal)
- ✅ OpenTelemetry compatible (industry standard)

Architecture:
1. Restack workflows execute normally (Temporal records all events)
2. On completion, export workflow history to ClickHouse
3. Store in OpenTelemetry/OpenAI Agents compatible schema
4. Fast analytics queries on ClickHouse (not Temporal API)

References:
- Temporal observability: https://docs.temporal.io/visibility
- OpenAI Agents tracing: https://openai.github.io/openai-agents-python/ref/tracing/
- OpenTelemetry spans: https://opentelemetry.io/docs/concepts/signals/traces/
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from restack_ai.function import function, log


@dataclass
class TemporalSpan:
    """Extracted span from Temporal workflow history."""
    
    # Temporal IDs
    workflow_id: str
    run_id: str
    event_id: int
    
    # Span data
    span_type: str  # 'workflow', 'activity', 'signal'
    span_name: str
    
    # Performance
    started_at: datetime
    completed_at: Optional[datetime]
    duration_ms: int
    status: str  # 'running', 'completed', 'failed', 'cancelled'
    
    # Context
    input_data: Optional[dict]
    output_data: Optional[dict]
    error_message: Optional[str]
    
    # Business IDs (from workflow input)
    task_id: Optional[UUID]
    agent_id: Optional[UUID]
    workspace_id: Optional[UUID]
    
    # Hierarchy
    parent_event_id: Optional[int]


@function.defn()
async def export_workflow_history_to_clickhouse(
    input_data: dict,
) -> dict:
    """Export Temporal workflow history to ClickHouse.
    
    Called after workflow completion to store execution trace.
    
    Args:
        workflow_id: Temporal workflow ID
        run_id: Temporal run ID
        
    Returns:
        {"success": bool, "spans_exported": int}
    """
    workflow_id = input_data.get("workflow_id")
    run_id = input_data.get("run_id")
    
    log.info(f"Exporting workflow history: {workflow_id} / {run_id}")
    
    try:
        # Get workflow history from Temporal
        # TODO: Use Restack client to fetch history
        # from src.client import client
        # history = await client.get_workflow_history(workflow_id, run_id)
        
        # For now, mock the structure
        # Real implementation will parse Temporal history events:
        # - WorkflowExecutionStarted
        # - ActivityTaskScheduled/Completed
        # - WorkflowExecutionCompleted
        
        spans = _parse_temporal_history({
            "workflow_id": workflow_id,
            "run_id": run_id,
            # ... full history events
        })
        
        # Write to ClickHouse
        await _write_spans_to_clickhouse(spans)
        
        log.info(f"Exported {len(spans)} spans to ClickHouse")
        return {"success": True, "spans_exported": len(spans)}
        
    except Exception as e:
        log.error(f"Failed to export workflow history: {e}")
        return {"success": False, "error": str(e)}


def _parse_temporal_history(history: dict) -> list[TemporalSpan]:
    """Parse Temporal workflow history into flattened spans.
    
    Temporal events we care about:
    - WorkflowExecutionStarted → workflow span start
    - WorkflowExecutionCompleted → workflow span end
    - ActivityTaskScheduled → activity span start
    - ActivityTaskCompleted → activity span end (with result)
    - ActivityTaskFailed → activity span error
    """
    spans = []
    
    # TODO: Parse actual Temporal history format
    # This is where we extract:
    # - LLM generation activities (with full input/output for quality eval)
    # - Tool call activities
    # - Subtask workflows
    # - Duration, tokens, cost from activity results
    
    return spans


async def _write_spans_to_clickhouse(spans: list[TemporalSpan]) -> None:
    """Batch write spans to ClickHouse task_traces table."""
    from src.functions.data_ingestion import get_clickhouse_client
    
    if not spans:
        return
    
    client = get_clickhouse_client()
    
    # Map spans to ClickHouse schema
    rows = []
    for span in spans:
        row = [
            span.workflow_id,  # trace_id (workflow = trace)
            f"{span.workflow_id}-{span.event_id}",  # span_id
            f"{span.workflow_id}-{span.parent_event_id}" if span.parent_event_id else None,
            str(span.task_id) if span.task_id else None,
            str(span.agent_id) if span.agent_id else None,
            None,  # agent_name (extract from input)
            str(span.workspace_id) if span.workspace_id else None,
            "v1",  # agent_version
            span.span_type,
            span.span_name,
            span.duration_ms,
            span.status,
            None,  # model_name (extract if generation span)
            None,  # input_tokens
            None,  # output_tokens
            None,  # cost_usd
            str(span.input_data) if span.input_data else "",
            str(span.output_data) if span.output_data else "",
            {},  # metadata JSON
            span.error_message,
            None,  # error_type
            span.started_at,
            span.completed_at,
        ]
        rows.append(row)
    
    column_names = [
        "trace_id",
        "span_id",
        "parent_span_id",
        "task_id",
        "agent_id",
        "agent_name",
        "workspace_id",
        "agent_version",
        "span_type",
        "span_name",
        "duration_ms",
        "status",
        "model_name",
        "input_tokens",
        "output_tokens",
        "cost_usd",
        "input",
        "output",
        "metadata",
        "error_message",
        "error_type",
        "started_at",
        "ended_at",
    ]
    
    client.insert("task_traces", rows, column_names=column_names)
    log.info(f"Wrote {len(rows)} spans to ClickHouse")


# ================================================================
# Alternative: Real-time export via Temporal interceptors
# ================================================================

# Instead of post-completion export, we could use Temporal interceptors
# to stream events to ClickHouse as they happen:
#
# class ClickHouseExportInterceptor:
#     async def intercept_activity(self, next_fn, input):
#         start = time.time()
#         try:
#             result = await next_fn(input)
#             # Export to ClickHouse in background
#             asyncio.create_task(export_activity_span({
#                 "activity_name": input.activity_name,
#                 "input": input.args,
#                 "output": result,
#                 "duration_ms": (time.time() - start) * 1000,
#                 "status": "completed"
#             }))
#             return result
#         except Exception as e:
#             # Export error span
#             asyncio.create_task(export_activity_span({
#                 "activity_name": input.activity_name,
#                 "error": str(e),
#                 "status": "failed"
#             }))
#             raise
#
# This gives real-time observability but adds overhead during execution.


# ================================================================
# Retroactive Quality Evaluation Query
# ================================================================

@function.defn()
async def get_unevaluated_traces(
    input_data: dict,
) -> list[dict]:
    """Get traces that haven't been evaluated with a specific metric.
    
    Used for retroactive evaluation when new metrics are added.
    
    Args:
        workspace_id: Filter by workspace
        metric_definition_id: The new metric to evaluate
        span_type: 'generation' for LLM outputs
        limit: Max traces to return
        
    Returns:
        List of {trace_id, span_id, input, output} for evaluation
    """
    from src.functions.data_ingestion import get_clickhouse_client
    
    workspace_id = input_data.get("workspace_id")
    metric_definition_id = input_data.get("metric_definition_id")
    span_type = input_data.get("span_type", "generation")
    limit = input_data.get("limit", 1000)
    
    client = get_clickhouse_client()
    
    # Find spans not yet evaluated with this metric
    query = """
        SELECT 
            trace_id,
            span_id,
            task_id,
            input,
            output,
            started_at
        FROM task_traces
        WHERE workspace_id = {workspace_id:UUID}
          AND span_type = {span_type:String}
          AND status = 'ok'
          AND span_id NOT IN (
            SELECT span_id 
            FROM metric_evaluations 
            WHERE metric_definition_id = {metric_id:UUID}
          )
        ORDER BY started_at DESC
        LIMIT {limit:UInt32}
    """
    
    result = client.query(
        query,
        parameters={
            "workspace_id": workspace_id,
            "span_type": span_type,
            "metric_id": metric_definition_id,
            "limit": limit,
        },
    )
    
    traces = []
    for row in result.named_results():
        traces.append({
            "trace_id": row["trace_id"],
            "span_id": row["span_id"],
            "task_id": row["task_id"],
            "input": row["input"],
            "output": row["output"],
            "started_at": row["started_at"],
        })
    
    log.info(f"Found {len(traces)} unevaluated traces for metric {metric_definition_id}")
    return traces


# ================================================================
# Integration Points
# ================================================================

"""
Where to call export_workflow_history_to_clickhouse:

1. In AgentTask.run() - after task completion:
   
   async def run(self, task: Task):
       try:
           result = await self._execute_task()
           # Export trace to ClickHouse
           await workflow.execute_activity(
               export_workflow_history_to_clickhouse,
               {"workflow_id": workflow.info().workflow_id, "run_id": workflow.info().run_id},
               start_to_close_timeout=timedelta(seconds=30),
           )
           return result
       except Exception as e:
           # Export even on failure
           await workflow.execute_activity(export_workflow_history_to_clickhouse, ...)
           raise

2. Or use a separate "cleanup" workflow that runs after task completion:
   
   await client.start_workflow(
       ExportTraceWorkflow.run,
       {"workflow_id": task_workflow_id, "run_id": task_run_id},
       id=f"export-{task_id}",
   )

3. Or use Temporal's completion hooks / signals:
   
   @workflow.signal
   async def on_workflow_completed():
       await export_workflow_history_to_clickhouse(...)
"""

