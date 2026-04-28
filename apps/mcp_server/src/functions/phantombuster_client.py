"""PhantomBuster API client helpers used by MCP workflows."""

import csv
import io
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai.function import function, log

PHANTOMBUSTER_API_BASE = "https://api.phantombuster.com/api/v2"


def _get_api_key() -> str:
    api_key = os.environ.get("PHANTOMBUSTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "PHANTOMBUSTER_API_KEY is required but not set in the "
            "mcp_server environment."
        )
    return api_key


class PhantomBusterLaunchAgentInput(BaseModel):
    """Input for launching the LinkedIn Activity Extractor phantom."""

    profile_urls: list[str] = Field(
        default_factory=list,
        description="LinkedIn profile URLs to monitor.",
    )
    phantom_id: str | None = Field(
        default=None,
        description=(
            "Optional phantom ID. If omitted, "
            "PHANTOMBUSTER_ACTIVITY_EXTRACTOR_PHANTOM_ID is used."
        ),
    )
    argument: dict[str, Any] | None = Field(
        default=None,
        description="Optional additional phantom argument payload.",
    )


class PhantomBusterLaunchAgentOutput(BaseModel):
    """Launch result from PhantomBuster."""

    success: bool
    phantom_id: str
    container_id: str | None = None
    status: str | None = None
    message: str | None = None


class PhantomBusterPost(BaseModel):
    """Normalized LinkedIn activity item."""

    profile_url: str | None = None
    post_url: str | None = None
    content: str | None = None
    posted_at: str | None = None
    activity_type: str | None = None


class PhantomBusterFetchOutputInput(BaseModel):
    """Input for fetching output from PhantomBuster."""

    container_id: str | None = Field(
        default=None,
        description="Container ID returned by agents/launch.",
    )
    phantom_id: str | None = Field(
        default=None,
        description=(
            "Fallback phantom ID if container_id is unavailable. "
            "PhantomBuster accepts either in fetch-output id."
        ),
    )


class PhantomBusterFetchOutputOutput(BaseModel):
    """Normalized output from PhantomBuster fetch-output."""

    success: bool
    status: str | None = None
    container_id: str | None = None
    posts: list[PhantomBusterPost] = Field(default_factory=list)
    raw_count: int = 0
    message: str | None = None


def _pick_str(record: dict[str, Any], keys: list[str]) -> str | None:
    for key in keys:
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _normalize_posts(records: list[dict[str, Any]]) -> list[PhantomBusterPost]:
    posts: list[PhantomBusterPost] = []
    dedupe_keys: set[str] = set()

    for row in records:
        profile_url = _pick_str(
            row,
            [
                "profileUrl",
                "profile_url",
                "linkedinProfileUrl",
                "profile",
            ],
        )
        post_url = _pick_str(
            row,
            [
                "postUrl",
                "post_url",
                "activityUrl",
                "url",
            ],
        )
        content = _pick_str(
            row,
            [
                "content",
                "text",
                "postContent",
                "comment",
                "article",
            ],
        )
        posted_at = _pick_str(
            row,
            [
                "postedAt",
                "posted_at",
                "timestamp",
                "createdAt",
                "date",
            ],
        )
        activity_type = _pick_str(
            row,
            [
                "type",
                "activityType",
                "activity_type",
            ],
        )

        dedupe_key = post_url or f"{profile_url}|{content}|{posted_at}"
        if dedupe_key in dedupe_keys:
            continue
        dedupe_keys.add(dedupe_key)

        posts.append(
            PhantomBusterPost(
                profile_url=profile_url,
                post_url=post_url,
                content=content,
                posted_at=posted_at,
                activity_type=activity_type,
            )
        )

    return posts


async def _read_records_from_export_url(export_url: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(export_url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        body = response.text

    if "application/json" in content_type:
        payload = response.json()
        if isinstance(payload, list):
            return [row for row in payload if isinstance(row, dict)]
        if isinstance(payload, dict):
            nested = payload.get("data") or payload.get("rows")
            if isinstance(nested, list):
                return [row for row in nested if isinstance(row, dict)]
            return [payload]
        return []

    reader = csv.DictReader(io.StringIO(body))
    return [dict(row) for row in reader]


@function.defn()
async def phantombuster_launch_agent(
    function_input: PhantomBusterLaunchAgentInput,
) -> PhantomBusterLaunchAgentOutput:
    """Launch a PhantomBuster phantom run for LinkedIn activity extraction."""
    api_key = _get_api_key()
    phantom_id = (
        function_input.phantom_id
        or os.environ.get(
            "PHANTOMBUSTER_ACTIVITY_EXTRACTOR_PHANTOM_ID", ""
        ).strip()
    )
    if not phantom_id:
        raise ValueError(
            "phantom_id is required. Set it explicitly or configure "
            "PHANTOMBUSTER_ACTIVITY_EXTRACTOR_PHANTOM_ID."
        )

    argument = function_input.argument.copy() if function_input.argument else {}
    if function_input.profile_urls:
        argument["profileUrls"] = function_input.profile_urls

    payload: dict[str, Any] = {"id": phantom_id, "argument": argument}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{PHANTOMBUSTER_API_BASE}/agents/launch",
            headers={"X-Phantombuster-Key": api_key},
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    container_id = (
        str(data.get("containerId"))
        if data.get("containerId") is not None
        else None
    )
    status = (
        str(data.get("status")) if data.get("status") is not None else None
    )
    message = (
        str(data.get("message")) if data.get("message") is not None else None
    )

    log.info(
        "phantombuster_launch_agent completed",
        phantom_id=phantom_id,
        container_id=container_id,
        status=status,
    )
    return PhantomBusterLaunchAgentOutput(
        success=True,
        phantom_id=phantom_id,
        container_id=container_id,
        status=status,
        message=message,
    )


@function.defn()
async def phantombuster_fetch_output(
    function_input: PhantomBusterFetchOutputInput,
) -> PhantomBusterFetchOutputOutput:
    """Fetch activity output from PhantomBuster and normalize post rows."""
    api_key = _get_api_key()
    fetch_id = function_input.container_id or function_input.phantom_id
    if not fetch_id:
        raise ValueError(
            "container_id or phantom_id is required to fetch output."
        )

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            f"{PHANTOMBUSTER_API_BASE}/agents/fetch-output",
            headers={"X-Phantombuster-Key": api_key},
            params={"id": fetch_id},
        )
        response.raise_for_status()
        payload = response.json()

    status = (
        str(payload.get("status"))
        if payload.get("status") is not None
        else None
    )
    records: list[dict[str, Any]] = []
    export_url: str | None = None

    output_payload = payload.get("output")
    if isinstance(output_payload, list):
        records = [row for row in output_payload if isinstance(row, dict)]
    elif isinstance(output_payload, dict):
        nested = output_payload.get("data") or output_payload.get("rows")
        if isinstance(nested, list):
            records = [row for row in nested if isinstance(row, dict)]

    result_object = payload.get("resultObject")
    if isinstance(result_object, str) and result_object.strip():
        export_url = result_object.strip()

    if not records and export_url:
        try:
            records = await _read_records_from_export_url(export_url)
        except Exception as e:  # noqa: BLE001
            raise ValueError(
                f"Failed to read PhantomBuster export URL: {e!s}"
            ) from e

    posts = _normalize_posts(records)
    log.info(
        "phantombuster_fetch_output completed",
        fetch_id=fetch_id,
        status=status,
        raw_count=len(records),
        normalized_count=len(posts),
    )
    return PhantomBusterFetchOutputOutput(
        success=True,
        status=status,
        container_id=function_input.container_id,
        posts=posts,
        raw_count=len(records),
        message=(
            "Fetched PhantomBuster output successfully."
            if posts
            else "No activity rows available yet."
        ),
    )
