"""SDK-native tracing - just use OpenAI Agents SDK directly.

We only add:
- ClickHouseTracingProcessor (writes spans to ClickHouse)

Everything else comes from the SDK:
- trace() - from agents.tracing
- generation_span() - from agents.tracing
- function_span() - from agents.tracing
- All span data types - from agents.tracing.span_data

Usage:
    # Initialize processor once at startup (services.py):
    from agents import tracing
    from src.tracing import ClickHouseTracingProcessor

    processor = ClickHouseTracingProcessor()
    tracing.add_trace_processor(processor)

    # In functions that make LLM calls, use SDK directly:
    from agents.tracing import generation_span

    with generation_span(input=messages, model=model):
        result = await llm_call()
        # Processor automatically captures span data on exit

    Note: Do NOT wrap long-running workflows in trace() context managers.
    Traces are for discrete operations (LLM calls, function calls), not
    workflows that run for extended periods.
"""

from .clickhouse_processor import ClickHouseTracingProcessor

__all__ = ["ClickHouseTracingProcessor"]
