import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function


class RestackEngineApiInput(BaseModel):
    """Input model for Restack engine API calls."""
    action: str = Field(..., pattern="^(pause|resume|delete|edit)$")
    schedule_id: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    schedule_spec: dict | None = Field(None, description="Schedule specification for edit action")


@function.defn()
async def restack_engine_api_schedule(
    input_data: RestackEngineApiInput,
) -> dict[str, Any]:
    """Call Restack engine API for schedule operations."""
    action = input_data.action
    schedule_id = input_data.schedule_id
    reason = input_data.reason

    engine_address = os.getenv("RESTACK_ENGINE_ADDRESS", "http://localhost:6233")
    api_key = os.getenv("RESTACK_ENGINE_API_KEY")

    url = f"{engine_address}/api/engine/schedule/{action}"
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Connection": "keep-alive",
        "User-Agent": "Restack-Backend/1.0",
    }

    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "scheduleId": schedule_id,
        "reason": reason
    }

    # Add schedule spec for edit action
    if action == "edit" and input_data.schedule_spec:
        payload["scheduleSpec"] = input_data.schedule_spec


    async with httpx.AsyncClient() as client_http:
        try:
            response = await client_http.post(url, json=payload, headers=headers)

            if response.status_code >= 400:
                response_text = response.text

                # Provide more specific error messages based on common issues
                if response.status_code == 500 and "Failed to pause schedule" in response_text:
                    error_message = f"Schedule '{schedule_id}' cannot be paused. It may not exist, already be paused, or be in an invalid state. Restack response: {response_text}"
                elif response.status_code == 500 and "Failed to resume schedule" in response_text:
                    error_message = f"Schedule '{schedule_id}' cannot be resumed. It may not exist, already be active, or be in an invalid state. Restack response: {response_text}"
                elif response.status_code == 500 and "Failed to delete schedule" in response_text:
                    error_message = f"Schedule '{schedule_id}' cannot be deleted. It may not exist or be in an invalid state. Restack response: {response_text}"
                else:
                    # Try to get more detailed error info
                    try:
                        error_data = response.json()
                        error_message = f"Failed to {action} schedule via Restack API (HTTP {response.status_code}): {error_data}"
                    except:
                        error_message = f"Failed to {action} schedule via Restack API (HTTP {response.status_code}): {response_text}"

                raise NonRetryableError(message=error_message)

            response.raise_for_status()

            # Try to parse JSON response, fallback to text
            try:
                response_data = response.json()
            except:
                response_data = {"message": response.text}

            return {
                "action": action,
                "schedule_id": schedule_id,
                "reason": reason,
                "api_response": response_data,
                "status_code": response.status_code,
            }

        except httpx.HTTPError as e:
            raise NonRetryableError(
                message=f"Failed to {action} schedule via Restack API: {e!s}"
            ) from e
