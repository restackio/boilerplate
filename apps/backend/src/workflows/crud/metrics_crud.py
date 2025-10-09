"""Metrics CRUD Workflows.

Workflows for managing metric definitions and agent-metric assignments.
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
        CreateMetricDefinitionInput,
        DeleteMetricDefinitionInput,
        ListMetricDefinitionsInput,
        UpdateMetricDefinitionInput,
        create_metric_definition,
        delete_metric_definition,
        list_metric_definitions,
        update_metric_definition,
    )


@workflow.defn()
class CreateMetricDefinitionWorkflow:
    """Workflow to create a new metric definition."""

    @workflow.run
    async def run(
        self, workflow_input: CreateMetricDefinitionInput
    ) -> dict[str, Any]:
        log.info("CreateMetricDefinitionWorkflow started")

        try:
            return await workflow.step(
                function=create_metric_definition,
                function_input=workflow_input.model_dump(),
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error creating metric definition: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ListMetricDefinitionsWorkflow:
    """Workflow to list all metric definitions for a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: ListMetricDefinitionsInput
    ) -> list[dict[str, Any]]:
        log.info("ListMetricDefinitionsWorkflow started")

        try:
            return await workflow.step(
                function=list_metric_definitions,
                function_input=workflow_input.model_dump(),
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error listing metric definitions: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UpdateMetricDefinitionWorkflow:
    """Workflow to update a metric definition."""

    @workflow.run
    async def run(
        self, workflow_input: UpdateMetricDefinitionInput
    ) -> dict[str, Any] | None:
        log.info("UpdateMetricDefinitionWorkflow started")

        try:
            return await workflow.step(
                function=update_metric_definition,
                function_input=workflow_input.model_dump(),
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error updating metric definition: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class DeleteMetricDefinitionWorkflow:
    """Workflow to delete a metric definition."""

    @workflow.run
    async def run(
        self, workflow_input: DeleteMetricDefinitionInput
    ) -> bool:
        log.info("DeleteMetricDefinitionWorkflow started")

        try:
            return await workflow.step(
                function=delete_metric_definition,
                function_input=workflow_input.model_dump(),
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error deleting metric definition: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
