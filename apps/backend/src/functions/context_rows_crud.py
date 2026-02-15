"""Context rows CRUD - CSV upload and querying for datasets."""

import csv
import io
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function, function_info, heartbeat, log

from src.database.connection import get_clickhouse_async_client
from src.functions.data_ingestion import (
    PipelineEventInput,
    ingest_pipeline_events,
)


class ContextRowsUploadCSVInput(BaseModel):
    """Input for uploading CSV rows to a dataset.
    
    The csv_content field will contain the actual CSV data. For large files,
    Temporal's large payload codec automatically handles S3 storage/retrieval,
    so the function receives the decoded CSV content directly.
    """

    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)
    csv_content: str = Field(..., min_length=1)
    tags: list[str] | None = None  # Optional tags for all rows
    max_rows: int | None = None  # Optional limit on number of rows to process (for testing)


class ContextRowsUploadCSVOutput(BaseModel):
    """Output from CSV upload."""

    success: bool
    rows_imported: int
    error: str | None = None


class ContextRowsReadInput(BaseModel):
    """Input for reading context rows from a dataset."""

    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)
    limit: int = Field(default=100, ge=1, le=1000000)  # Increased max limit to support large enrichments
    offset: int = Field(default=0, ge=0)


class ContextRowsReadOutput(BaseModel):
    """Output from reading context rows."""

    success: bool
    rows: list[dict[str, Any]]
    total_count: int
    error: str | None = None


@function.defn()
async def context_rows_upload_csv(
    function_input: ContextRowsUploadCSVInput,
) -> ContextRowsUploadCSVOutput:
    """Upload CSV rows to a dataset as context_row events in pipeline_events.

    Uses ClickHouse's native CSV import capabilities for optimal performance with large files.
    See: https://clickhouse.com/docs/integrations/data-formats/csv-tsv
    
    For large files, uses ClickHouse's native CSV parsing via INSERT ... FORMAT CSV.
    CSV rows are stored as JSON in pipeline_events with event_name='context_row'.
    
    Note: Temporal's large payload codec automatically handles S3 storage/retrieval,
    so this function receives the decoded CSV content directly.
    """
    import sys
    
    # Use print to stderr as absolute first thing - this will show up even if log fails
    print("=" * 80, file=sys.stderr, flush=True)
    print("FUNCTION INVOKED: context_rows_upload_csv", file=sys.stderr, flush=True)
    print(f"Input type: {type(function_input)}", file=sys.stderr, flush=True)
    print("=" * 80, file=sys.stderr, flush=True)
    
    try:
        # Log immediately - first thing in the function
        log.info("=" * 80)
        log.info("FUNCTION START: context_rows_upload_csv")
        log.info("=" * 80)
        print("Log statements executed", file=sys.stderr, flush=True)
        
        # Helper function to send heartbeat
        def send_heartbeat(message: str = ""):
            """Send heartbeat to Temporal activity."""
            try:
                heartbeat(message)
            except Exception as e:
                # If heartbeat fails, just log it - don't fail the function
                log.debug(f"Heartbeat failed (non-critical): {e}")
        
        send_heartbeat("Function started")
        print("Heartbeat sent", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"ERROR in function setup: {e}", file=sys.stderr, flush=True)
        print(f"Error type: {type(e)}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise
    
    try:
        log.info("STEP 1: Starting context_rows_upload_csv function")
        send_heartbeat("STEP 1: Starting function")
        
        # Log input details for debugging
        input_log_msg = (
            f"Input received: "
            f"workspace_id={function_input.workspace_id}, "
            f"dataset_id={function_input.dataset_id}, "
            f"csv_content type={type(function_input.csv_content)}, "
            f"csv_content length={len(function_input.csv_content) if isinstance(function_input.csv_content, str) else 'N/A'}, "
            f"tags={function_input.tags}, "
            f"max_rows={function_input.max_rows}"
        )
        log.info(input_log_msg)
        send_heartbeat("Input validated")
        
        # The large payload codec should have already decoded the S3 reference
        # back to the actual CSV content, so we should receive a string
        log.info("STEP 2: Validating csv_content type")
        send_heartbeat("STEP 2: Validating CSV content")
        if not isinstance(function_input.csv_content, str):
            error_msg = f"Expected csv_content to be a string, got {type(function_input.csv_content)}"
            log.error(error_msg)
            raise NonRetryableError(error_msg)
        
        csv_content = function_input.csv_content
        step2_complete_msg = f"STEP 2 complete: csv_content validated, length={len(csv_content)}"
        log.info(step2_complete_msg)
        send_heartbeat(step2_complete_msg)
        
        # Parse CSV header to get column names (needed for JSON transformation)
        log.info("STEP 3: Parsing CSV header to get column names")
        send_heartbeat("STEP 3: Parsing CSV header")
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        fieldnames = csv_reader.fieldnames
        
        if not fieldnames:
            error_msg = "CSV file has no headers or is empty"
            log.error(error_msg)
            raise NonRetryableError(error_msg)
        
        step3_complete_msg = f"STEP 3 complete: Found {len(fieldnames)} columns: {fieldnames[:5]}..."
        log.info(step3_complete_msg)
        send_heartbeat(step3_complete_msg)
        
        # Apply max_rows limit if specified (for testing)
        max_rows = function_input.max_rows
        if max_rows:
            step4_msg = f"STEP 4: Row limit specified: Processing only first {max_rows} rows"
            log.info(step4_msg)
            send_heartbeat(step4_msg)
        
        log.info("STEP 5: Getting ClickHouse client")
        send_heartbeat("STEP 5: Getting ClickHouse client")
        client = await get_clickhouse_async_client()
        step5_complete_msg = "STEP 5 complete: ClickHouse client obtained"
        log.info(step5_complete_msg)
        send_heartbeat(step5_complete_msg)
        
        # Parse CSV and insert directly into pipeline_events
        # Build tags array
        log.info("STEP 7: Building tags array")
        send_heartbeat("STEP 7: Building tags array")
        tags_list = function_input.tags or ["csv_import"]
        send_heartbeat(f"STEP 7 complete: Tags = {tags_list}")
        
        # Parse CSV and insert directly into pipeline_events
        log.info("STEP 8: Preparing CSV data for parsing")
        send_heartbeat("STEP 8: Preparing CSV data")
        csv_lines = csv_content.split('\n')
        header_line = csv_lines[0] if csv_lines else ""
        data_lines = csv_lines[1:]  # Skip header
        
        step8_found_msg = f"STEP 8: Found {len(data_lines)} data lines (excluding header)"
        log.info(step8_found_msg)
        send_heartbeat(step8_found_msg)
        
        if max_rows:
            data_lines = data_lines[:max_rows]
            step8_limit_msg = f"STEP 8: Limited to {max_rows} rows for testing"
            log.info(step8_limit_msg)
            send_heartbeat(step8_limit_msg)
        
        # Reconstruct CSV with limited rows
        limited_csv = header_line + '\n' + '\n'.join(data_lines)
        step8_complete_msg = f"STEP 8 complete: CSV data prepared, length={len(limited_csv)}"
        log.info(step8_complete_msg)
        send_heartbeat(step8_complete_msg)
        
        # Parse CSV rows and build insert data
        log.info("STEP 9: Parsing CSV rows and building insert data")
        send_heartbeat("STEP 9: Parsing CSV rows")
        csv_reader = csv.DictReader(io.StringIO(limited_csv))
        insert_rows = []
        for row_dict in csv_reader:
            # Build JSON object from row data
            row_json = {col: row_dict.get(col, '') for col in fieldnames}
            
            # Build insert row for pipeline_events
            insert_row = {
                'id': str(uuid.uuid4()),
                'agent_id': str(uuid.uuid4()),
                'task_id': None,
                'workspace_id': str(function_input.workspace_id),
                'dataset_id': function_input.dataset_id,
                'event_name': 'context_row',
                'raw_data': json.dumps(row_json),
                'transformed_data': None,
                'tags': tags_list,
                'embedding': [],
                'event_timestamp': datetime.now(UTC),
                'ingested_at': datetime.now(UTC),
            }
            insert_rows.append(insert_row)
            
            # Send heartbeat every 100 rows during parsing
            if len(insert_rows) % 100 == 0:
                send_heartbeat(f"Parsed {len(insert_rows)} rows...")
        
        if not insert_rows:
            error_msg = "CSV file has no data rows"
            log.error(error_msg)
            raise NonRetryableError(error_msg)
        
        step9_complete_msg = f"STEP 9 complete: Parsed {len(insert_rows)} rows"
        log.info(step9_complete_msg)
        send_heartbeat(step9_complete_msg)
        log.debug(f"STEP 9: First row sample: {list(insert_rows[0].keys()) if insert_rows else 'N/A'}")
        
        # Insert directly into pipeline_events
        step10_msg = f"STEP 10: Inserting {len(insert_rows)} rows into pipeline_events"
        log.info(step10_msg)
        send_heartbeat(step10_msg)
        
        # Define column names for pipeline_events
        pipeline_columns = [
            'id', 'agent_id', 'task_id', 'workspace_id', 'dataset_id',
            'event_name', 'raw_data', 'transformed_data', 'tags',
            'embedding', 'event_timestamp', 'ingested_at'
        ]
        
        # Convert rows to list format for ClickHouse insert
        insert_data = []
        for row in insert_rows:
            insert_data.append([
                row['id'],
                row['agent_id'],
                row['task_id'],
                row['workspace_id'],
                row['dataset_id'],
                row['event_name'],
                row['raw_data'],
                row['transformed_data'],
                row['tags'],
                row['embedding'],
                row['event_timestamp'],
                row['ingested_at'],
            ])
        
        await client.insert(
            'pipeline_events',
            insert_data,
            column_names=pipeline_columns,
        )
        
        step10_complete_msg = f"STEP 10 complete: Successfully inserted {len(insert_rows)} rows"
        log.info(step10_complete_msg)
        send_heartbeat(step10_complete_msg)
        
        rows_imported = len(insert_rows)
        
        success_msg = f"SUCCESS: Imported {rows_imported} rows"
        log.info("=" * 80)
        log.info(success_msg)
        log.info("=" * 80)
        send_heartbeat(success_msg)
        
        return ContextRowsUploadCSVOutput(
            success=True,
            rows_imported=rows_imported,
        )

    except NonRetryableError:
        # Re-raise NonRetryableError as-is
        raise
    except Exception as e:
        error_msg = f"FATAL ERROR in context_rows_upload_csv: {e!s}"
        log.exception("=" * 80)
        log.exception(error_msg)
        log.exception("=" * 80)
        send_heartbeat(f"FATAL ERROR: {error_msg}")
        raise NonRetryableError(f"Failed to upload CSV: {e!s}") from e


@function.defn()
async def context_rows_read(
    function_input: ContextRowsReadInput,
) -> ContextRowsReadOutput:
    """Read context rows from a dataset.

    Queries pipeline_events for event_name='context_row' filtered by dataset_id.
    Returns rows with raw_data parsed as JSON objects.
    """
    try:
        client = await get_clickhouse_async_client()

        # Query context rows
        query = f"""
            SELECT id, raw_data, tags, ingested_at
            FROM pipeline_events
            WHERE workspace_id = '{function_input.workspace_id}'
            AND dataset_id = '{function_input.dataset_id}'
            AND event_name = 'context_row'
            ORDER BY ingested_at DESC
            LIMIT {function_input.limit} OFFSET {function_input.offset}
        """

        result = await client.query(query)

        # Get total count
        count_query = f"""
            SELECT count()
            FROM pipeline_events
            WHERE workspace_id = '{function_input.workspace_id}'
              AND dataset_id = '{function_input.dataset_id}'
              AND event_name = 'context_row'
        """
        count_result = await client.query(count_query)
        total_count = (
            count_result.result_rows[0][0]
            if count_result.result_rows
            else 0
        )

        # Parse rows
        rows = []
        for row in result.result_rows:
            row_id, raw_data_json, tags, ingested_at = row
            # Parse JSON if it's a string, otherwise use as-is
            if isinstance(raw_data_json, str):
                raw_data = json.loads(raw_data_json)
            else:
                raw_data = raw_data_json

            rows.append({
                "id": str(row_id),
                "row_data": raw_data,
                "tags": list(tags) if tags else [],
                "created_at": (
                    ingested_at.isoformat()
                    if hasattr(ingested_at, "isoformat")
                    else str(ingested_at)
                ),
            })

        return ContextRowsReadOutput(
            success=True,
            rows=rows,
            total_count=total_count,
        )

    except Exception as e:
        return ContextRowsReadOutput(
            success=False,
            rows=[],
            total_count=0,
            error=f"Failed to read context rows: {e!s}",
        )

