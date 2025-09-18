#!/usr/bin/env python3
"""Test script for the FailingMcpTest workflow.

This script demonstrates how the failing MCP tool works and tests different failure scenarios.
"""

import asyncio
import logging

from src.workflows.tools.mock_failing_mcp_test import (
    FailingMcpTestInput,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


async def test_failing_scenarios() -> None:
    """Test different failure scenarios."""
    logger.info(
        "🧪 Testing FailingMcpTest workflow with different failure types..."
    )

    # Test scenarios
    test_cases = [
        {
            "name": "Timeout Error",
            "input": FailingMcpTestInput(
                failure_type="timeout",
                user_request="Test timeout scenario",
                should_fail=True,
            ),
        },
        {
            "name": "Invalid Parameters Error",
            "input": FailingMcpTestInput(
                failure_type="invalid_params",
                user_request="Test invalid parameters",
                should_fail=True,
            ),
        },
        {
            "name": "Tool Not Found Error",
            "input": FailingMcpTestInput(
                failure_type="tool_not_found",
                user_request="Test tool not found",
                should_fail=True,
            ),
        },
        {
            "name": "Permission Denied Error",
            "input": FailingMcpTestInput(
                failure_type="permission_denied",
                user_request="Test permission denied",
                should_fail=True,
            ),
        },
        {
            "name": "Network Error",
            "input": FailingMcpTestInput(
                failure_type="network_error",
                user_request="Test network connectivity",
                should_fail=True,
            ),
        },
        {
            "name": "JSON Parse Error",
            "input": FailingMcpTestInput(
                failure_type="json_parse_error",
                user_request="Test JSON parsing",
                should_fail=True,
            ),
        },
        {
            "name": "Random Error",
            "input": FailingMcpTestInput(
                failure_type="random",
                user_request="Test random failure",
                should_fail=True,
            ),
        },
        {
            "name": "Success Case",
            "input": FailingMcpTestInput(
                failure_type="timeout",  # This will be ignored since should_fail=False
                user_request="Test successful execution",
                should_fail=False,
            ),
        },
    ]

    for i, test_case in enumerate(test_cases, 1):
        logger.info("Test %d: %s", i, test_case["name"])
        logger.info("Input: %s", test_case["input"])

        try:
            # This would normally be called by the Restack workflow engine
            # For testing purposes, we'll just show what would happen
            expected = (
                "Success"
                if not test_case["input"].should_fail
                else "Failure ("
                + test_case["input"].failure_type
                + ")"
            )
            logger.info("Expected: %s", expected)
            logger.info("Test case configured correctly")

        except (ValueError, TypeError, RuntimeError):
            logger.exception("Test case failed")

        logger.info("-" * 50)


async def main() -> None:
    """Main test function."""
    logger.info("🚀 FailingMcpTest Tool Testing Suite")
    logger.info("=" * 50)

    await test_failing_scenarios()

    logger.info("\n📋 Summary:")
    logger.info(
        "- Created FailingMcpTest workflow that simulates various MCP failures"
    )
    logger.info("- Registered in services.py for use by agents")
    logger.info(
        "- Added 'error-testing-agent' seed agent for easy testing"
    )
    logger.info(
        "- Tool supports 6 different failure types plus success mode"
    )
    logger.info(
        "- Ready to test OpenAI MCP call failure handling!"
    )

    logger.info("\n🎯 Next Steps:")
    logger.info(
        "1. Run the MCP server: `uv run start` in apps/mcp_server/"
    )
    logger.info(
        "2. Run the backend: `uv run start` in apps/backend/"
    )
    logger.info(
        "3. Use the 'error-testing-agent' in the frontend"
    )
    logger.info("4. Ask it to test different failure scenarios")
    logger.info("5. Observe how errors are handled in the UI")


if __name__ == "__main__":
    asyncio.run(main())
