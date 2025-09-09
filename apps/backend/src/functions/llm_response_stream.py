import asyncio
import os
from collections.abc import AsyncIterator
from typing import Any, Literal

from dotenv import load_dotenv
from openai import AsyncOpenAI
from openai.types.responses import ResponseStreamEvent
from pydantic import BaseModel, Field
from restack_ai.function import (
    NonRetryableError,
    function,
    function_info,
    log,
    stream_to_websocket,
)

from restack_ai.workflow import uuid

from src.client import api_address

from .send_agent_event import (
    SendAgentEventInput,
    send_agent_event,
)

load_dotenv()


class ErrorDetails(BaseModel):
    """Error details for error events."""
    id: str = Field(default_factory=lambda: f"error_{uuid()}")
    type: str
    error_type: str
    error_message: str
    error_source: Literal["openai", "mcp", "backend", "network"]
    error_details: dict[str, Any] = Field(default_factory=dict)


class ErrorEvent(BaseModel):
    """Error event with proper Pydantic validation."""
    type: Literal["error"] = "error"
    error: ErrorDetails

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for event storage."""
        return self.model_dump()


def validate_json_serializable(data: Any) -> dict[str, Any]:
    """Ensure data is JSON serializable and return as dict."""
    try:
        # Test JSON serialization with Pydantic if it's one of our models
        if isinstance(data, BaseModel):
            return data.model_dump()
        # For other data, ensure it's JSON serializable
        import json
        json_str = json.dumps(data)
        return json.loads(json_str)
    except (TypeError, ValueError) as e:
        log.error(f"Data not JSON serializable: {e}, data: {data}")
        # Return a safe fallback using our error model
        fallback_error = ErrorEvent(
            error=ErrorDetails(
                type="serialization_error",
                error_type="json_serialization_failed",
                error_message=f"Failed to serialize data: {e!s}",
                error_source="backend",
                error_details={
                    "original_data_type": type(data).__name__,
                    "serialization_error": str(e)
                }
            )
        )
        return fallback_error.to_dict()


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
            if hasattr(event, "type") and ".delta" not in event.type:
                event_data = (
                    event.model_dump()
                    if hasattr(event, "model_dump")
                    else event.__dict__
                )

                # Check for error events and enhance them
                if hasattr(event, "type") and ("error" in event.type or "failed" in event.type):
                    log.error(f"OpenAI error event: {event_data}")

                try:
                    # Validate event data is JSON serializable before sending
                    validated_event_data = validate_json_serializable(event_data)
                    await send_agent_event(
                        SendAgentEventInput(
                            event_name="response_item",
                            agent_id=agent_id,
                            event_input=validated_event_data,
                        )
                    )
                except (OSError, ValueError, RuntimeError) as e:
                    log.warning(f"Failed to send event to agent: {e}")

                    # Send error event to agent for failed event transmission
                    error_event = ErrorEvent(
                        error=ErrorDetails(
                            type="network_error",
                            error_type="event_transmission_failed",
                            error_message=f"Failed to send event to agent: {e}",
                            error_source="backend",
                            error_details={
                                "original_event": str(event_data),  # Convert to string to ensure serializability
                                "exception": str(e)
                            }
                        )
                    )
                    try:
                        await send_agent_event(
                            SendAgentEventInput(
                                event_name="response_item",
                                agent_id=agent_id,
                                event_input=error_event.to_dict(),
                            )
                        )
                    except (OSError, ValueError, RuntimeError):
                        # If we can't even send the error event, just log it
                        log.error(f"Critical: Failed to send error event to agent: {error_event}")
    except (OSError, ValueError, RuntimeError, asyncio.CancelledError) as e:
        log.error(f"Critical error in stream processing: {e}")

        # Try to send a critical error event
        critical_error_event = ErrorEvent(
            error=ErrorDetails(
                type="stream_error",
                error_type="critical_stream_processing_error",
                error_message=f"Critical error in stream processing: {e}",
                error_source="backend",
                error_details={
                    "exception_type": type(e).__name__,
                    "exception": str(e)
                }
            )
        )
        try:
            await send_agent_event(
                SendAgentEventInput(
                    event_name="response_item",
                    agent_id=agent_id,
                    event_input=critical_error_event.to_dict(),
                )
            )
        except (OSError, ValueError, RuntimeError):
            log.error(f"Critical: Failed to send critical error event: {critical_error_event}")
            raise


@function.defn()
async def llm_response_stream(
    function_input: LlmResponseInput,
) -> LlmResponseOutput:
    try:
        log.info(
            "llm_response started",
            create_params=function_input.create_params,
        )

        if not os.environ.get("OPENAI_API_KEY"):
            error_msg = "OPENAI_API_KEY is not set"
            raise NonRetryableError(error_msg)

        client = AsyncOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

        try:
            log.info(
                "Creating response with params",
                create_params=function_input.create_params,
            )
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
            openai_error_event = ErrorEvent(
                error=ErrorDetails(
                    type="openai_api_error",
                    error_type="api_request_failed",
                    error_message=error_msg,
                    error_source="openai",
                    error_details={
                        "exception_type": type(e).__name__,
                        "exception": str(e),
                        "create_params": str(function_input.create_params)  # Convert to string for safety
                    }
                )
            )

            try:
                await send_agent_event(
                    SendAgentEventInput(
                        event_name="response_item",
                        agent_id=agent_id,
                        event_input=openai_error_event.to_dict(),
                    )
                )
            except (OSError, ValueError, RuntimeError) as send_error:
                log.error(f"Failed to send OpenAI error event to agent: {send_error}")

            raise NonRetryableError(error_msg) from e

        # Split stream for parallel processing - maximum performance!
        log.info(
            "Splitting response stream for parallel processing"
        )
        tee = AsyncTee(response_stream, 2)
        websocket_stream = tee.get_iterator(0)
        agent_stream = tee.get_iterator(1)

        # Process both streams in parallel
        websocket_task = asyncio.create_task(
            stream_to_websocket(
                api_address=api_address, data=websocket_stream
            )
        )

        agent_task = asyncio.create_task(
            send_non_delta_events_to_agent(agent_stream)
        )

        # Wait for both to complete
        try:
            await asyncio.gather(websocket_task, agent_task)
        except (OSError, ValueError, RuntimeError) as e:
            log.warning(f"Stream processing failed: {e}")

            # Send stream processing error to agent
            agent_id = function_info().workflow_id
            stream_error_event = ErrorEvent(
                error=ErrorDetails(
                    type="stream_processing_error",
                    error_type="stream_processing_failed",
                    error_message=f"Stream processing failed: {e}",
                    error_source="backend",
                    error_details={
                        "exception_type": type(e).__name__,
                        "exception": str(e)
                    }
                )
            )

            try:
                await send_agent_event(
                    SendAgentEventInput(
                        event_name="response_item",
                        agent_id=agent_id,
                        event_input=stream_error_event.to_dict(),
                    )
                )
            except (OSError, ValueError, RuntimeError) as send_error:
                log.error(f"Failed to send stream error event to agent: {send_error}")

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
