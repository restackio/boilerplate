from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.datasets_crud import (
        DatasetCreateInput,
        DatasetGetByIdInput,
        DatasetGetByWorkspaceInput,
        DatasetListOutput,
        DatasetSingleOutput,
        DatasetUpdateViewsInput,
        DatasetViewsOutput,
        QueryDatasetEventsInput,
        QueryDatasetEventsOutput,
        datasets_create,
        datasets_get_by_id,
        datasets_read,
        datasets_update_views,
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
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsReadWorkflow result: {result}")
        except Exception as e:
            error_message = f"Error during datasets_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


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
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsGetByIdWorkflow result: {result}")
        except Exception as e:
            error_message = (
                f"Error during datasets_get_by_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


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
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsCreateWorkflow result: {result}")
        except Exception as e:
            error_message = f"Error during datasets_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


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
                task_queue=TASK_QUEUE,
            )

            log.info(
                "QueryDatasetEventsWorkflow completed successfully"
            )
            # Return the step result directly
        except Exception as e:
            error_message = (
                f"Error during query_dataset_events: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return step_result


@workflow.defn()
class DatasetsUpdateViewsWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetUpdateViewsInput
    ) -> DatasetViewsOutput:
        log.info("DatasetsUpdateViewsWorkflow started")
        log.info(
            f"DatasetsUpdateViewsWorkflow input: {function_input}"
        )
        try:
            result = await workflow.step(
                function=datasets_update_views,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsUpdateViewsWorkflow result: {result}")
        except Exception as e:
            error_message = f"Error during datasets_update_views: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result
