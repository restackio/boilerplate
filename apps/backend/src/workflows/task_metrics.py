"""
Task Metrics Workflow
Evaluates task performance and runs quality metrics in parallel
"""
import time
from dataclasses import dataclass
from typing import Any

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.metrics_crud import get_agent_metrics
    from src.functions.metrics_evaluation import (
        evaluate_formula_metric,
        evaluate_llm_judge_metric,
        evaluate_python_code_metric,
        ingest_performance_metrics,
        ingest_quality_metrics,
    )


@dataclass
class TaskMetricsInput:
    """Input for task metrics workflow"""
    
    task_id: str
    agent_id: str
    agent_name: str
    parent_agent_id: str | None
    workspace_id: str
    agent_version: str
    
    # Task data
    task_input: str
    task_output: str
    
    # Performance data (already captured during execution)
    duration_ms: int
    input_tokens: int
    output_tokens: int
    status: str  # completed, failed
    
    # Options
    run_quality_metrics: bool = True


@dataclass
class MetricEvaluationResult:
    """Result of a single metric evaluation"""
    
    metric_definition_id: str
    metric_name: str
    metric_type: str
    score: float
    passed: bool
    reasoning: str | None
    metadata: dict[str, Any]
    eval_duration_ms: int
    eval_cost_usd: float


@dataclass
class TaskMetricsOutput:
    """Output of task metrics workflow"""
    
    task_id: str
    performance_saved: bool
    quality_metrics_count: int
    quality_metrics_results: list[MetricEvaluationResult]
    total_duration_ms: int
    errors: list[str]


@workflow.defn()
class TaskMetricsWorkflow:
    """
    Workflow that:
    1. Saves performance metrics (speed, tokens, cost)
    2. Runs quality metrics in PARALLEL (LLM judges, code, formulas)
    3. Saves all results to ClickHouse
    """

    @workflow.run
    async def run(self, workflow_input: TaskMetricsInput) -> TaskMetricsOutput:
        log.info(f"Starting metrics evaluation for task {workflow_input.task_id}")
        
        start_time = time.time()
        errors = []
        
        # Step 1: Save performance metrics (ALWAYS)
        try:
            await workflow.step(
                ingest_performance_metrics,
                task_id=workflow_input.task_id,
                agent_id=workflow_input.agent_id,
                agent_name=workflow_input.agent_name,
                parent_agent_id=workflow_input.parent_agent_id,
                workspace_id=workflow_input.workspace_id,
                agent_version=workflow_input.agent_version,
                duration_ms=workflow_input.duration_ms,
                input_tokens=workflow_input.input_tokens,
                output_tokens=workflow_input.output_tokens,
                status=workflow_input.status,
                task_input=workflow_input.task_input,
                task_output=workflow_input.task_output,
            )
            performance_saved = True
            log.info("Performance metrics saved")
        except Exception as e:
            log.error(f"Failed to save performance metrics: {e}")
            errors.append(f"Performance save error: {str(e)}")
            performance_saved = False
        
        # Step 2: Get assigned metrics
        quality_results = []
        
        if not workflow_input.run_quality_metrics:
            log.info("Skipping quality metrics")
        else:
            try:
                # Get metrics that should run on completion
                agent_metrics = await workflow.step(
                    get_agent_metrics,
                    agent_id=workflow_input.agent_id,
                    enabled_only=True,
                )
                
                # Filter to only those that run on completion
                completion_metrics = [
                    am for am in agent_metrics 
                    if am["run_on_completion"]
                ]
                
                if not completion_metrics:
                    log.info("No quality metrics configured for this agent")
                else:
                    log.info(
                        f"Running {len(completion_metrics)} quality metrics in parallel"
                    )
                    
                    # Step 3: Run all metrics in PARALLEL
                    metric_tasks = []
                    
                    for am in completion_metrics:
                        metric_def = am["metric_definition"]
                        metric_type = metric_def["metric_type"]
                        
                        # Create appropriate evaluation task based on type
                        if metric_type == "llm_judge":
                            task = workflow.step(
                                evaluate_llm_judge_metric,
                                task_id=workflow_input.task_id,
                                task_input=workflow_input.task_input,
                                task_output=workflow_input.task_output,
                                metric_definition=metric_def,
                            )
                        elif metric_type == "python_code":
                            task = workflow.step(
                                evaluate_python_code_metric,
                                task_id=workflow_input.task_id,
                                task_input=workflow_input.task_input,
                                task_output=workflow_input.task_output,
                                performance_data={
                                    "duration_ms": workflow_input.duration_ms,
                                    "input_tokens": workflow_input.input_tokens,
                                    "output_tokens": workflow_input.output_tokens,
                                    "status": workflow_input.status,
                                },
                                metric_definition=metric_def,
                            )
                        elif metric_type == "formula":
                            task = workflow.step(
                                evaluate_formula_metric,
                                task_id=workflow_input.task_id,
                                performance_data={
                                    "duration_ms": workflow_input.duration_ms,
                                    "input_tokens": workflow_input.input_tokens,
                                    "output_tokens": workflow_input.output_tokens,
                                    "status": workflow_input.status,
                                },
                                metric_definition=metric_def,
                            )
                        else:
                            log.warning(f"Unknown metric type: {metric_type}")
                            continue
                        
                        metric_tasks.append(task)
                    
                    # Wait for ALL metrics to complete (parallel execution)
                    if metric_tasks:
                        results = await workflow.wait_for_all(*metric_tasks)
                        
                        # Filter out None results (failed evaluations)
                        quality_results = [r for r in results if r is not None]
                        
                        log.info(
                            f"Completed {len(quality_results)}/{len(metric_tasks)} metric evaluations"
                        )
                        
                        # Step 4: Save quality metrics to ClickHouse
                        if quality_results:
                            try:
                                await workflow.step(
                                    ingest_quality_metrics,
                                    task_id=workflow_input.task_id,
                                    agent_id=workflow_input.agent_id,
                                    workspace_id=workflow_input.workspace_id,
                                    quality_results=[
                                        {
                                            "metric_definition_id": r["metric_definition_id"],
                                            "metric_name": r["metric_name"],
                                            "metric_type": r["metric_type"],
                                            "score": r["score"],
                                            "passed": r["passed"],
                                            "reasoning": r["reasoning"],
                                            "metadata": r["metadata"],
                                            "eval_duration_ms": r["eval_duration_ms"],
                                            "eval_cost_usd": r["eval_cost_usd"],
                                        }
                                        for r in quality_results
                                    ],
                                )
                                log.info("Quality metrics saved to ClickHouse")
                            except Exception as e:
                                log.error(f"Failed to save quality metrics: {e}")
                                errors.append(f"Quality save error: {str(e)}")
                
            except Exception as e:
                log.error(f"Quality metrics evaluation failed: {e}")
                errors.append(f"Quality evaluation error: {str(e)}")
        
        total_duration = int((time.time() - start_time) * 1000)
        
        log.info(
            f"Task metrics workflow completed in {total_duration}ms. "
            f"Performance saved: {performance_saved}, "
            f"Quality metrics: {len(quality_results)}"
        )
        
        return TaskMetricsOutput(
            task_id=workflow_input.task_id,
            performance_saved=performance_saved,
            quality_metrics_count=len(quality_results),
            quality_metrics_results=[
                MetricEvaluationResult(**r) for r in quality_results
            ],
            total_duration_ms=total_duration,
            errors=errors,
        )

