#!/usr/bin/env python3
"""Verify the MCP URL returns the build agent tools.

Run from repo root or apps/backend with RESTACK_ENGINE_MCP_ADDRESS set:
  cd apps/backend && uv run python scripts/check_mcp_tools.py

Or with explicit URL:
  RESTACK_ENGINE_MCP_ADDRESS=https://your-ngrok-url.ngrok-free.app/mcp uv run python scripts/check_mcp_tools.py

Expected build tools: updatetodos, updatedataset, updateagent, addagenttool,
updateview, updatefile, createsubtask, searchremotemcpdirectory,
updateintegration, listintegrationtools.
"""

import asyncio
import json
import os
import sys

try:
    import aiohttp
except ImportError:
    print("Install aiohttp: uv add aiohttp", file=sys.stderr)
    sys.exit(1)

# Build agent expected tools (from packages/database/admin/postgres-admin.sql)
BUILD_TOOLS = [
    "updatetodos",
    "updatedataset",
    "updateagent",
    "addagenttool",
    "updateview",
    "updatefile",
    "createsubtask",
    "searchremotemcpdirectory",
    "updateintegration",
    "listintegrationtools",
]


def extract_tool_names(result: dict) -> list[str]:
    if "tools" in result and isinstance(result["tools"], list):
        return [
            tool.get("name", "")
            for tool in result["tools"]
            if isinstance(tool, dict) and tool.get("name")
        ]
    return []


async def main() -> None:
    url = os.getenv("RESTACK_ENGINE_MCP_ADDRESS")
    if not url or not url.strip():
        print(
            "Error: Set RESTACK_ENGINE_MCP_ADDRESS (e.g. https://xxx.ngrok-free.app/mcp)",
            file=sys.stderr,
        )
        sys.exit(1)
    url = url.strip().rstrip("/")
    if not url.endswith("/mcp"):
        url = f"{url}/mcp"
    list_url = url

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {},
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-03-26",
    }

    HTTP_OK = 200
    print(f"Requesting tools/list from {list_url} ...")
    try:
        async with aiohttp.ClientSession() as session, session.post(
            list_url,
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            if resp.status != HTTP_OK:
                print(f"HTTP {resp.status}: {await resp.text()}", file=sys.stderr)
                sys.exit(1)
            data = await resp.json()
    except TimeoutError:
        print("Timeout calling MCP URL. Is ngrok running and tunneling to 11233?", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Request failed: {e}", file=sys.stderr)
        sys.exit(1)

    result = data.get("result") if isinstance(data, dict) else None
    if not result:
        print("No 'result' in response. Full response:", json.dumps(data, indent=2)[:500])
        sys.exit(1)

    MAX_NAMES_FULL_DISPLAY = 20
    SAMPLE_SIZE = 15
    names = extract_tool_names(result)
    print(f"Server returned {len(names)} tools.")
    if len(names) <= MAX_NAMES_FULL_DISPLAY:
        print(f"Tool names: {sorted(names)}")
    else:
        print(f"Sample: {sorted(names)[:SAMPLE_SIZE]} ...")

    missing = [t for t in BUILD_TOOLS if t not in names]
    if missing:
        print(
            f"\nMissing build tools ({len(missing)}): {missing}",
            file=sys.stderr,
        )
        print(
            "\nTroubleshooting:",
            file=sys.stderr,
        )
        print(
            "  1. Ensure ngrok is running: ngrok http 11233",
            file=sys.stderr,
        )
        print(
            "  2. RESTACK_ENGINE_MCP_ADDRESS must end with /mcp and point to the Restack engine",
            file=sys.stderr,
        )
        print(
            "  3. Start the MCP server worker so the engine exposes update* tools: from repo root run 'pnpm localdev' (or start apps/mcp_server). The build tools (updateagent, updatedataset, etc.) come from this worker.",
            file=sys.stderr,
        )
        print(
            "  4. Re-seed build agent tools: pnpm db:admin:reset (or db:admin:insert if first time)",
            file=sys.stderr,
        )
        sys.exit(1)

    print("\nAll build tools are available.")
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
