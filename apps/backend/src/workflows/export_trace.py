"""Workflow to export Temporal execution history to ClickHouse.

This workflow runs AFTER a task completes to export its trace for analytics.
Keeps task execution fast (no tracing overhead) while capturing full observability.
"""

from dataclasses import dataclass
from datetime import timedelta

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.temporal_trace_exporter import (
        export_workflow_history_to_clickhouse,
        get_unevaluated_traces,
    )


@dataclass
class ExportTraceInput:
    """Input for exporting a workflow trace."""
    
    workflow_id: str
    run_id: str
    task_id: str  # For linking back to PostgreSQL


@workflow.defn()
class ExportTraceWorkflow:
    """Export Temporal workflow history to ClickHouse for analytics.
    
    Runs asynchronously after task completion so it doesn't slow down the task.
    """
    
    @workflow.run
    async def run(self, workflow_input: ExportTraceInput) -> dict:
        log.info(
            f"Exporting trace for workflow {workflow_input.workflow_id}"
        )
        
        try:
            # Export workflow history to ClickHouse
            result = await workflow.step(
                function=export_workflow_history_to_clickhouse,
                function_input={
                    "workflow_id": workflow_input.workflow_id,
                    "run_id": workflow_input.run_id,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            if result.get("success"):
                log.info(
                    f"Successfully exported {result.get('spans_exported')} spans"
                )
            
            return result
            
        except Exception as e:
            error_msg = f"Failed to export trace: {e}"
            log.error(error_msg)
            return {"success": False, "error": str(e)}


@dataclass
class RetroactiveEvaluationInput:
    """Input for retroactive quality evaluation."""
    
    workspace_id: str
    metric_definition_id: str
    batch_size: int = 1000


@workflow.defn()
class RetroactiveEvaluationWorkflow:
    """Evaluate a new metric against historical traces.
    
    When a user adds a new quality metric, this workflow:
    1. Queries ClickHouse for unevaluated traces
    2. Batches them for evaluation
    3. Stores results back in ClickHouse
    
    Can be run in background without affecting live tasks.
    """
    
    @workflow.run
    async def run(
        self, workflow_input: RetroactiveEvaluationInput
    ) -> dict:
        log.info(
            f"Starting retroactive evaluation for metric {workflow_input.metric_definition_id}"
        )
        
        try:
            # Get traces that need evaluation
            traces = await workflow.step(
                function=get_unevaluated_traces,
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "metric_definition_id": workflow_input.metric_definition_id,
                    "span_type": "generation",  # Only evaluate LLM outputs
                    "limit": workflow_input.batch_size,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            if not traces:
                log.info("No unevaluated traces found")
                return {
                    "success": True,
                    "traces_evaluated": 0,
                    "message": "All traces already evaluated",
                }
            
            log.info(f"Found {len(traces)} traces to evaluate")
            
            # TODO: Batch evaluate traces
            # For now, just return count
            # In production, this would:
            # 1. Chunk traces into batches
            # 2. Call evaluation function for each batch
            # 3. Store results in metric_evaluations table
            
            return {
                "success": True,
                "traces_found": len(traces),
                "traces_evaluated": 0,  # TODO: implement
            }
            
        except Exception as e:
            error_msg = f"Retroactive evaluation failed: {e}"
            log.error(error_msg)
            return {"success": False, "error": str(e)}


# ================================================================
# Usage in AgentTask
# ================================================================

"""
How to integrate into AgentTask.run():

@workflow.defn()
class AgentTask:
    @workflow.run
    async def run(self, input: RunInput):
        workflow_id = workflow.info().workflow_id
        run_id = workflow.info().run_id
        
        try:
            # Execute task normally
            result = await self._execute_agent_loop()
            
            # After completion, export trace asynchronously
            # This doesn't block - runs in background
            await workflow.start_child_workflow(
                ExportTraceWorkflow.run,
                ExportTraceInput(
                    workflow_id=workflow_id,
                    run_id=run_id,
                    task_id=input.task_id,
                ),
                id=f"export-{input.task_id}",
            )
            
            return result
            
        except Exception as e:
            # Export trace even on failure (for debugging)
            await workflow.start_child_workflow(
                ExportTraceWorkflow.run,
                ExportTraceInput(workflow_id=workflow_id, run_id=run_id, task_id=input.task_id),
            )
            raise


# Alternative: Export via signal (more decoupled)
@workflow.defn()
class AgentTask:
    @workflow.run
    async def run(self, input: RunInput):
        result = await self._execute_agent_loop()
        
        # Send signal to export workflow
        await workflow.get_external_workflow_handle("export-service").signal(
            "export_trace",
            {"workflow_id": workflow.info().workflow_id, "run_id": workflow.info().run_id},
        )
        
        return result
"""

