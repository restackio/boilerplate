"""
Metrics CRUD Workflows
Workflows for managing metric definitions and agent-metric assignments
"""
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.metrics_crud import (
        assign_metric_to_agent,
        create_metric_definition,
        delete_metric_definition,
        get_agent_metrics,
        get_metric_definition,
        get_playground_metrics,
        list_metric_definitions,
        unassign_metric_from_agent,
        update_metric_definition,
    )


# Input models for workflows
class CreateMetricDefinitionInput(BaseModel):
    workspace_id: str
    name: str
    category: str
    metric_type: str
    config: dict[str, Any]
    description: str | None = None
    output_type: str = "score"
    min_value: float | None = None
    max_value: float | None = None
    is_default: bool = False
    created_by: str | None = None


class GetMetricDefinitionInput(BaseModel):
    metric_id: str


class ListMetricDefinitionsInput(BaseModel):
    workspace_id: str
    category: str | None = None
    metric_type: str | None = None
    is_active: bool = True


class UpdateMetricDefinitionInput(BaseModel):
    metric_id: str
    name: str | None = None
    description: str | None = None
    category: str | None = None
    config: dict[str, Any] | None = None
    output_type: str | None = None
    min_value: float | None = None
    max_value: float | None = None
    is_active: bool | None = None
    is_default: bool | None = None


class DeleteMetricDefinitionInput(BaseModel):
    metric_id: str


class AssignMetricToAgentInput(BaseModel):
    agent_id: str
    metric_definition_id: str
    enabled: bool = True
    run_on_completion: bool = True
    run_on_playground: bool = True
    alert_threshold: float | None = None
    alert_condition: str | None = None


class GetAgentMetricsInput(BaseModel):
    agent_id: str
    enabled_only: bool = True


class GetPlaygroundMetricsInput(BaseModel):
    agent_id: str


class UnassignMetricFromAgentInput(BaseModel):
    agent_id: str
    metric_definition_id: str


# Workflow definitions
@workflow.defn()
class CreateMetricDefinitionWorkflow:
    """Workflow to create a new metric definition"""

    @workflow.run
    async def run(self, workflow_input: CreateMetricDefinitionInput) -> dict[str, Any]:
        log.info("CreateMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=create_metric_definition,
                workspace_id=workflow_input.workspace_id,
                name=workflow_input.name,
                description=workflow_input.description,
                category=workflow_input.category,
                metric_type=workflow_input.metric_type,
                config=workflow_input.config,
                output_type=workflow_input.output_type,
                min_value=workflow_input.min_value,
                max_value=workflow_input.max_value,
                is_default=workflow_input.is_default,
                created_by=workflow_input.created_by,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during create_metric_definition: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class GetMetricDefinitionWorkflow:
    """Workflow to get a metric definition by ID"""

    @workflow.run
    async def run(self, workflow_input: GetMetricDefinitionInput) -> dict[str, Any] | None:
        log.info("GetMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=get_metric_definition,
                metric_id=workflow_input.metric_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during get_metric_definition: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ListMetricDefinitionsWorkflow:
    """Workflow to list all metric definitions for a workspace"""

    @workflow.run
    async def run(self, workflow_input: ListMetricDefinitionsInput) -> list[dict[str, Any]]:
        log.info("ListMetricDefinitionsWorkflow started")
        try:
            return await workflow.step(
                function=list_metric_definitions,
                workspace_id=workflow_input.workspace_id,
                category=workflow_input.category,
                metric_type=workflow_input.metric_type,
                is_active=workflow_input.is_active,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during list_metric_definitions: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UpdateMetricDefinitionWorkflow:
    """Workflow to update a metric definition"""

    @workflow.run
    async def run(self, workflow_input: UpdateMetricDefinitionInput) -> dict[str, Any] | None:
        log.info("UpdateMetricDefinitionWorkflow started")
        try:
            # Build kwargs from non-None values
            kwargs = {
                k: v for k, v in workflow_input.model_dump().items()
                if k != "metric_id" and v is not None
            }
            return await workflow.step(
                function=update_metric_definition,
                metric_id=workflow_input.metric_id,
                start_to_close_timeout=timedelta(seconds=30),
                **kwargs,
            )
        except Exception as e:
            error_message = f"Error during update_metric_definition: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class DeleteMetricDefinitionWorkflow:
    """Workflow to delete a metric definition"""

    @workflow.run
    async def run(self, workflow_input: DeleteMetricDefinitionInput) -> bool:
        log.info("DeleteMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=delete_metric_definition,
                metric_id=workflow_input.metric_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during delete_metric_definition: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AssignMetricToAgentWorkflow:
    """Workflow to assign a metric to an agent"""

    @workflow.run
    async def run(self, workflow_input: AssignMetricToAgentInput) -> dict[str, Any]:
        log.info("AssignMetricToAgentWorkflow started")
        try:
            return await workflow.step(
                function=assign_metric_to_agent,
                agent_id=workflow_input.agent_id,
                metric_definition_id=workflow_input.metric_definition_id,
                enabled=workflow_input.enabled,
                run_on_completion=workflow_input.run_on_completion,
                run_on_playground=workflow_input.run_on_playground,
                alert_threshold=workflow_input.alert_threshold,
                alert_condition=workflow_input.alert_condition,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during assign_metric_to_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class GetAgentMetricsWorkflow:
    """Workflow to get all metrics assigned to an agent"""

    @workflow.run
    async def run(self, workflow_input: GetAgentMetricsInput) -> list[dict[str, Any]]:
        log.info("GetAgentMetricsWorkflow started")
        try:
            return await workflow.step(
                function=get_agent_metrics,
                agent_id=workflow_input.agent_id,
                enabled_only=workflow_input.enabled_only,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during get_agent_metrics: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class GetPlaygroundMetricsWorkflow:
    """Workflow to get metrics that should be displayed in playground for an agent"""

    @workflow.run
    async def run(self, workflow_input: GetPlaygroundMetricsInput) -> list[dict[str, Any]]:
        log.info("GetPlaygroundMetricsWorkflow started")
        try:
            return await workflow.step(
                function=get_playground_metrics,
                agent_id=workflow_input.agent_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during get_playground_metrics: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UnassignMetricFromAgentWorkflow:
    """Workflow to unassign a metric from an agent"""

    @workflow.run
    async def run(self, workflow_input: UnassignMetricFromAgentInput) -> bool:
        log.info("UnassignMetricFromAgentWorkflow started")
        try:
            return await workflow.step(
                function=unassign_metric_from_agent,
                agent_id=workflow_input.agent_id,
                metric_definition_id=workflow_input.metric_definition_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during unassign_metric_from_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
