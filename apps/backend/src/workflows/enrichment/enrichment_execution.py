"""Enrichment execution workflow - creates tasks with pipeline agents to enrich context rows."""

import json
from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    uuid,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.agents_crud import (
        AgentResolveInput,
        agents_resolve_by_name,
    )
    from src.functions.context_rows_crud import (
        ContextRowsReadInput,
        context_rows_read,
    )
    from src.functions.datasets_crud import (
        DatasetGetByIdInput,
        datasets_get_by_id,
    )
    from src.functions.tasks_crud import (
        TaskCreateInput,
        tasks_create,
    )


class EnrichContextSpecInput(BaseModel):
    """Input for enriching a dataset with a pipeline agent."""

    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    column_name: str = Field(..., min_length=1, description="Name of the column to add with enrichment results")
    source_columns: list[str] = Field(default_factory=list, description="List of source column names to include in the task (empty means all columns)")
    user_prompt: str = Field(..., min_length=1, description="User prompt describing what to extract/transform (e.g., 'take the column LinkedIn Contact Profile URL' or 'check linkedin_profile_json and analyse if profile is relevant for AI')")
    limit: int | None = Field(default=None, description="Maximum number of rows to enrich. If not specified, all rows will be enriched.")
    enrich_only_missing: bool = Field(default=False, description="If True, skip rows that already have data in the target column")
    run_id: str | None = None  # Auto-generate if not provided


class EnrichContextSpecOutput(BaseModel):
    """Output from enrichment execution."""

    success: bool
    started: bool
    run_id: str
    tasks_created: int
    error: str | None = None


@workflow.defn()
class EnrichContextSpecWorkflow:
    """Workflow to enrich context rows using a pipeline agent.

    This workflow:
    1. Queries context rows from pipeline_events (event_name='context_row')
    2. Creates a task for each row with the specified pipeline agent
    3. The agent executes with row data and writes results back via LoadIntoDataset
    4. Results are stored in pipeline_events with event_name='enrichment_result'

    The agent should be configured to:
    - Accept row data in task description
    - Use LoadIntoDataset tool to write enrichment results
    - Write results with event_name='enrichment_result' and raw_data containing {row_id, run_id, result}
    """

    @workflow.run
    async def run(
        self, workflow_input: EnrichContextSpecInput
    ) -> EnrichContextSpecOutput:
        log.info("EnrichContextSpecWorkflow started")
        try:
            # Generate run_id if not provided using Temporal's deterministic UUID
            run_id = workflow_input.run_id or str(uuid())

            # Get dataset name (needed for LoadIntoDataset)
            dataset_result = await workflow.step(
                function=datasets_get_by_id,
                function_input=DatasetGetByIdInput(
                    dataset_id=workflow_input.dataset_id,
                    workspace_id=workflow_input.workspace_id,
                ),
                start_to_close_timeout=timedelta(seconds=10),
                task_queue=TASK_QUEUE,
            )

            if not dataset_result.dataset:
                raise NonRetryableError(
                    message=f"Dataset not found: {workflow_input.dataset_id}"
                )

            dataset_name = dataset_result.dataset.name

            # Query context rows - use limit if provided, otherwise use large limit for all rows
            rows_limit = workflow_input.limit if workflow_input.limit is not None else 1000000
            log.info(
                f"Reading context rows with limit={rows_limit} "
                f"({'limited' if workflow_input.limit else 'all rows'})"
            )
            
            rows_result = await workflow.step(
                function=context_rows_read,
                function_input=ContextRowsReadInput(
                    workspace_id=workflow_input.workspace_id,
                    dataset_id=workflow_input.dataset_id,
                    limit=rows_limit,
                    offset=0,
                ),
                start_to_close_timeout=timedelta(seconds=30),
                task_queue=TASK_QUEUE,
            )

            if not rows_result.success:
                raise NonRetryableError(
                    message=f"Failed to read context rows: {rows_result.error}"
                )

            rows = rows_result.rows
            tasks_created = 0
            skipped_count = 0

            # Filter rows if enrich_only_missing is enabled
            if workflow_input.enrich_only_missing:
                original_count = len(rows)
                rows = [
                    row for row in rows
                    if workflow_input.column_name not in row.get("row_data", {})
                    or row.get("row_data", {}).get(workflow_input.column_name) is None
                    or row.get("row_data", {}).get(workflow_input.column_name) == ""
                ]
                skipped_count = original_count - len(rows)
                log.info(
                    f"Filtered rows: {skipped_count} skipped (already have {workflow_input.column_name}), "
                    f"{len(rows)} remaining to enrich"
                )

            # Create a task for each row
            for row in rows:
                try:
                    # Filter row data to only include selected source columns
                    row_data = row["row_data"]
                    if workflow_input.source_columns:
                        filtered_row_data = {
                            col: row_data.get(col)
                            for col in workflow_input.source_columns
                            if col in row_data
                        }
                        # If filtered result is empty but source_columns were specified,
                        # fall back to all row_data (selected columns don't exist)
                        if not filtered_row_data and workflow_input.source_columns:
                            log.warning(
                                f"Selected source columns {workflow_input.source_columns} not found in row data. "
                                f"Using all row data instead."
                            )
                            filtered_row_data = row_data
                    else:
                        filtered_row_data = row_data
                    
                    row_data_json = json.dumps(filtered_row_data, indent=2)
                    
                    # Build task description with filtered row data, column name, and user prompt
                    task_description = f"""Row ID: {row['id']}
Run ID: {run_id}
Dataset Name: {dataset_name}
Column Name: {workflow_input.column_name}
Workspace ID: {workflow_input.workspace_id}

User Prompt: {workflow_input.user_prompt}

Row Data (selected columns):
{row_data_json}

Instructions:
- Follow your system instructions to process the data based on the user prompt above
- Extract or transform data as specified in the user prompt
- Use the updatedataset tool to add the result as a new column:
  - row_id: "{row['id']}"
  - column_name: "{workflow_input.column_name}"
  - value: <your_result>
  - dataset_name: "{dataset_name}"
  - workspace_id: "{workflow_input.workspace_id}" (or get from meta_info.workspace_id)
  - run_id: "{run_id}" (optional)
  
The result will be added as a column named "{workflow_input.column_name}" to this row.
"""

                    # Create task with pipeline agent

                    task_result = await workflow.child_execute(
                        workflow="TasksCreateWorkflow",
                        workflow_id=f"task_create_{uuid()}",
                        workflow_input=TaskCreateInput(
                            workspace_id=workflow_input.workspace_id,
                            agent_id=workflow_input.agent_id,
                            title=f"Enrich row {row['id'][:8]}",
                            description=task_description,
                            status="in_progress",
                        ),
                        task_queue=TASK_QUEUE,
                    )

                    if task_result.task:
                        tasks_created += 1

                except Exception as e:
                    log.error(
                        f"Error creating task for row {row.get('id')}: {e}"
                    )
                    # Continue with next row

            log.info(
                f"Enrichment completed: {tasks_created} tasks created, "
                f"{skipped_count} rows skipped (if enrich_only_missing was enabled)"
            )
            
            return EnrichContextSpecOutput(
                success=True,
                started=True,
                run_id=run_id,
                tasks_created=tasks_created,
            )

        except Exception as e:
            error_message = f"Error during enrichment execution: {e}"
            log.error(error_message)
            return EnrichContextSpecOutput(
                success=False,
                started=False,
                run_id=workflow_input.run_id or "",
                tasks_created=0,
                error=error_message,
            )
