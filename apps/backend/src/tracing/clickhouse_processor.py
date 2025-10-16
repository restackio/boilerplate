"""ClickHouse processor - SDK native approach.

Uses SDK's .export() method for standardized span data.
Minimal transformation - let SDK do the work.
"""

import asyncio
import json
import threading
from datetime import datetime
from typing import Any

from restack_ai.function import log

from src.utils.pricing import calculate_cost


class ClickHouseTracingProcessor:
    """High-scale processor using SDK's native export()."""

    def __init__(
        self,
        batch_size: int = 1000,
        flush_interval_sec: float = 5.0,
    ) -> None:
        self._span_buffer: list[Any] = []
        self._batch_size = batch_size
        self._flush_interval_sec = flush_interval_sec
        self._lock = threading.Lock()
        self._shutdown_event = threading.Event()
        self._flush_ready = (
            threading.Event()
        )  # Signal when buffer full
        self._loop: asyncio.AbstractEventLoop | None = None
        self._flush_thread = threading.Thread(
            target=self._flush_loop, daemon=True
        )
        self._flush_thread.start()
        log.info(
            f"[Tracing] Initialized: batch={batch_size}, interval={flush_interval_sec}s"
        )

    def on_trace_start(self, trace: Any) -> None:
        pass

    def on_trace_end(self, _trace: Any) -> None:
        self._flush_buffer()

    def on_span_start(self, span: Any) -> None:
        pass

    def on_span_end(self, span: Any) -> None:
        """Non-blocking - just buffer and signal background thread."""
        with self._lock:
            self._span_buffer.append(span)
            if len(self._span_buffer) >= self._batch_size:
                self._flush_ready.set()  # Signal background thread

    def shutdown(self) -> None:
        """Gracefully shutdown the processor, flushing remaining spans."""

        # Signal shutdown and wait for background thread
        self._shutdown_event.set()
        self._flush_ready.set()  # Wake up the thread immediately
        self._flush_thread.join(timeout=10)

        # Final flush of any remaining spans
        if self._span_buffer:
            self._flush_buffer()


    def force_flush(self) -> None:
        self._flush_buffer()

    def _flush_loop(self) -> None:
        """Background thread - wakes on buffer full OR timeout."""
        # Create event loop for this thread
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        while not self._shutdown_event.is_set():
            # Wait for signal or timeout
            self._flush_ready.wait(
                timeout=self._flush_interval_sec
            )
            self._flush_ready.clear()
            # Run async flush in this thread's event loop
            try:
                self._loop.run_until_complete(
                    self._flush_buffer_async()
                )
            except Exception as e:  # noqa: BLE001
                # Catch all exceptions to prevent background thread crash
                log.error(
                    f"[Tracing] Flush error in event loop: {e}"
                )

        # Cleanup loop on shutdown
        try:
            # Cancel all pending tasks
            pending = asyncio.all_tasks(self._loop)
            for task in pending:
                task.cancel()

            # Wait for tasks to be cancelled
            if pending:
                self._loop.run_until_complete(
                    asyncio.gather(*pending, return_exceptions=True)
                )
        except Exception as e:  # noqa: BLE001
            log.error(f"[Tracing] Error cancelling tasks on shutdown: {e}")
        finally:
            self._loop.close()

    def _flush_buffer(self) -> None:
        """Synchronous flush - schedules async work if loop is available."""
        if self._loop and self._loop.is_running():
            # If event loop is running in background thread, schedule async work
            asyncio.run_coroutine_threadsafe(
                self._flush_buffer_async(), self._loop
            )
        else:
            # Fallback for synchronous calls (shutdown, force_flush)
            try:
                # Try to get existing loop first
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Loop is running in another thread, schedule the flush
                    asyncio.run_coroutine_threadsafe(
                        self._flush_buffer_async(), loop
                    )
                else:
                    # Loop exists but not running, we can use it
                    loop.run_until_complete(
                        self._flush_buffer_async()
                    )
            except RuntimeError:
                # No event loop at all, create a new one
                try:
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        new_loop.run_until_complete(
                            self._flush_buffer_async()
                        )
                    finally:
                        new_loop.close()
                        asyncio.set_event_loop(None)
                except Exception as e:  # noqa: BLE001
                    # Catch all exceptions during cleanup to avoid crashing the application
                    log.warning(
                        f"[Tracing] Failed to flush traces: {e}"
                    )

    async def _flush_buffer_async(self) -> None:
        """Async flush implementation."""
        with self._lock:
            if not self._span_buffer:
                return
            spans = self._span_buffer[:]
            self._span_buffer.clear()

        try:
            from src.database.connection import (
                get_clickhouse_async_client,
            )

            rows = [
                self._span_to_row(s)
                for s in spans
                if self._span_to_row(s)
            ]
            if rows:
                client = await get_clickhouse_async_client()
                await client.insert(
                    "task_traces",
                    rows,
                    column_names=[
                        "trace_id",
                        "span_id",
                        "parent_span_id",
                        "task_id",
                        "agent_id",
                        "agent_name",
                        "workspace_id",
                        "agent_version",
                        "temporal_agent_id",
                        "temporal_run_id",
                        "span_type",
                        "span_name",
                        "duration_ms",
                        "status",
                        "model_name",
                        "input_tokens",
                        "output_tokens",
                        "cost_usd",
                        "input",
                        "output",
                        "metadata",
                        "error_message",
                        "error_type",
                        "started_at",
                        "ended_at",
                    ],
                )
                log.info(
                    f"[Tracing] Flushed {len(rows)} spans to ClickHouse"
                )
        except (
            ValueError,
            TypeError,
            ConnectionError,
            OSError,
            AttributeError,
        ) as e:
            log.error(f"[Tracing] Async flush error: {e}")

    def _calculate_duration_ms(self, span: Any) -> int:
        """Calculate span duration in milliseconds."""
        try:
            if span.started_at and span.ended_at:
                # Handle both "Z" and "+00:00" timezone formats
                start_time = (
                    span.started_at.replace("Z", "+00:00")
                    if "Z" in span.started_at
                    else span.started_at
                )
                end_time = (
                    span.ended_at.replace("Z", "+00:00")
                    if "Z" in span.ended_at
                    else span.ended_at
                )
                s = datetime.fromisoformat(start_time)
                e = datetime.fromisoformat(end_time)
                return int((e - s).total_seconds() * 1000)
        except (
            ValueError,
            TypeError,
            AttributeError,
            KeyError,
        ) as e:
            log.debug(
                "[Tracing] Failed to parse span duration: %s", e
            )
        return 0

    def _export_span_data(self, span: Any) -> dict:
        """Export span data using SDK's export method."""
        if hasattr(span.span_data, "export"):
            result = span.span_data.export()
            return result if result is not None else {}
        return {}

    def _extract_response_data(
        self, span: Any, exported: dict
    ) -> tuple[str, str, str | None]:
        """Extract input, output, and model from response span.

        Returns:
            Tuple of (input, output, model)
        """
        inp = (
            json.dumps(exported.get("input", ""))
            if exported.get("input")
            else ""
        )
        out = (
            json.dumps(exported.get("output", ""))
            if exported.get("output")
            else ""
        )
        model = exported.get("model")

        if not hasattr(span.span_data, "response"):
            return inp, out, model

        log.info(
            f"[Tracing] Processing response span - has response: {hasattr(span.span_data, 'response')}, "
            f"response is None: {not getattr(span.span_data, 'response', None)}"
        )

        # Extract input from span_data.input
        if (
            hasattr(span.span_data, "input")
            and span.span_data.input
        ):
            inp = (
                json.dumps(span.span_data.input)
                if span.span_data.input
                else ""
            )
            log.info(
                f"[Tracing] Extracted input: {len(inp)} chars"
            )

        # Extract output and model from Response object
        if span.span_data.response:
            response = span.span_data.response
            if hasattr(response, "output") and response.output:
                output_texts = [
                    content_part.text
                    for item in response.output
                    if hasattr(item, "content") and item.content
                    for content_part in item.content
                    if hasattr(content_part, "text")
                ]
                if output_texts:
                    out = json.dumps("".join(output_texts))

            if hasattr(response, "model"):
                model = response.model

        return inp, out, model

    def _extract_usage(
        self, span: Any, span_type: str, exported: dict
    ) -> dict:
        """Extract token usage from span."""
        usage = exported.get("usage") or {}

        if (
            span_type == "response"
            and hasattr(span.span_data, "response")
            and span.span_data.response
        ):
            response = span.span_data.response
            if hasattr(response, "usage") and response.usage:
                usage = {
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

        return usage

    def _calculate_cost(
        self, usage: dict, model_name: str | None = None
    ) -> float | None:
        """Calculate cost from usage data using model-specific pricing.

        Args:
            usage: Token usage dictionary
            model_name: Model name for pricing lookup (defaults to GPT-5)

        Returns:
            Cost in USD or None if no tokens
        """
        tokens_in = usage.get("prompt_tokens", 0) or usage.get(
            "input_tokens", 0
        )
        tokens_out = usage.get(
            "completion_tokens", 0
        ) or usage.get("output_tokens", 0)
        cost = usage.get("cost_usd")

        if not cost and tokens_in and tokens_out:
            # Use centralized pricing based on actual model
            cost = calculate_cost(
                tokens_in, tokens_out, model_name
            )

        return cost

    def _extract_trace_metadata(
        self,
    ) -> tuple[
        str | None,
        str | None,
        str | None,
        str | None,
        str | None,
        str | None,
    ]:
        """Extract business IDs from trace.

        Returns:
            Tuple of (task_id, agent_id, agent_name, workspace_id, temporal_agent_id, temporal_run_id)
        """
        try:
            from agents.tracing import get_current_trace

            t = get_current_trace()
            if t and hasattr(t, "metadata") and t.metadata:
                return (
                    t.metadata.get("task_id"),
                    t.metadata.get("agent_id"),
                    t.metadata.get("agent_name"),
                    t.metadata.get("workspace_id"),
                    t.metadata.get("temporal_agent_id"),
                    t.metadata.get("temporal_run_id"),
                )
        except (
            ValueError,
            TypeError,
            AttributeError,
            KeyError,
        ) as e:
            log.debug(
                "[Tracing] Failed to extract trace metadata: %s",
                e,
            )

        return None, None, None, None, None, None

    def _span_to_row(self, span: Any) -> list[Any] | None:
        """Convert span using SDK's .export() - DRY."""
        if not span.ended_at:
            return None

        # Calculate duration
        duration_ms = self._calculate_duration_ms(span)

        # Export span data
        exported = self._export_span_data(span)
        span_type = exported.get("type", "unknown")
        name = exported.get("name", span_type)

        # Extract input, output, and model (with special handling for response spans)
        if span_type == "response":
            inp, out, model = self._extract_response_data(
                span, exported
            )
        else:
            inp = (
                json.dumps(exported.get("input", ""))
                if exported.get("input")
                else ""
            )
            out = (
                json.dumps(exported.get("output", ""))
                if exported.get("output")
                else ""
            )
            model = exported.get("model")

        # Extract usage and calculate cost
        usage = self._extract_usage(span, span_type, exported)
        tokens_in = usage.get("prompt_tokens", 0) or usage.get(
            "input_tokens", 0
        )
        tokens_out = usage.get(
            "completion_tokens", 0
        ) or usage.get("output_tokens", 0)
        cost = self._calculate_cost(usage, model)

        # Metadata - collect ALL span-specific data (excluding already-extracted fields)
        excluded_keys = {
            "type",
            "name",
            "input",
            "output",
            "model",
            "usage",
        }
        meta = {
            k: v
            for k, v in exported.items()
            if k not in excluded_keys and v is not None
        }

        # Business IDs from trace
        (
            task_id,
            agent_id,
            agent_name,
            workspace_id,
            temporal_agent_id,
            temporal_run_id,
        ) = self._extract_trace_metadata()

        # Error status
        status = "ok" if not span.error else "error"
        err_msg = (
            span.error.get("message") if span.error else None
        )
        err_type = (
            span.error.get("data", {}).get("type")
            if span.error
            else None
        )

        return [
            str(span.trace_id),
            str(span.span_id),
            str(span.parent_id) if span.parent_id else None,
            task_id,
            agent_id,
            agent_name,
            workspace_id,
            "v1",
            temporal_agent_id,
            temporal_run_id,
            span_type,
            name,
            duration_ms,
            status,
            model,
            tokens_in,
            tokens_out,
            cost,
            inp,
            out,
            json.dumps(meta) if meta else "{}",
            err_msg,
            err_type,
            span.started_at,
            span.ended_at,
        ]
