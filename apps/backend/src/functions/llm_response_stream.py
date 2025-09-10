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
# These warnings occur when OpenAI tries to serialize McpCall objects
# which don't perfectly fit the expected union types, but the serialization still works
warnings.filterwarnings(
    "ignore",
    message=".*PydanticSerializationUnexpectedValue.*",
    category=UserWarning,
    module="pydantic"
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


async def send_non_delta_events_to_agent(
    stream: AsyncIterator[ResponseStreamEvent],
) -> None:
    """Send only non-delta events to agent."""
    agent_id = function_info().workflow_id

    try:
        async for event in stream:
            if (
                hasattr(event, "type")
                and ".delta" not in event.type
            ):
                # Use standard OpenAI SDK serialization with error handling
                if hasattr(event, "model_dump"):
                    try:
                        event_data = event.model_dump()
                    except (
                        APIResponseValidationError,
                        ValueError,
                        TypeError,
                    ) as e:
                        # Handle OpenAI SDK serialization errors
                        log.warning(
                            f"OpenAI model_dump failed for event {getattr(event, 'type', 'unknown')}: {e}"
                        )
                        event_data = (
                            event.__dict__
                            if hasattr(event, "__dict__")
                            else {"error": str(e)}
                        )
                else:
                    event_data = (
                        event.__dict__
                        if hasattr(event, "__dict__")
                        else str(event)
                    )

                # Check for error events and enhance them
                if hasattr(event, "type") and (
                    "error" in event.type
                    or "failed" in event.type
                ):
                    log.error(f"OpenAI error event: {event_data}")

                try:
                    # Send event data directly (already JSON serializable from model_dump())
                    await send_agent_event(
                        SendAgentEventInput(
                            event_name="response_item",
                            agent_id=agent_id,
                            event_input=event_data,
                        )
                    )
                except (OSError, ValueError, RuntimeError) as e:
                    log.warning(
                        f"Failed to send event to agent: {e}"
                    )

                    # Send OpenAI-native error event to agent for failed event transmission
                    error_event = create_error_event(
                        message=f"Failed to send event to agent: {e}",
                        error_type="event_transmission_failed",
                        code="network_error",
                    )
                    try:
                        await send_agent_event(
                            SendAgentEventInput(
                                event_name="response_item",
                                agent_id=agent_id,
                                event_input=error_event.model_dump(),
                            )
                        )
                    except (OSError, ValueError, RuntimeError):
                        # If we can't even send the error event, just log it
                        log.error(
                            f"Critical: Failed to send error event to agent: {error_event}"
                        )
    except (
        OSError,
        ValueError,
        RuntimeError,
        asyncio.CancelledError,
    ) as e:
        log.error(f"Critical error in stream processing: {e}")

        # Try to send a critical error event
        critical_error_event = create_error_event(
            message=f"Critical error in stream processing: {e}",
            error_type="critical_stream_processing_error",
            code="stream_error",
        )
        try:
            await send_agent_event(
                SendAgentEventInput(
                    event_name="response_item",
                    agent_id=agent_id,
                    event_input=critical_error_event.model_dump(),
                )
            )
        except (OSError, ValueError, RuntimeError):
            log.error(
                f"Critical: Failed to send critical error event: {critical_error_event}"
            )

        error_msg = f"Critical error in stream processing: {e}"
        raise NonRetryableError(error_msg) from e


@function.defn()
async def llm_response_stream(
    function_input: LlmResponseInput,
) -> LlmResponseOutput:
    try:
        if not os.environ.get("OPENAI_API_KEY"):
            error_msg = "OPENAI_API_KEY is not set"
            raise NonRetryableError(error_msg)

        client = AsyncOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

        try:
            response_stream = await client.responses.create(
                **function_input.create_params
            )
        except Exception as e:
            error_msg = f"OpenAI API error: {e!s}"
            log.error(
                error_msg,
                create_params=function_input.create_params,
            )

            # Send detailed error event to agent
            agent_id = function_info().workflow_id
            openai_error_event = create_error_event(
                message=error_msg,
                error_type="api_request_failed",
                code="openai_api_error",
            )

            try:
                await send_agent_event(
                    SendAgentEventInput(
                        event_name="response_item",
                        agent_id=agent_id,
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
            send_non_delta_events_to_agent(agent_stream)
        )

        # Wait for both to complete, but don't let websocket failures fail the function
        try:
            await asyncio.gather(
                websocket_task, agent_task, return_exceptions=True
            )
        except (
            OSError,
            ValueError,
            RuntimeError,
            asyncio.CancelledError,
        ) as e:
            log.warning(f"Stream processing had issues: {e}")

        # Return minimal response - agent handles all metadata extraction
        response_data = {
            "response_id": None,
            "usage": None,
            "parsed_response": None,
        }

        log.info(
            "llm_response completed",
            response_id=response_data.get("response_id"),
        )

        # Convert usage if present
        usage = response_data.get("usage")
        if usage and hasattr(usage, "model_dump"):
            usage = usage.model_dump()
        elif usage and hasattr(usage, "__dict__"):
            usage = usage.__dict__

        return LlmResponseOutput(
            response_id=response_data.get("response_id"),
            usage=usage,
            parsed_response=response_data.get("parsed_response"),
        )

    except (OSError, ValueError) as e:
        error_msg = f"llm_response failed: {e}"
        raise NonRetryableError(error_msg) from e
