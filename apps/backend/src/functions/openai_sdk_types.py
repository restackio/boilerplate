"""
OpenAI SDK type definitions and utilities for consistent type usage across the application.
This module provides a centralized location for all OpenAI SDK types and helpers.
"""

from typing import Any, Literal, Union
from openai.types.responses import (
    # Core response types
    ResponseStreamEvent,
    ResponseCreateParams,
    ResponseOutputItem,
    
    # Tool parameter types  
    FileSearchToolParam,
    WebSearchToolParam,
    FunctionToolParam,
    
    # Specific event types we care about for persistence
    ResponseOutputItemAddedEvent,
    ResponseOutputItemDoneEvent,
    ResponseTextDoneEvent,
    ResponseReasoningSummaryTextDoneEvent,
    ResponseWebSearchCallCompletedEvent,
    ResponseWebSearchCallInProgressEvent,
    ResponseWebSearchCallSearchingEvent,
    ResponseMcpCallCompletedEvent,
    ResponseMcpCallInProgressEvent,
    ResponseMcpCallFailedEvent,
    ResponseMcpCallArgumentsDoneEvent,
    ResponseMcpCallArgumentsDeltaEvent,
    
    # Delta events (for streaming but not persistence)
    ResponseTextDeltaEvent,
    ResponseReasoningSummaryTextDeltaEvent,
)
from openai.types.responses.tool_param import Mcp
from pydantic import BaseModel

# Union type for all tool parameters
ToolParam = Union[FunctionToolParam, WebSearchToolParam, FileSearchToolParam, Mcp, dict[str, Any]]

# Union type for persistent events (events we want to save to agent state)
PersistentResponseEvent = Union[
    ResponseOutputItemAddedEvent,
    ResponseOutputItemDoneEvent,
    ResponseTextDoneEvent,
    ResponseReasoningSummaryTextDoneEvent,
    ResponseWebSearchCallCompletedEvent,
    ResponseWebSearchCallInProgressEvent,
    ResponseWebSearchCallSearchingEvent,
    ResponseMcpCallCompletedEvent,
    ResponseMcpCallInProgressEvent,
    ResponseMcpCallFailedEvent,
    ResponseMcpCallArgumentsDoneEvent,
]

# Union type for delta events (events we stream but don't persist)
StreamOnlyEvent = Union[
    ResponseTextDeltaEvent,
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseMcpCallArgumentsDeltaEvent,
]

class Message(BaseModel):
    """Message type compatible with existing codebase."""
    role: Literal["developer", "user", "assistant"]
    content: str

class LlmResponseOutput(BaseModel):
    """Output from LLM response stream function."""
    final_response: dict[str, Any] | None = None
    response_id: str | None = None
    usage: dict[str, Any] | None = None
    has_completion: bool | None = None
    event_count: int | None = None

class LlmResponseInput(BaseModel):
    """Input to LLM response stream function."""
    create_params: dict[str, Any]  # Use dict for now to maintain compatibility
    agent_id: str | None = None

class ExtractedEvent(BaseModel):
    """Wrapper for extracted SDK events with metadata."""
    event_type: str
    event_data: dict[str, Any]
    sequence_number: int | None = None
    timestamp: str | None = None
    item_id: str | None = None

def is_persistent_event(event: ResponseStreamEvent) -> bool:
    """
    Determine if this event should be persisted to agent state.
    Skip delta events as they're handled by WebSocket streaming.
    """
    return isinstance(event, (
        ResponseOutputItemAddedEvent,
        ResponseOutputItemDoneEvent,
        ResponseTextDoneEvent,
        ResponseReasoningSummaryTextDoneEvent,
        ResponseWebSearchCallCompletedEvent,
        ResponseWebSearchCallInProgressEvent,
        ResponseWebSearchCallSearchingEvent,
        ResponseMcpCallCompletedEvent,
        ResponseMcpCallInProgressEvent,
        ResponseMcpCallFailedEvent,
        ResponseMcpCallArgumentsDoneEvent,
    ))

def is_delta_event(event: ResponseStreamEvent) -> bool:
    """
    Determine if this is a delta event (streaming only, not persistent).
    """
    return isinstance(event, (
        ResponseTextDeltaEvent,
        ResponseReasoningSummaryTextDeltaEvent,
        ResponseMcpCallArgumentsDeltaEvent,
    )) or (hasattr(event, 'type') and event.type.endswith('.delta'))

def extract_item_id(event: ResponseStreamEvent) -> str | None:
    """
    Extract item ID from various event types for consistent identification.
    """
    # Try different attribute names that might contain the item ID
    for attr in ['item_id', 'output_index', 'id']:
        if hasattr(event, attr):
            value = getattr(event, attr)
            if value is not None:
                return str(value)
    
    # For item events, check the item itself
    if hasattr(event, 'item') and event.item:
        if hasattr(event.item, 'id'):
            return str(event.item.id)
    
    return None

def event_to_extracted_event(event: ResponseStreamEvent) -> ExtractedEvent:
    """
    Convert OpenAI SDK event to our ExtractedEvent format.
    """
    return ExtractedEvent(
        event_type=event.type,
        event_data=event.model_dump() if hasattr(event, 'model_dump') else event.__dict__,
        sequence_number=getattr(event, 'sequence_number', None),
        timestamp=getattr(event, 'timestamp', None),
        item_id=extract_item_id(event)
    )
