"""High-scale ClickHouse TracingProcessor for OpenAI Agents tracing.

Production-ready processor with:
- Async batching for high throughput
- Thread-safe buffer management
- Automatic flush on shutdown
- Error handling that never breaks workflows

Architecture:
1. Manual OpenAI Agents spans in workflows
2. ClickHouse processor receives spans (async, non-blocking)
3. Batch writes to ClickHouse (configurable batch size)
4. Background flush thread for time-based batching

This gives us:
- ✅ OpenAI Agents standard format
- ✅ High-scale parallel processing
- ✅ Zero workflow performance impact
- ✅ Fast ClickHouse analytics
"""

import json
import logging
import threading
import time
from datetime import datetime
from typing import Any, TYPE_CHECKING

# Lazy imports - only load SDK when actually instantiating processor
if TYPE_CHECKING:
    from agents.tracing import Span, Trace, TracingProcessor
    from agents.tracing.span_data import (
        AgentSpanData,
        FunctionSpanData,
        GenerationSpanData,
        CustomSpanData,
    )

logger = logging.getLogger(__name__)


class ClickHouseTracingProcessor:
    """High-scale OpenAI Agents TracingProcessor for ClickHouse.
    
    Production features:
    - Thread-safe buffer management
    - Async batching (size + time based)
    - Background flush thread
    - Error handling that never breaks workflows
    - Configurable batch size and flush interval
    
    Usage:
        # In services.py
        from agents import tracing
        from src.tracing import ClickHouseTracingProcessor
        
        # Initialize once at startup
        processor = ClickHouseTracingProcessor(
            batch_size=1000,      # Flush after 1000 spans
            flush_interval_sec=5,  # Or every 5 seconds
        )
        tracing.add_trace_processor(processor)
    """
    
    def __init__(
        self, 
        batch_size: int = 1000,
        flush_interval_sec: float = 5.0,
    ):
        """Initialize high-scale processor.
        
        Args:
            batch_size: Number of spans to buffer before flushing
            flush_interval_sec: Max seconds between flushes
        """
        self._span_buffer: list[Any] = []
        self._batch_size = batch_size
        self._flush_interval_sec = flush_interval_sec
        
        # Thread safety
        self._lock = threading.Lock()
        self._shutdown_event = threading.Event()
        
        # Background flush thread
        self._flush_thread = threading.Thread(
            target=self._background_flush_loop,
            daemon=True,
        )
        self._flush_thread.start()
        
        logger.info(
            f"ClickHouse processor initialized: batch_size={batch_size}, "
            f"flush_interval={flush_interval_sec}s"
        )
    
    def on_trace_start(self, trace: Any) -> None:
        """Called when a workflow starts.
        
        We don't write anything yet - wait for spans to complete.
        """
        pass
    
    def on_trace_end(self, trace: Any) -> None:
        """Called when a workflow completes.
        
        Flush any remaining buffered spans.
        """
        self._flush_buffer()
    
    def on_span_start(self, span: Any) -> None:
        """Called when an activity starts.
        
        We don't write yet - wait for completion to get full duration/output.
        """
        pass
    
    def on_span_end(self, span: Any) -> None:
        """Called when an activity completes (thread-safe).
        
        Buffer the span and flush if batch size reached.
        """
        with self._lock:
            self._span_buffer.append(span)
            should_flush = len(self._span_buffer) >= self._batch_size
        
        if should_flush:
            self._flush_buffer()
    
    def shutdown(self) -> None:
        """Shutdown processor and flush remaining spans."""
        logger.info("Shutting down ClickHouse processor...")
        self._shutdown_event.set()
        self._flush_thread.join(timeout=10)
        self._flush_buffer()
        logger.info("ClickHouse processor shutdown complete")
    
    def force_flush(self) -> None:
        """Manually flush buffer (called by OpenAI Agents SDK)."""
        self._flush_buffer()
    
    def _background_flush_loop(self) -> None:
        """Background thread that flushes buffer periodically."""
        while not self._shutdown_event.is_set():
            time.sleep(self._flush_interval_sec)
            self._flush_buffer()
    
    def _flush_buffer(self) -> None:
        """Write buffered spans to ClickHouse (thread-safe)."""
        # Atomically swap buffer
        with self._lock:
            if not self._span_buffer:
                return
            spans_to_flush = self._span_buffer[:]
            self._span_buffer.clear()
        
        try:
            # Import here to avoid circular dependencies
            from src.functions.data_ingestion import get_clickhouse_client
            
            client = get_clickhouse_client()
            
            # Convert spans to ClickHouse rows
            rows = []
            for span in spans_to_flush:
                row = self._span_to_clickhouse_row(span)
                if row:
                    rows.append(row)
            
            if rows:
                # Batch insert to ClickHouse
                client.insert(
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
                
                logger.info(f"Flushed {len(rows)} spans to ClickHouse")
            
        except Exception as e:
            logger.error(f"Error flushing spans to ClickHouse: {e}")
            # Don't raise - tracing should NEVER break workflow execution
    
    def _span_to_clickhouse_row(self, span: Any) -> list[Any] | None:
        """Convert OpenAI Agents Span to ClickHouse row format.
        
        Maps OpenAI Agents span schema to our ClickHouse task_traces table.
        Uses proper SDK types for type-safe extraction.
        """
        # Runtime import of SDK types
        try:
            from agents.tracing.span_data import (
                GenerationSpanData,
                FunctionSpanData,
                AgentSpanData,
                CustomSpanData,
            )
        except ImportError:
            logger.warning("OpenAI Agents SDK not available, skipping span")
            return None
        
        if span.ended_at is None:
            # Skip incomplete spans
            return None
        
        # Parse ISO timestamps to datetime for duration calculation
        started_at = datetime.fromisoformat(span.started_at.replace('Z', '+00:00')) if span.started_at else None
        ended_at = datetime.fromisoformat(span.ended_at.replace('Z', '+00:00')) if span.ended_at else None
        
        # Calculate duration
        duration_ms = 0
        if started_at and ended_at:
            duration_ms = int((ended_at - started_at).total_seconds() * 1000)
        
        # Extract span type-specific data using SDK types
        span_data = span.span_data
        span_type = span_data.type  # All SpanData subclasses have .type property
        
        # Initialize fields
        model_name = None
        input_tokens = None
        output_tokens = None
        cost_usd = None
        input_text = ""
        output_text = ""
        metadata = {}
        span_name = "unknown"
        
        # Extract data based on span type (using proper SDK types)
        if isinstance(span_data, GenerationSpanData):
            # LLM generation span - CRITICAL for quality evaluation
            model_name = span_data.model
            
            # Extract full input/output for retroactive quality evaluation
            if span_data.input:
                # Serialize messages (Sequence[Mapping[str, Any]])
                input_text = json.dumps(list(span_data.input))
            
            if span_data.output:
                # Serialize response messages
                output_text = json.dumps(list(span_data.output))
            
            # Extract usage data (proper SDK field)
            if span_data.usage:
                input_tokens = span_data.usage.get("prompt_tokens") or span_data.usage.get("input_tokens")
                output_tokens = span_data.usage.get("completion_tokens") or span_data.usage.get("output_tokens")
                cost_usd = span_data.usage.get("cost_usd")
                
                # If cost not provided, calculate it (GPT-4o pricing)
                if cost_usd is None and input_tokens and output_tokens:
                    cost_usd = (input_tokens * 0.0025 / 1000) + (output_tokens * 0.01 / 1000)
            
            # Store model config in metadata
            if span_data.model_config:
                metadata['model_config'] = dict(span_data.model_config)
            
            span_name = f"generation:{model_name or 'unknown'}"
        
        elif isinstance(span_data, FunctionSpanData):
            # Tool call span (proper SDK type)
            span_name = span_data.name
            metadata['function_name'] = span_data.name
            
            if span_data.input:
                input_text = span_data.input
            
            if span_data.output:
                output_text = str(span_data.output)
            
            # MCP-specific data
            if span_data.mcp_data:
                metadata['mcp_data'] = span_data.mcp_data
        
        elif isinstance(span_data, AgentSpanData):
            # Agent execution (proper SDK type)
            span_name = span_data.name
            metadata['agent_name'] = span_data.name
            
            if span_data.handoffs:
                metadata['handoffs'] = span_data.handoffs
            if span_data.tools:
                metadata['tools'] = span_data.tools
            if span_data.output_type:
                metadata['output_type'] = span_data.output_type
        
        elif isinstance(span_data, CustomSpanData):
            # Custom span (proper SDK type)
            span_name = span_data.name
            if span_data.data:
                metadata.update(span_data.data)
        
        else:
            # Other span types (GuardrailSpanData, HandoffSpanData, etc.)
            span_name = getattr(span_data, 'name', span_type)
        
        # Extract business IDs from trace metadata
        # These are set on the trace when it's created
        task_id = None
        agent_id = None
        workspace_id = None
        agent_version = "v1"
        
        # Get current trace to access its metadata
        try:
            from agents.tracing import get_current_trace
            current_trace = get_current_trace()
            if current_trace and hasattr(current_trace, 'metadata') and current_trace.metadata:
                task_id = current_trace.metadata.get('task_id')
                agent_id = current_trace.metadata.get('agent_id')
                workspace_id = current_trace.metadata.get('workspace_id')
                agent_version = current_trace.metadata.get('agent_version', 'v1')
        except Exception:
            pass
        
        # Status mapping
        status = "ok" if span.error is None else "error"
        error_message = span.error.get("message") if span.error else None
        error_type = None
        if span.error and span.error.get("data"):
            error_type = span.error["data"].get("type")
        
        return [
            str(span.trace_id),
            str(span.span_id),
            str(span.parent_id) if span.parent_id else None,
            task_id,
            agent_id,
            None,  # agent_name (could extract from metadata)
            workspace_id,
            agent_version,
            span_type,
            span_name,
            duration_ms,
            status,
            model_name,
            input_tokens,
            output_tokens,
            cost_usd,
            input_text,
            output_text,
            json.dumps(metadata) if metadata else "{}",
            error_message,
            error_type,
            span.started_at,  # Keep as ISO string
            span.ended_at,    # Keep as ISO string
        ]


class ConsoleTracingProcessor:
    """Simple console logger for development/debugging."""
    
    def on_trace_start(self, trace: Any) -> None:
        print(f"[TRACE START] {trace.name} (trace_id={trace.trace_id})")
    
    def on_trace_end(self, trace: Any) -> None:
        print(f"[TRACE END] {trace.name}")
    
    def on_span_start(self, span: Any) -> None:
        span_type = span.span_data.type
        span_name = getattr(span.span_data, 'name', span_type)
        print(f"  [SPAN START] {span_type} - {span_name}")
    
    def on_span_end(self, span: Any) -> None:
        duration_ms = 0
        if span.started_at and span.ended_at:
            started = datetime.fromisoformat(span.started_at.replace('Z', '+00:00'))
            ended = datetime.fromisoformat(span.ended_at.replace('Z', '+00:00'))
            duration_ms = int((ended - started).total_seconds() * 1000)
        status = "✓" if span.error is None else "✗"
        print(f"  [SPAN END] {status} ({duration_ms}ms)")
    
    def shutdown(self) -> None:
        print("[TRACE] Console processor shutdown")
    
    def force_flush(self) -> None:
        pass

