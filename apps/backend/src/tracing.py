"""Tracing system for agent execution (inspired by OpenAI Agents SDK).

Reference: https://openai.github.io/openai-agents-python/ref/tracing/

Architecture:
- Spans = units of work (generation, tool call, evaluation)
- Traces = collection of spans (one task execution)
- Processors = pluggable backends (ClickHouse, OpenTelemetry, console)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4


# ================================================================
# Span Data Types (typed, like OpenAI Agents)
# ================================================================


@dataclass
class SpanData:
    """Base class for span-specific data."""

    span_type: str
    
    def to_dict(self) -> dict[str, Any]:
        """Export span data as dict for storage."""
        return {"span_type": self.span_type}


@dataclass
class GenerationSpanData(SpanData):
    """LLM generation span (ChatCompletion call)."""
    
    span_type: str = "generation"
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    input: str = ""  # User message / prompt
    output: str = ""  # Assistant response
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "span_type": self.span_type,
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cost_usd": self.cost_usd,
            "input": self.input,
            "output": self.output,
        }


@dataclass
class FunctionSpanData(SpanData):
    """Tool/function call span."""
    
    span_type: str = "function"
    function_name: str = ""
    arguments: dict[str, Any] = field(default_factory=dict)
    result: Any = None
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "span_type": self.span_type,
            "function_name": self.function_name,
            "arguments": self.arguments,
            "result": str(self.result) if self.result else None,
        }


@dataclass
class GuardrailSpanData(SpanData):
    """Quality evaluation span."""
    
    span_type: str = "guardrail"
    metric_name: str = ""
    metric_type: str = ""  # llm_judge, python_code, formula
    passed: bool = False
    score: Optional[float] = None
    reasoning: Optional[str] = None
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "span_type": self.span_type,
            "metric_name": self.metric_name,
            "metric_type": self.metric_type,
            "passed": self.passed,
            "score": self.score,
            "reasoning": self.reasoning,
        }


@dataclass
class AgentSpanData(SpanData):
    """Agent execution span (top-level)."""
    
    span_type: str = "agent"
    agent_name: str = ""
    agent_version: str = "v1"
    task_input: str = ""
    task_output: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "span_type": self.span_type,
            "agent_name": self.agent_name,
            "agent_version": self.agent_version,
            "task_input": self.task_input,
            "task_output": self.task_output,
        }


# ================================================================
# Span & Trace
# ================================================================


@dataclass
class Span:
    """A unit of work in the trace (like OpenTelemetry span)."""
    
    trace_id: UUID
    span_id: UUID
    parent_span_id: Optional[UUID]
    span_name: str
    span_data: SpanData
    
    # Runtime state
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str = "ok"  # 'ok', 'error', 'cancelled'
    error: Optional[Exception] = None
    
    # Business context
    task_id: Optional[UUID] = None
    agent_id: Optional[UUID] = None
    workspace_id: Optional[UUID] = None
    
    def duration_ms(self) -> int:
        """Calculate span duration in milliseconds."""
        if self.ended_at is None:
            return 0
        return int((self.ended_at - self.started_at).total_seconds() * 1000)
    
    def to_dict(self) -> dict[str, Any]:
        """Export span for storage."""
        return {
            "trace_id": str(self.trace_id),
            "span_id": str(self.span_id),
            "parent_span_id": str(self.parent_span_id) if self.parent_span_id else None,
            "span_name": self.span_name,
            "span_type": self.span_data.span_type,
            "task_id": str(self.task_id) if self.task_id else None,
            "agent_id": str(self.agent_id) if self.agent_id else None,
            "workspace_id": str(self.workspace_id) if self.workspace_id else None,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_ms": self.duration_ms(),
            "status": self.status,
            "error_message": str(self.error) if self.error else None,
            **self.span_data.to_dict(),
        }


@dataclass
class Trace:
    """A collection of related spans (one task execution)."""
    
    trace_id: UUID
    name: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    spans: list[Span] = field(default_factory=list)
    
    def add_span(self, span: Span) -> None:
        """Add a span to this trace."""
        self.spans.append(span)
    
    def to_dict(self) -> dict[str, Any]:
        """Export trace with all spans."""
        return {
            "trace_id": str(self.trace_id),
            "name": self.name,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "spans": [span.to_dict() for span in self.spans],
        }


# ================================================================
# Tracing Processor Interface (like OpenAI Agents)
# ================================================================


class TracingProcessor(ABC):
    """Abstract interface for processing traces and spans.
    
    Implementations can write to:
    - ClickHouse (production telemetry)
    - OpenTelemetry (Datadog, Honeycomb, etc.)
    - Console (development debugging)
    - File (testing)
    """
    
    @abstractmethod
    def on_trace_start(self, trace: Trace) -> None:
        """Called when a trace starts."""
        pass
    
    @abstractmethod
    def on_trace_end(self, trace: Trace) -> None:
        """Called when a trace completes."""
        pass
    
    @abstractmethod
    def on_span_start(self, span: Span) -> None:
        """Called when a span starts."""
        pass
    
    @abstractmethod
    def on_span_end(self, span: Span) -> None:
        """Called when a span completes."""
        pass
    
    @abstractmethod
    def shutdown(self) -> None:
        """Clean up resources (flush buffers, close connections)."""
        pass


# ================================================================
# Example Processors
# ================================================================


class ConsoleProcessor(TracingProcessor):
    """Simple processor that logs to console (for development)."""
    
    def on_trace_start(self, trace: Trace) -> None:
        print(f"[TRACE START] {trace.name} (trace_id={trace.trace_id})")
    
    def on_trace_end(self, trace: Trace) -> None:
        duration = 0
        if trace.ended_at:
            duration = int((trace.ended_at - trace.started_at).total_seconds() * 1000)
        print(f"[TRACE END] {trace.name} ({duration}ms, {len(trace.spans)} spans)")
    
    def on_span_start(self, span: Span) -> None:
        indent = "  "
        print(f"{indent}[SPAN START] {span.span_name} ({span.span_data.span_type})")
    
    def on_span_end(self, span: Span) -> None:
        indent = "  "
        print(f"{indent}[SPAN END] {span.span_name} ({span.duration_ms()}ms) [{span.status}]")
    
    def shutdown(self) -> None:
        print("[TRACING] Console processor shutdown")


class ClickHouseProcessor(TracingProcessor):
    """Processor that writes spans to ClickHouse."""
    
    def __init__(self):
        self._buffer: list[Span] = []
        self._buffer_size = 100  # Batch writes for efficiency
    
    def on_trace_start(self, trace: Trace) -> None:
        pass  # Don't write anything until spans complete
    
    def on_trace_end(self, trace: Trace) -> None:
        pass  # Spans are written individually
    
    def on_span_start(self, span: Span) -> None:
        pass  # Only write on span end
    
    def on_span_end(self, span: Span) -> None:
        """Buffer span and flush if buffer is full."""
        self._buffer.append(span)
        
        if len(self._buffer) >= self._buffer_size:
            self._flush()
    
    def _flush(self) -> None:
        """Write buffered spans to ClickHouse."""
        if not self._buffer:
            return
        
        # TODO: Implement actual ClickHouse write
        # from src.functions.data_ingestion import get_clickhouse_client
        # client = get_clickhouse_client()
        # rows = [[
        #     span.trace_id, span.span_id, span.parent_span_id,
        #     span.task_id, span.agent_id, span.workspace_id,
        #     span.span_data.span_type, span.span_name,
        #     span.duration_ms(), span.status,
        #     ...
        # ] for span in self._buffer]
        # client.insert("task_traces", rows, column_names=[...])
        
        print(f"[CLICKHOUSE] Flushed {len(self._buffer)} spans")
        self._buffer.clear()
    
    def shutdown(self) -> None:
        """Flush remaining buffer before shutdown."""
        self._flush()


# ================================================================
# Global Trace Provider
# ================================================================


class TraceProvider:
    """Global singleton that manages processors."""
    
    def __init__(self):
        self._processors: list[TracingProcessor] = []
        self._disabled = False
    
    def register_processor(self, processor: TracingProcessor) -> None:
        """Add a processor to receive trace/span events."""
        self._processors.append(processor)
    
    def set_processors(self, processors: list[TracingProcessor]) -> None:
        """Replace all processors."""
        self._processors = processors
    
    def set_disabled(self, disabled: bool) -> None:
        """Globally enable/disable tracing."""
        self._disabled = disabled
    
    def create_trace(self, name: str) -> Trace:
        """Create a new trace."""
        trace = Trace(
            trace_id=uuid4(),
            name=name,
            started_at=datetime.utcnow(),
        )
        
        if not self._disabled:
            for processor in self._processors:
                try:
                    processor.on_trace_start(trace)
                except Exception as e:
                    print(f"[TRACING] Processor error on_trace_start: {e}")
        
        return trace
    
    def finish_trace(self, trace: Trace) -> None:
        """Mark trace as complete."""
        trace.ended_at = datetime.utcnow()
        
        if not self._disabled:
            for processor in self._processors:
                try:
                    processor.on_trace_end(trace)
                except Exception as e:
                    print(f"[TRACING] Processor error on_trace_end: {e}")
    
    def create_span(
        self,
        trace: Trace,
        span_name: str,
        span_data: SpanData,
        parent_span_id: Optional[UUID] = None,
        task_id: Optional[UUID] = None,
        agent_id: Optional[UUID] = None,
        workspace_id: Optional[UUID] = None,
    ) -> Span:
        """Create a new span within a trace."""
        span = Span(
            trace_id=trace.trace_id,
            span_id=uuid4(),
            parent_span_id=parent_span_id,
            span_name=span_name,
            span_data=span_data,
            started_at=datetime.utcnow(),
            task_id=task_id,
            agent_id=agent_id,
            workspace_id=workspace_id,
        )
        
        trace.add_span(span)
        
        if not self._disabled:
            for processor in self._processors:
                try:
                    processor.on_span_start(span)
                except Exception as e:
                    print(f"[TRACING] Processor error on_span_start: {e}")
        
        return span
    
    def finish_span(self, span: Span, status: str = "ok", error: Optional[Exception] = None) -> None:
        """Mark span as complete."""
        span.ended_at = datetime.utcnow()
        span.status = status
        span.error = error
        
        if not self._disabled:
            for processor in self._processors:
                try:
                    processor.on_span_end(span)
                except Exception as e:
                    print(f"[TRACING] Processor error on_span_end: {e}")
    
    def shutdown(self) -> None:
        """Shutdown all processors."""
        for processor in self._processors:
            try:
                processor.shutdown()
            except Exception as e:
                print(f"[TRACING] Processor error on shutdown: {e}")


# Global instance
_trace_provider: Optional[TraceProvider] = None


def get_trace_provider() -> TraceProvider:
    """Get or create the global trace provider."""
    global _trace_provider
    if _trace_provider is None:
        _trace_provider = TraceProvider()
    return _trace_provider


def init_tracing(processors: list[TracingProcessor]) -> None:
    """Initialize tracing with processors."""
    provider = get_trace_provider()
    provider.set_processors(processors)


# ================================================================
# Usage Example
# ================================================================

if __name__ == "__main__":
    # Initialize with console processor for demo
    init_tracing([ConsoleProcessor()])
    
    provider = get_trace_provider()
    
    # Create a trace for a task
    trace = provider.create_trace("example_task")
    
    # Agent execution span
    agent_span = provider.create_span(
        trace,
        span_name="ContentModerationAgent",
        span_data=AgentSpanData(
            agent_name="ContentModerationAgent",
            task_input="Is this content safe?",
            task_output="Yes, content is safe",
        ),
    )
    
    # LLM generation span (child of agent)
    gen_span = provider.create_span(
        trace,
        span_name="GPT-4o generation",
        span_data=GenerationSpanData(
            model="gpt-4o",
            input_tokens=100,
            output_tokens=50,
            cost_usd=0.0015,
            input="Is this content safe?",
            output="Yes, content is safe",
        ),
        parent_span_id=agent_span.span_id,
    )
    provider.finish_span(gen_span)
    
    # Quality evaluation span
    eval_span = provider.create_span(
        trace,
        span_name="Toxicity check",
        span_data=GuardrailSpanData(
            metric_name="Toxicity",
            metric_type="llm_judge",
            passed=True,
            score=95.0,
            reasoning="Content is respectful",
        ),
        parent_span_id=agent_span.span_id,
    )
    provider.finish_span(eval_span)
    
    provider.finish_span(agent_span)
    provider.finish_trace(trace)
    
    # Shutdown
    provider.shutdown()

