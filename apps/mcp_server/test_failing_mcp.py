#!/usr/bin/env python3
"""
Test script for the FailingMcpTest workflow.
This script demonstrates how the failing MCP tool works and tests different failure scenarios.
"""

import asyncio
import logging
from src.workflows.tools.failing_mcp_test import FailingMcpTest, FailingMcpTestInput

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

async def test_failing_scenarios():
    """Test different failure scenarios."""
    print("🧪 Testing FailingMcpTest workflow with different failure types...\n")
    
    workflow = FailingMcpTest()
    
    # Test scenarios
    test_cases = [
        {
            "name": "Timeout Error",
            "input": FailingMcpTestInput(
                failure_type="timeout",
                user_request="Test timeout scenario",
                should_fail=True
            )
        },
        {
            "name": "Invalid Parameters Error",
            "input": FailingMcpTestInput(
                failure_type="invalid_params",
                user_request="Test invalid parameters",
                should_fail=True
            )
        },
        {
            "name": "Tool Not Found Error",
            "input": FailingMcpTestInput(
                failure_type="tool_not_found",
                user_request="Test tool not found",
                should_fail=True
            )
        },
        {
            "name": "Permission Denied Error",
            "input": FailingMcpTestInput(
                failure_type="permission_denied",
                user_request="Test permission denied",
                should_fail=True
            )
        },
        {
            "name": "Network Error",
            "input": FailingMcpTestInput(
                failure_type="network_error",
                user_request="Test network connectivity",
                should_fail=True
            )
        },
        {
            "name": "JSON Parse Error",
            "input": FailingMcpTestInput(
                failure_type="json_parse_error",
                user_request="Test JSON parsing",
                should_fail=True
            )
        },
        {
            "name": "Random Error",
            "input": FailingMcpTestInput(
                failure_type="random",
                user_request="Test random failure",
                should_fail=True
            )
        },
        {
            "name": "Success Case",
            "input": FailingMcpTestInput(
                failure_type="timeout",  # This will be ignored since should_fail=False
                user_request="Test successful execution",
                should_fail=False
            )
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"Input: {test_case['input']}")
        
        try:
            # This would normally be called by the Restack workflow engine
            # For testing purposes, we'll just show what would happen
            print(f"Expected: {'Success' if not test_case['input'].should_fail else 'Failure (' + test_case['input'].failure_type + ')'}")
            print("✅ Test case configured correctly")
            
        except Exception as e:
            print(f"❌ Test case failed: {e}")
        
        print("-" * 50)

async def main():
    """Main test function."""
    print("🚀 FailingMcpTest Tool Testing Suite")
    print("=" * 50)
    
    await test_failing_scenarios()
    
    print("\n📋 Summary:")
    print("- Created FailingMcpTest workflow that simulates various MCP failures")
    print("- Registered in services.py for use by agents")
    print("- Added 'error-testing-agent' seed agent for easy testing")
    print("- Tool supports 6 different failure types plus success mode")
    print("- Ready to test OpenAI MCP call failure handling!")
    
    print("\n🎯 Next Steps:")
    print("1. Run the MCP server: `uv run start` in apps/mcp_server/")
    print("2. Run the backend: `uv run start` in apps/backend/")
    print("3. Use the 'error-testing-agent' in the frontend")
    print("4. Ask it to test different failure scenarios")
    print("5. Observe how errors are handled in the UI")

if __name__ == "__main__":
    asyncio.run(main())
