import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function

# HTTP status codes
HTTP_BAD_REQUEST = 400
HTTP_INTERNAL_SERVER_ERROR = 500


class RestackEngineApiInput(BaseModel):
    """Input model for Restack engine API calls."""

    action: str = Field(
        ..., pattern="^(pause|resume|delete|edit)$"
    )
    schedule_id: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    schedule_spec: dict | None = Field(
        None, description="Schedule specification for edit action"
    )


def _prepare_restack_headers(
    api_key: str | None,
) -> dict[str, str]:
    """Prepare headers for Restack API requests."""
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Connection": "keep-alive",
        "User-Agent": "Restack-Backend/1.0",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _prepare_restack_payload(
    schedule_id: str,
    reason: str,
    action: str,
    schedule_spec: dict | None,
) -> dict[str, Any]:
    """Prepare payload for Restack API requests."""
    payload = {"scheduleId": schedule_id, "reason": reason}
    if action == "edit" and schedule_spec:
        payload["scheduleSpec"] = schedule_spec
    return payload


def _get_specific_error_message(
    status_code: int,
    response_text: str,
    schedule_id: str,
    action: str,
) -> str:
    """Get specific error message based on response content."""
    if status_code == HTTP_INTERNAL_SERVER_ERROR:
        if "Failed to pause schedule" in response_text:
            return f"Schedule '{schedule_id}' cannot be paused. It may not exist, already be paused, or be in an invalid state. Restack response: {response_text}"
        if "Failed to resume schedule" in response_text:
            return f"Schedule '{schedule_id}' cannot be resumed. It may not exist, already be active, or be in an invalid state. Restack response: {response_text}"
        if "Failed to delete schedule" in response_text:
            return f"Schedule '{schedule_id}' cannot be deleted. It may not exist or be in an invalid state. Restack response: {response_text}"

    # Generic error handling
    try:
        import json

        error_data = json.loads(response_text)
    except (ValueError, KeyError):
        return f"Failed to {action} schedule via Restack API (HTTP {status_code}): {response_text}"
    else:
        return f"Failed to {action} schedule via Restack API (HTTP {status_code}): {error_data}"


@function.defn()
async def restack_engine_api_schedule(
    input_data: RestackEngineApiInput,
) -> dict[str, Any]:
    """Call Restack engine API for schedule operations."""
    action = input_data.action
    schedule_id = input_data.schedule_id
    reason = input_data.reason

    engine_address = os.getenv(
        "RESTACK_ENGINE_ADDRESS", "http://localhost:6233"
    )
    api_key = os.getenv("RESTACK_ENGINE_API_KEY")

    url = f"{engine_address}/api/engine/schedule/{action}"
    headers = _prepare_restack_headers(api_key)
    payload = _prepare_restack_payload(
        schedule_id, reason, action, input_data.schedule_spec
    )

    async with httpx.AsyncClient() as client_http:
        try:
            response = await client_http.post(
                url, json=payload, headers=headers
            )

            if response.status_code >= HTTP_BAD_REQUEST:
                error_message = _get_specific_error_message(
                    response.status_code,
                    response.text,
                    schedule_id,
                    action,
                )
                raise NonRetryableError(message=error_message)

            response.raise_for_status()

            # Try to parse JSON response, fallback to text
            try:
                response_data = response.json()
            except (ValueError, KeyError):
                response_data = {"message": response.text}

        except httpx.HTTPError as e:
            raise NonRetryableError(
                message=f"Failed to {action} schedule via Restack API: {e!s}"
            ) from e

        return {
            "action": action,
            "schedule_id": schedule_id,
            "reason": reason,
            "api_response": response_data,
            "status_code": response.status_code,
        }
