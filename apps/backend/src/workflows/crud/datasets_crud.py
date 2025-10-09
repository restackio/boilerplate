from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.datasets_crud import (
        DatasetCreateInput,
        DatasetGetByIdInput,
        DatasetGetByWorkspaceInput,
        DatasetListOutput,
        DatasetSingleOutput,
        QueryDatasetEventsInput,
        QueryDatasetEventsOutput,
        datasets_create,
        datasets_get_by_id,
        datasets_read,
        query_dataset_events,
    )


@workflow.defn()
class DatasetsReadWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetGetByWorkspaceInput
    ) -> DatasetListOutput:
        log.info("DatasetsReadWorkflow started")
        log.info(f"DatasetsReadWorkflow input: {function_input}")
        try:
            result = await workflow.step(
                function=datasets_read,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            log.info(f"DatasetsReadWorkflow result: {result}")
            return result
        except Exception as e:
            error_message = f"Error during datasets_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class DatasetsGetByIdWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetGetByIdInput
    ) -> DatasetSingleOutput:
        log.info("DatasetsGetByIdWorkflow started")
        log.info(
            f"DatasetsGetByIdWorkflow input: {function_input}"
        )
        try:
            result = await workflow.step(
                function=datasets_get_by_id,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            log.info(f"DatasetsGetByIdWorkflow result: {result}")
            return result
        except Exception as e:
            error_message = (
                f"Error during datasets_get_by_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class DatasetsCreateWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetCreateInput
    ) -> DatasetSingleOutput:
        log.info("DatasetsCreateWorkflow started")
        log.info(
            f"DatasetsCreateWorkflow input: {function_input}"
        )
        try:
            result = await workflow.step(
                function=datasets_create,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            log.info(f"DatasetsCreateWorkflow result: {result}")
            return result
        except Exception as e:
            error_message = f"Error during datasets_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class QueryDatasetEventsWorkflow:
    @workflow.run
    async def run(
        self, function_input: QueryDatasetEventsInput
    ) -> QueryDatasetEventsOutput:
        log.info("QueryDatasetEventsWorkflow started")
        log.info(
            f"QueryDatasetEventsWorkflow input: {function_input}"
        )

        try:
            step_result = await workflow.step(
                function=query_dataset_events,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=60),
            )

            log.info(
                "QueryDatasetEventsWorkflow completed successfully"
            )
            # Return the step result directly
            return step_result
        except Exception as e:
            error_message = (
                f"Error during query_dataset_events: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
