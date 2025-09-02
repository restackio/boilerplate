import os
import asyncio
from typing import Any, Literal, AsyncIterator

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel
from restack_ai.function import (
    NonRetryableError,
    function,
    log,
    stream_to_websocket,
)

from src.client import api_address
from .openai_sdk_types import Message,LlmResponseOutput, LlmResponseInput, is_delta_event
from .send_agent_event import send_agent_event, SendAgentEventInput

load_dotenv()




async def extract_streaming_events(stream, agent_id: str):
    """
    Extract and send streaming events to agent state as they happen.
    Preserves OpenAI SDK format and uses their native IDs and structure.
    Skips delta events (text deltas) as they are handled by WebSocket streaming.
    """
    try:
        async for event in stream:
            try:
                # Trust OpenAI SDK format completely - just pass it through
                if hasattr(event, 'type'):
                    # Skip delta events (text deltas) - they're handled by WebSocket streaming
                    if is_delta_event(event):
                        log.debug(f"Skipping delta event {event.type} - handled by WebSocket")
                        continue
                    
                    # Use OpenAI's native event structure
                    event_data = event.model_dump() if hasattr(event, 'model_dump') else event.__dict__
                    
                    # Send to agent for persistence using OpenAI's exact format
                    await send_agent_event(SendAgentEventInput(
                        event_name="sdk_response_event",
                        agent_id=agent_id,
                        event_input=event_data
                    ))
                    
                    log.debug(f"Sent OpenAI streaming event {event.type} to agent")
                    
            except Exception as e:
                log.error(f"Error processing streaming event: {e}")
                
    except Exception as e:
        log.error(f"Error in streaming event extraction: {e}")



async def process_response_stream(stream, agent_id: str = None):
    """
    Process OpenAI response stream and extract final response data.
    Also handles WebSocket streaming and agent event extraction.
    """
    final_response = None
    response_id = None
    usage = None
    event_count = 0
    
    # Collect all events for processing
    events = []
    async for event in stream:
        events.append(event)
        event_count += 1
        
        # Extract response data from key events
        if hasattr(event, 'type'):
            if event.type == 'response.completed':
                if hasattr(event, 'response'):
                    final_response = event.response
                    response_id = getattr(event.response, 'id', None)
                    usage = getattr(event.response, 'usage', None)
            elif event.type == 'response.created':
                if hasattr(event, 'response') and not response_id:
                    response_id = getattr(event.response, 'id', None)

    # Handle WebSocket streaming and agent events in parallel
    tasks = []
    
    # WebSocket streaming
    async def websocket_stream():
        for event in events:
            yield event
    
    websocket_task = stream_to_websocket(api_address=api_address, data=websocket_stream())
    tasks.append(websocket_task)
    
    # Agent event extraction
    if agent_id:
        async def agent_stream():
            for event in events:
                yield event
        
        event_extraction_task = extract_streaming_events(agent_stream(), agent_id)
        tasks.append(event_extraction_task)
    
    # Wait for all tasks to complete
    await asyncio.gather(*tasks)
    
    return {
        "final_response": final_response,
        "response_id": response_id,
        "usage": usage,
        "has_completion": final_response is not None,
        "event_count": event_count,
    }


@function.defn()
async def llm_response_stream(
    function_input: LlmResponseInput,
) -> LlmResponseOutput:
    try:
        log.info("llm_response started", create_params=function_input.create_params)
        
        if not os.environ.get("OPENAI_API_KEY"):
            raise NonRetryableError("OPENAI_API_KEY is not set")

        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        response_stream = await client.responses.create(**function_input.create_params)

        # Process the stream and extract response data
        response_data = await process_response_stream(response_stream, function_input.agent_id)

        log.info(
            "llm_response completed", 
            response_id=response_data.get("response_id"),
            has_completion=response_data.get("has_completion"),
            event_count=response_data.get("event_count")
        )

        # Convert response data
        final_response = response_data.get("final_response")
        if final_response and hasattr(final_response, "model_dump"):
            final_response = final_response.model_dump()
        elif final_response and hasattr(final_response, "__dict__"):
            final_response = final_response.__dict__

        usage = response_data.get("usage")
        if usage and hasattr(usage, "model_dump"):
            usage = usage.model_dump()
        elif usage and hasattr(usage, "__dict__"):
            usage = usage.__dict__

        return LlmResponseOutput(
            final_response=final_response,
            response_id=response_data.get("response_id"),
            usage=usage,
            has_completion=response_data.get("has_completion", False),
            event_count=response_data.get("event_count", 0),
        )

    except Exception as e:
        raise NonRetryableError(f"llm_response failed: {e}") from e
