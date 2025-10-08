"""
Metrics CRUD Workflows
Workflows for managing metric definitions and agent-metric assignments
"""
from datetime import timedelta
from typing import Any

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


@workflow.defn()
class CreateMetricDefinitionWorkflow:
    """Workflow to create a new metric definition"""

    @workflow.run
    async def run(
        self,
        workspace_id: str,
        name: str,
        category: str,
        metric_type: str,
        config: dict[str, Any],
        description: str | None = None,
        output_type: str = "score",
        min_value: float | None = None,
        max_value: float | None = None,
        is_default: bool = False,
        created_by: str | None = None,
    ) -> dict[str, Any]:
        log.info("CreateMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=create_metric_definition,
                workspace_id=workspace_id,
                name=name,
                description=description,
                category=category,
                metric_type=metric_type,
                config=config,
                output_type=output_type,
                min_value=min_value,
                max_value=max_value,
                is_default=is_default,
                created_by=created_by,
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
    async def run(self, metric_id: str) -> dict[str, Any] | None:
        log.info("GetMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=get_metric_definition,
                metric_id=metric_id,
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
    async def run(
        self,
        workspace_id: str,
        category: str | None = None,
        metric_type: str | None = None,
        is_active: bool = True,
    ) -> list[dict[str, Any]]:
        log.info("ListMetricDefinitionsWorkflow started")
        try:
            return await workflow.step(
                function=list_metric_definitions,
                workspace_id=workspace_id,
                category=category,
                metric_type=metric_type,
                is_active=is_active,
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
    async def run(self, metric_id: str, **kwargs: Any) -> dict[str, Any] | None:
        log.info("UpdateMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=update_metric_definition,
                metric_id=metric_id,
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
    async def run(self, metric_id: str) -> bool:
        log.info("DeleteMetricDefinitionWorkflow started")
        try:
            return await workflow.step(
                function=delete_metric_definition,
                metric_id=metric_id,
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
    async def run(
        self,
        agent_id: str,
        metric_definition_id: str,
        enabled: bool = True,
        run_on_completion: bool = True,
        run_on_playground: bool = True,
        alert_threshold: float | None = None,
        alert_condition: str | None = None,
    ) -> dict[str, Any]:
        log.info("AssignMetricToAgentWorkflow started")
        try:
            return await workflow.step(
                function=assign_metric_to_agent,
                agent_id=agent_id,
                metric_definition_id=metric_definition_id,
                enabled=enabled,
                run_on_completion=run_on_completion,
                run_on_playground=run_on_playground,
                alert_threshold=alert_threshold,
                alert_condition=alert_condition,
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
    async def run(self, agent_id: str, enabled_only: bool = True) -> list[dict[str, Any]]:
        log.info("GetAgentMetricsWorkflow started")
        try:
            return await workflow.step(
                function=get_agent_metrics,
                agent_id=agent_id,
                enabled_only=enabled_only,
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
    async def run(self, agent_id: str) -> list[dict[str, Any]]:
        log.info("GetPlaygroundMetricsWorkflow started")
        try:
            return await workflow.step(
                function=get_playground_metrics,
                agent_id=agent_id,
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
    async def run(self, agent_id: str, metric_definition_id: str) -> bool:
        log.info("UnassignMetricFromAgentWorkflow started")
        try:
            return await workflow.step(
                function=unassign_metric_from_agent,
                agent_id=agent_id,
                metric_definition_id=metric_definition_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during unassign_metric_from_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e

