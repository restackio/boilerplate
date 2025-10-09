"""Tracing decorators for functions.

Functions use these decorators to self-report their execution.
All SDK complexity is isolated here - workflows never import the SDK.

Usage:
    from src.tracing.decorators import trace_llm_call
    
    @trace_llm_call
    async def llm_response_stream(input: LlmResponseInput) -> dict:
        # Function logic
        result = await client.completions.create(...)
        return result
"""

import functools
import json
import logging
from typing import Any, Callable, TypeVar, ParamSpec

from src.tracing.context import get_tracing_context

logger = logging.getLogger(__name__)

P = ParamSpec("P")
T = TypeVar("T")


def trace_llm_call(func: Callable[P, T]) -> Callable[P, T]:
    """Decorator to automatically trace LLM calls.
    
    Wraps the function with OpenAI Agents SDK generation_span.
    Extracts model, messages, and usage from function input/output.
    
    Usage:
        @trace_llm_call
        async def llm_response_stream(input: LlmResponseInput) -> dict:
            ...
    """
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        # Check if tracing is enabled
        ctx = get_tracing_context()
        if not ctx or not ctx.get("enabled"):
            # No tracing - just execute function
            return await func(*args, **kwargs)
        
        # Try to import SDK (only in functions, not workflows)
        try:
            from agents.tracing import generation_span
        except (ImportError, Exception) as e:
            logger.debug(f"OpenAI Agents SDK not available: {e}")
            # SDK not available - just execute function
            return await func(*args, **kwargs)
        
        # Extract input data from function args
        input_messages = _extract_messages_from_args(args, kwargs)
        model = _extract_model_from_args(args, kwargs)
        
        # Create generation span
        span_ctx = None
        gen_span = None
        
        try:
            span_ctx = generation_span(
                input=input_messages,
                model=model,
            )
            gen_span = span_ctx.__enter__()
        except Exception as e:
            logger.debug(f"Error creating generation span: {e}")
        
        try:
            # Execute the actual function
            result = await func(*args, **kwargs)
            
            # Update span with results
            if gen_span and isinstance(result, dict):
                _update_generation_span(gen_span, result)
            
            return result
            
        finally:
            # Close span
            if span_ctx:
                try:
                    span_ctx.__exit__(None, None, None)
                except Exception as e:
                    logger.debug(f"Error closing generation span: {e}")
    
    return wrapper


def trace_function_call(function_name: str | None = None):
    """Decorator to automatically trace function/tool calls.
    
    Usage:
        @trace_function_call("web_search")
        async def search_tool(input: SearchInput) -> SearchResult:
            ...
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Check if tracing is enabled
            ctx = get_tracing_context()
            if not ctx or not ctx.get("enabled"):
                return await func(*args, **kwargs)
            
            # Try to import SDK
            try:
                from agents.tracing import function_span
            except (ImportError, Exception) as e:
                logger.debug(f"OpenAI Agents SDK not available: {e}")
                return await func(*args, **kwargs)
            
            # Use provided name or function name
            name = function_name or func.__name__
            
            # Extract input
            input_data = _serialize_args(args, kwargs)
            
            # Create function span
            span_ctx = None
            func_span = None
            
            try:
                span_ctx = function_span(
                    name=name,
                    input=input_data,
                )
                func_span = span_ctx.__enter__()
            except Exception as e:
                logger.debug(f"Error creating function span: {e}")
            
            try:
                # Execute function
                result = await func(*args, **kwargs)
                
                # Update span with output
                if func_span:
                    func_span.span_data.output = _serialize_result(result)
                
                return result
                
            finally:
                # Close span
                if span_ctx:
                    try:
                        span_ctx.__exit__(None, None, None)
                    except Exception as e:
                        logger.debug(f"Error closing function span: {e}")
        
        return wrapper
    return decorator


# Helper functions to extract data from function args

def _extract_messages_from_args(args: tuple, kwargs: dict) -> list[dict[str, Any]]:
    """Extract messages from function arguments."""
    # Try to get from first arg (common pattern)
    if args and hasattr(args[0], 'messages'):
        messages = args[0].messages
        if messages:
            return [
                {"role": msg.role if hasattr(msg, 'role') else msg.get("role", "user"),
                 "content": msg.content if hasattr(msg, 'content') else msg.get("content", "")}
                for msg in messages
            ]
    
    # Try kwargs
    if 'messages' in kwargs:
        return kwargs['messages']
    
    # Try input object
    if 'input' in kwargs and hasattr(kwargs['input'], 'messages'):
        messages = kwargs['input'].messages
        return [
            {"role": msg.role if hasattr(msg, 'role') else msg.get("role", "user"),
             "content": msg.content if hasattr(msg, 'content') else msg.get("content", "")}
            for msg in messages
        ]
    
    return []


def _extract_model_from_args(args: tuple, kwargs: dict) -> str:
    """Extract model from function arguments."""
    # Try first arg
    if args and hasattr(args[0], 'model'):
        return args[0].model or "gpt-4o"
    
    # Try kwargs
    if 'model' in kwargs:
        return kwargs['model']
    
    # Try input object
    if 'input' in kwargs and hasattr(kwargs['input'], 'model'):
        return kwargs['input'].model or "gpt-4o"
    
    return "gpt-4o"


def _update_generation_span(span: Any, result: dict[str, Any]) -> None:
    """Update generation span with LLM response data."""
    try:
        # Extract usage
        usage_data = result.get("usage", {})
        prompt_tokens = usage_data.get("prompt_tokens", 0)
        completion_tokens = usage_data.get("completion_tokens", 0)
        total_tokens = usage_data.get("total_tokens", prompt_tokens + completion_tokens)
        
        # Calculate cost (GPT-4o pricing - TODO: make configurable)
        cost_usd = None
        if prompt_tokens and completion_tokens:
            cost_usd = (prompt_tokens * 0.0025 / 1000) + (completion_tokens * 0.01 / 1000)
        
        # Set usage
        span.span_data.usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost_usd": cost_usd,
        }
        
        # Extract output
        if result.get("choices"):
            choice = result["choices"][0]
            message = choice.get("message", {})
            
            output_msg = {
                "role": message.get("role", "assistant"),
            }
            
            if message.get("content"):
                output_msg["content"] = message["content"]
            
            if message.get("tool_calls"):
                output_msg["tool_calls"] = message["tool_calls"]
            
            span.span_data.output = [output_msg]
            
    except Exception as e:
        logger.debug(f"Error updating generation span: {e}")


def _serialize_args(args: tuple, kwargs: dict) -> str:
    """Serialize function arguments to string."""
    try:
        # Try to get first arg if it's a Pydantic model
        if args and hasattr(args[0], 'model_dump'):
            return json.dumps(args[0].model_dump(), default=str)
        elif args and hasattr(args[0], 'dict'):
            return json.dumps(args[0].dict(), default=str)
        elif args:
            return json.dumps({"args": list(args)}, default=str)
        else:
            return json.dumps(kwargs, default=str)
    except Exception:
        return str(args[0] if args else kwargs)


def _serialize_result(result: Any) -> str:
    """Serialize function result to string."""
    try:
        if isinstance(result, str):
            return result
        elif isinstance(result, dict):
            return json.dumps(result, default=str)
        elif hasattr(result, 'model_dump'):
            return json.dumps(result.model_dump(), default=str)
        elif hasattr(result, 'dict'):
            return json.dumps(result.dict(), default=str)
        else:
            return str(result)
    except Exception:
        return str(result)

