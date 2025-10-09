"""Clean tracing architecture for Temporal + OpenAI Agents.

Architecture:
1. Workflows set simple context (NO SDK imports)
2. Functions self-trace via decorators (SDK isolated here)
3. Processor batches to ClickHouse (async, high-scale)

Usage:
    # In workflow:
    from src.tracing.context import TracingContext, set_tracing_context
    set_tracing_context(TracingContext(...))
    
    # In function:
    from src.tracing.decorators import trace_llm_call
    @trace_llm_call
    async def my_function(...):
        ...

See TRACING_ARCHITECTURE.md for complete documentation.
"""

from .clickhouse_processor import ClickHouseTracingProcessor, ConsoleTracingProcessor
from .context import TracingContext, set_tracing_context, get_tracing_context
from .decorators import trace_llm_call, trace_function_call

__all__ = [
    # Processors
    "ClickHouseTracingProcessor",
    "ConsoleTracingProcessor",
    # Context
    "TracingContext",
    "set_tracing_context",
    "get_tracing_context",
    # Decorators
    "trace_llm_call",
    "trace_function_call",
]
