"""Workflow wrappers for context rows CRUD operations."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
    workflow_info,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.context_rows_crud import (
        ContextRowsReadInput,
        ContextRowsReadOutput,
        ContextRowsUploadCSVInput,
        ContextRowsUploadCSVOutput,
        context_rows_read,
        context_rows_upload_csv,
    )


@workflow.defn()
class ContextRowsUploadCSVWorkflow:
    """Workflow to upload CSV rows to a dataset."""

    @workflow.run
    async def run(
        self, workflow_input: ContextRowsUploadCSVInput
    ) -> ContextRowsUploadCSVOutput:
        log.info("ContextRowsUploadCSVWorkflow started")
        try:
            # Log workflow input details
            log.info(
                f"Workflow input: workspace_id={workflow_input.workspace_id}, "
                f"dataset_id={workflow_input.dataset_id}, "
                f"csv_content type={type(workflow_input.csv_content)}, "
                f"csv_content length={len(workflow_input.csv_content) if isinstance(workflow_input.csv_content, str) else 'N/A'}, "
                f"max_rows={workflow_input.max_rows} (TESTING MODE)"
            )
            
            # Estimate timeout based on max_rows or CSV size
            if workflow_input.max_rows:
                # If max_rows is specified, estimate timeout based on that
                estimated_seconds = max(60, workflow_input.max_rows // 100)  # ~1s per 100 rows, min 60s
                log.info(
                    f"Processing CSV upload (limited to first {workflow_input.max_rows} rows), "
                    f"timeout {estimated_seconds}s"
                )
            else:
                # For full processing, estimate based on CSV size
                if isinstance(workflow_input.csv_content, str):
                    csv_size_estimate = len(workflow_input.csv_content)
                    estimated_rows = csv_size_estimate // 200  # Rough estimate: ~200 chars per row
                    estimated_seconds = max(60, min(estimated_rows // 1000, 1800))  # 60s to 30min
                    log.info(
                        f"Processing CSV upload: estimated {estimated_rows} rows, "
                        f"timeout {estimated_seconds}s"
                    )
                else:
                    estimated_seconds = 1800  # 30 minutes default
                    log.warning(
                        f"Unexpected csv_content type: {type(workflow_input.csv_content)}, "
                        f"using default timeout of {estimated_seconds}s"
                    )
            
            log.info("=" * 80)
            log.info("PREPARING TO CALL FUNCTION")
            log.info("=" * 80)
            log.info(f"Function object: {context_rows_upload_csv}")
            log.info(f"Function object ID: {id(context_rows_upload_csv)}")
            log.info(f"Function type: {type(context_rows_upload_csv)}")
            log.info(f"Function name: {getattr(context_rows_upload_csv, '__name__', 'N/A')}")
            log.info(f"Function module: {getattr(context_rows_upload_csv, '__module__', 'N/A')}")
            log.info(f"Has __restack_function__ attr: {hasattr(context_rows_upload_csv, '__restack_function__')}")
            
            log.info("=" * 80)
            log.info("FUNCTION INPUT DETAILS")
            log.info("=" * 80)
            log.info(f"Input type: {type(workflow_input)}")
            log.info(f"Input class: {workflow_input.__class__.__name__}")
            log.info(f"Workspace ID: {workflow_input.workspace_id}")
            log.info(f"Dataset ID: {workflow_input.dataset_id}")
            log.info(f"CSV content type: {type(workflow_input.csv_content)}")
            log.info(f"CSV content length: {len(workflow_input.csv_content) if isinstance(workflow_input.csv_content, str) else 'N/A'}")
            log.info(f"CSV content preview (first 100 chars): {workflow_input.csv_content[:100] if isinstance(workflow_input.csv_content, str) else 'N/A'}")
            log.info(f"Max rows: {workflow_input.max_rows}")
            log.info(f"Tags: {workflow_input.tags}")
            
            log.info("=" * 80)
            log.info("WORKFLOW.STEP PARAMETERS")
            log.info("=" * 80)
            log.info(f"start_to_close_timeout: {estimated_seconds} seconds")
            log.info(f"schedule_to_start_timeout: 10 seconds")
            
            # Add schedule_to_start_timeout to detect if worker isn't picking up the task
            try:
                log.info("=" * 80)
                log.info("CALLING workflow.step NOW...")
                log.info("=" * 80)
                info = workflow_info()
                log.info(f"Workflow info - workflow_id: {info.workflow_id}, run_id: {info.run_id}")
                
                result = await workflow.step(
                    function=context_rows_upload_csv,
                    function_input=workflow_input,
                    start_to_close_timeout=timedelta(seconds=estimated_seconds),
                    schedule_to_start_timeout=timedelta(seconds=10),  # Fail fast if no worker picks it up
                    task_queue=TASK_QUEUE,  # Must match the task queue where functions are registered
                )
                
                log.info("=" * 80)
                log.info("FUNCTION CALL COMPLETED SUCCESSFULLY!")
                log.info("=" * 80)
                log.info(f"Result type: {type(result)}")
                log.info(f"Result: {result}")
                if hasattr(result, 'model_dump'):
                    log.info(f"Result dict: {result.model_dump()}")
                return result
            except Exception as step_error:
                log.error("=" * 80)
                log.error("ERROR IN workflow.step CALL")
                log.error("=" * 80)
                log.error(f"Error: {step_error}")
                log.error(f"Error type: {type(step_error)}")
                log.error(f"Error args: {step_error.args if hasattr(step_error, 'args') else 'N/A'}")
                import traceback
                traceback_str = traceback.format_exc()
                log.error(f"Traceback:\n{traceback_str}")
                # Also log each line of traceback separately for better visibility
                for line in traceback_str.split('\n'):
                    if line.strip():
                        log.error(f"TB: {line}")
                raise
        except Exception as e:
            error_message = f"Error during context_rows_upload_csv: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ContextRowsReadWorkflow:
    """Workflow to read context rows from a dataset."""

    @workflow.run
    async def run(
        self, workflow_input: ContextRowsReadInput
    ) -> ContextRowsReadOutput:
        log.info("ContextRowsReadWorkflow started")
        try:
            return await workflow.step(
                function=context_rows_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during context_rows_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e

