import asyncio
import os
import warnings
from collections.abc import AsyncIterator
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from openai._exceptions import (
    APIResponseValidationError,
)
from openai.types.responses import ResponseStreamEvent
from openai.types.responses.response_error_event import (
    ResponseErrorEvent,
)
from pydantic import BaseModel
from restack_ai.function import (
    NonRetryableError,
    function,
    function_info,
    log,
    stream_to_websocket,
)

from src.client import stream_address

from .send_agent_event import (
    SendAgentEventInput,
    send_agent_event,
)

load_dotenv()

# Suppress noisy Pydantic serialization warnings from OpenAI SDK
# These warnings occur when OpenAI tries to serialize response objects
# which don't perfectly fit the expected union types, but the serialization still works

# Suppress specific PydanticSerializationUnexpectedValue warnings
warnings.filterwarnings(
    "ignore",
    message=".*PydanticSerializationUnexpectedValue.*",
    category=UserWarning,
    module="pydantic",
)

# Suppress general Pydantic serializer warnings from main.py
warnings.filterwarnings(
    "ignore",
    message=".*Pydantic serializer warnings.*",
    category=UserWarning,
    module="pydantic.main",
)

# Suppress warnings about expected types vs actual types
warnings.filterwarnings(
    "ignore",
    message=".*Expected.*serialized value may not be as expected.*",
    category=UserWarning,
    module="pydantic.main",
)

# Suppress warnings about literal values
warnings.filterwarnings(
    "ignore",
    message=".*Expected `literal.*",
    category=UserWarning,
    module="pydantic.main",
)


def create_error_event(
    message: str,
    error_type: str = "unknown_error",
    code: str | None = None,
    param: str | None = None,
    sequence_number: int = 0,
) -> ResponseErrorEvent:
    """Create an OpenAI-native error event."""
    return ResponseErrorEvent(
        code=code or error_type,
        message=message,
        param=param,
        sequence_number=sequence_number,
        type="error",
    )


class Message(BaseModel):
    """Message structure for chat conversations."""

    role: str
    content: str


class LlmResponseOutput(BaseModel):
    """Output from LLM response stream function."""

    response_id: str | None = None
    usage: dict[str, Any] | None = None
    parsed_response: dict[str, Any] | None = None


class LlmResponseInput(BaseModel):
    """Input to LLM response stream function."""

    create_params: dict[str, Any]
    task_id: str | None = None
    agent_id: str | None = None
    workspace_id: str | None = None


class OpenAIStreamWrapper:
    """Wrapper that makes an async iterator appear as an OpenAI stream."""

    def __init__(
        self, async_iter: AsyncIterator[ResponseStreamEvent]
    ) -> None:
        self._async_iter = async_iter

    def __aiter__(self) -> "OpenAIStreamWrapper":
        """Return self as async iterator."""
        return self

    async def __anext__(self) -> ResponseStreamEvent:
        """Get next item from async iterator."""
        return await self._async_iter.__anext__()


# Set the module to make it detectable as OpenAI
OpenAIStreamWrapper.__module__ = "openai.responses"


class AsyncTee:
    """Split an async iterator into multiple independent iterators."""

    def __init__(
        self,
        async_iter: AsyncIterator[ResponseStreamEvent],
        n: int = 2,
    ) -> None:
        self._async_iter = async_iter
        self._queues = [asyncio.Queue() for _ in range(n)]
        self._finished = False
        self._task = None

    async def _producer(self) -> None:
        """Produce events to all queues."""
        try:
            async for item in self._async_iter:
                for queue in self._queues:
                    await queue.put(item)
        except (
            StopAsyncIteration,
            GeneratorExit,
            asyncio.CancelledError,
        ) as e:
            for queue in self._queues:
                await queue.put(e)
        finally:
            for queue in self._queues:
                await queue.put(StopAsyncIteration)
            self._finished = True

    def get_iterator(
        self, index: int
    ) -> AsyncIterator[ResponseStreamEvent]:
        """Get one of the split iterators."""
        if self._task is None:
            self._task = asyncio.create_task(self._producer())

        async def _consumer() -> (
            AsyncIterator[ResponseStreamEvent]
        ):
            while True:
                item = await self._queues[index].get()
                if item is StopAsyncIteration:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item

        # Wrap the iterator to make it appear as an OpenAI stream
        return OpenAIStreamWrapper(_consumer())


def _serialize_event(event: ResponseStreamEvent) -> dict | str:
    """Serialize event to dict using OpenAI SDK patterns."""
    if hasattr(event, "model_dump"):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                return event.model_dump()
        except (
            APIResponseValidationError,
            ValueError,
            TypeError,
        ) as e:
            log.warning(
                f"OpenAI model_dump failed for event {getattr(event, 'type', 'unknown')}: {e}"
            )
            return (
                event.__dict__
                if hasattr(event, "__dict__")
                else {"error": str(e)}
            )
    return (
        event.__dict__
        if hasattr(event, "__dict__")
        else str(event)
    )


async def _send_event_to_agent(
    temporal_agent_id: str,
    event_data: dict | str,
) -> None:
    """Send event to agent with error handling."""
    try:
        await send_agent_event(
            SendAgentEventInput(
                event_name="response_item",
                temporal_agent_id=temporal_agent_id,
                event_input=event_data,
            )
        )
    except (OSError, ValueError, RuntimeError) as e:
        log.warning(f"Failed to send event to agent: {e}")

        # Send error event for failed transmission
        error_event = create_error_event(
            message=f"Failed to send event to agent: {e}",
            error_type="event_transmission_failed",
            code="network_error",
        )
        try:
            await send_agent_event(
                SendAgentEventInput(
                    event_name="response_item",
                    temporal_agent_id=temporal_agent_id,
                    event_input=error_event.model_dump(),
                )
            )
        except (OSError, ValueError, RuntimeError):
            log.error(
                f"Critical: Failed to send error event to agent: {error_event}"
            )


async def _send_critical_error_to_agent(
    temporal_agent_id: str,
    error: Exception,
) -> None:
    """Send critical error event to agent."""
    log.error(f"Critical error in stream processing: {error}")

    critical_error_event = create_error_event(
        message=f"Critical error in stream processing: {error}",
        error_type="critical_stream_processing_error",
        code="stream_error",
    )
    try:
        await send_agent_event(
            SendAgentEventInput(
                event_name="response_item",
                temporal_agent_id=temporal_agent_id,
                event_input=critical_error_event.model_dump(),
            )
        )
    except (OSError, ValueError, RuntimeError):
        log.error(
            f"Critical: Failed to send critical error event: {critical_error_event}"
        )


def _finalize_response_span(
    span: Any, final_response: Any
) -> None:
    """Set final response on span for tracing."""
    if span and final_response:
        try:
            if hasattr(span, "span_data"):
                span.span_data.response = final_response
                log.info("Set final Response object on span")
        except (
            ValueError,
            TypeError,
            AttributeError,
            RuntimeError,
        ) as e:
            log.warning(f"Failed to set response on span: {e}")


async def send_non_delta_events_to_agent(
    stream: AsyncIterator[ResponseStreamEvent],
    span: Any = None,
) -> dict[str, Any]:
    """Send only non-delta events to agent and capture final response for tracing.

    Following the SDK pattern from openai_responses.py for proper response tracing.

    Returns:
        Dict containing response_id, usage, and parsed_response from final response.
    """
    temporal_agent_id = function_info().workflow_id
    final_response = None
    response_data = {
        "response_id": None,
        "usage": None,
        "parsed_response": None,
    }

    try:
        async for event in stream:
            if not (
                hasattr(event, "type")
                and ".delta" not in event.type
            ):
                continue

            # Serialize event using SDK patterns
            event_data = _serialize_event(event)

            # Capture final Response object (SDK pattern)
            if (
                hasattr(event, "type")
                and event.type == "response.completed"
                and hasattr(event, "response")
            ):
                final_response = event.response
                # Extract response data for return value
                if hasattr(final_response, "id"):
                    response_data["response_id"] = (
                        final_response.id
                    )
                if hasattr(final_response, "usage"):
                    response_data["usage"] = (
                        _convert_response_usage(
                            final_response.usage
                        )
                    )
                if hasattr(final_response, "parsed_response"):
                    response_data["parsed_response"] = (
                        final_response.parsed_response
                    )

            # Log error events
            if hasattr(event, "type") and (
                "error" in event.type or "failed" in event.type
            ):
                log.error(f"OpenAI error event: {event_data}")

            # Send event to agent with error handling
            await _send_event_to_agent(
                temporal_agent_id, event_data
            )
    except (
        OSError,
        ValueError,
        RuntimeError,
        asyncio.CancelledError,
    ) as e:
        await _send_critical_error_to_agent(temporal_agent_id, e)
        error_msg = f"Critical error in stream processing: {e}"
        raise NonRetryableError(error_msg) from e
    finally:
        _finalize_response_span(span, final_response)

    return response_data


def _initialize_tracing(
    function_input: Any,
) -> tuple[Any, Any, Any]:
    """Initialize tracing contexts and return (trace_ctx, span_ctx, span)."""
    try:
        from agents.tracing import response_span, trace

        temporal_agent_id = function_info().workflow_id
        temporal_run_id = function_info().workflow_run_id

        trace_context = trace(
            workflow_name="llm_call",
            metadata={
                "temporal_agent_id": temporal_agent_id,
                "temporal_run_id": temporal_run_id,
                "task_id": function_input.task_id,
                "agent_id": function_input.agent_id,
                "workspace_id": function_input.workspace_id,
            },
        )
        trace_context.__enter__()

        span_context = response_span()
        current_span = span_context.__enter__()
        current_span.span_data.input = (
            function_input.create_params.get("input", [])
        )

    except ImportError:
        return None, None, None
    else:
        return trace_context, span_context, current_span


async def _make_openai_request_with_tracing(
    client: AsyncOpenAI,
    function_input: Any,
    *,
    has_tracing: bool,
) -> tuple[Any, Any, Any, Any]:
    """Make OpenAI API request and return (stream, span, span_ctx, trace_ctx)."""
    span_context = None
    trace_context = None
    current_span = None

    if has_tracing:
        trace_context, span_context, current_span = (
            _initialize_tracing(function_input)
        )

    response_stream = await client.responses.create(
        **function_input.create_params
    )
    return (
        response_stream,
        current_span,
        span_context,
        trace_context,
    )


def _cleanup_tracing_contexts(
    span_context: Any, trace_context: Any
) -> None:
    """Clean up tracing span and trace contexts."""
    if span_context is not None:
        try:
            span_context.__exit__(None, None, None)
            log.info("Closed generation span")
        except (
            ValueError,
            TypeError,
            AttributeError,
            RuntimeError,
        ) as e:
            log.warning(f"Error closing span: {e}")

    if trace_context is not None:
        try:
            trace_context.__exit__(None, None, None)
            log.info("Closed trace context")
        except (
            ValueError,
            TypeError,
            AttributeError,
            RuntimeError,
        ) as e:
            log.warning(f"Error closing trace: {e}")


def _convert_response_usage(usage: Any) -> dict | None:
    """Convert usage object to dict."""
    if usage and hasattr(usage, "model_dump"):
        return usage.model_dump()
    if usage and hasattr(usage, "__dict__"):
        return usage.__dict__
    return usage


@function.defn()
async def llm_response_stream(
    function_input: LlmResponseInput,
) -> LlmResponseOutput:
    # Initialize tracing variables to ensure they're always defined for finally block
    span_context = None
    trace_context = None

    try:
        if not os.environ.get("OPENAI_API_KEY"):
            error_msg = "OPENAI_API_KEY is not set"
            raise NonRetryableError(error_msg)

        client = AsyncOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

        # Check if tracing SDK is available
        try:
            import agents.tracing  # noqa: F401

            has_tracing = True
        except ImportError:
            has_tracing = False

        # Make API call with optional tracing
        try:
            (
                response_stream,
                current_span,
                span_context,
                trace_context,
            ) = await _make_openai_request_with_tracing(
                client, function_input, has_tracing=has_tracing
            )
        except Exception as e:
            error_msg = f"OpenAI API error: {e!s}"
            log.error(
                error_msg,
                create_params=function_input.create_params,
            )

            # Send detailed error event to agent
            temporal_agent_id = function_info().workflow_id
            openai_error_event = create_error_event(
                message=error_msg,
                error_type="api_request_failed",
                code="openai_api_error",
            )

            try:
                await send_agent_event(
                    SendAgentEventInput(
                        event_name="response_item",
                        temporal_agent_id=temporal_agent_id,
                        event_input=openai_error_event.model_dump(),
                    )
                )
            except (
                OSError,
                ValueError,
                RuntimeError,
            ) as send_error:
                log.error(
                    f"Failed to send OpenAI error event to agent: {send_error}"
                )

            raise NonRetryableError(error_msg) from e

        # Split stream for parallel processing - maximum performance!
        tee = AsyncTee(response_stream, 2)
        websocket_stream = tee.get_iterator(0)
        agent_stream = tee.get_iterator(1)

        # Process both streams in parallel
        websocket_task = asyncio.create_task(
            stream_to_websocket(
                api_address=stream_address, data=websocket_stream
            )
        )

        agent_task = asyncio.create_task(
            send_non_delta_events_to_agent(
                agent_stream, current_span
            )
        )

        # Wait for both to complete and capture response data from agent task
        try:
            results = await asyncio.gather(
                websocket_task, agent_task, return_exceptions=True
            )
            # Agent task result contains response_data (second result)
            agent_result = results[1]
            if isinstance(agent_result, dict):
                response_data = agent_result
            else:
                log.warning(
                    f"Agent task returned unexpected result: {agent_result}"
                )
                response_data = {
                    "response_id": None,
                    "usage": None,
                    "parsed_response": None,
                }
        except (
            OSError,
            ValueError,
            RuntimeError,
            asyncio.CancelledError,
        ) as e:
            log.warning(f"Stream processing had issues: {e}")
            response_data = {
                "response_id": None,
                "usage": None,
                "parsed_response": None,
            }

        log.info(
            "llm_response completed",
            response_id=response_data.get("response_id"),
        )

        return LlmResponseOutput(
            response_id=response_data.get("response_id"),
            usage=response_data.get("usage"),
            parsed_response=response_data.get("parsed_response"),
        )

    except (OSError, ValueError) as e:
        error_msg = f"llm_response failed: {e}"
        raise NonRetryableError(error_msg) from e
    finally:
        # Close span and trace contexts if they were opened
        _cleanup_tracing_contexts(span_context, trace_context)
