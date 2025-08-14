#!/usr/bin/env python3
"""Test webhook endpoints with sample payloads."""
import json
import requests

# Configuration
WEBHOOK_BASE_URL = "http://localhost:8000"
WORKSPACE_ID = "c926e979-1f16-46bf-a7cc-8aab70162d65"
AGENT_NAME = "websearch"

def test_github_webhook():
    """Test GitHub pull request webhook."""
    print("🔄 Testing GitHub webhook...")
    
    url = f"{WEBHOOK_BASE_URL}/webhook/workspace/{WORKSPACE_ID}/agent/{AGENT_NAME}"
    
    payload = {
        "action": "opened",
        "number": 123,
        "pull_request": {
            "title": "Add new search feature",
            "body": "This PR adds a new search feature to the application",
            "user": {
                "login": "developer"
            }
        },
        "repository": {
            "name": "my-repo",
            "full_name": "org/my-repo"
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-GitHub-Event": "pull_request",
        "User-Agent": "GitHub-Hookshot/123"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_linear_webhook():
    """Test Linear issue webhook."""
    print("\n🔄 Testing Linear webhook...")
    
    url = f"{WEBHOOK_BASE_URL}/webhook/workspace/{WORKSPACE_ID}/agent/{AGENT_NAME}"
    
    payload = {
        "type": "Issue",
        "action": "create",
        "data": {
            "id": "issue-123",
            "title": "Bug: Search not working properly",
            "description": "Users are reporting that search is not returning correct results",
            "state": {
                "name": "Todo"
            },
            "assignee": {
                "name": "John Doe"
            }
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Linear-Webhook/1.0"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_custom_webhook():
    """Test custom webhook with title and description."""
    print("\n🔄 Testing custom webhook...")
    
    url = f"{WEBHOOK_BASE_URL}/webhook/workspace/{WORKSPACE_ID}/agent/{AGENT_NAME}"
    
    payload = {
        "title": "Custom Task: Investigate Performance Issue",
        "description": "User reported that the search feature is taking too long to respond. Please investigate and optimize if needed."
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_health_check():
    """Test health check endpoint."""
    print("\n🔄 Testing health check...")
    
    url = f"{WEBHOOK_BASE_URL}/health"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Testing Webhook Server")
    print(f"📍 Base URL: {WEBHOOK_BASE_URL}")
    print(f"🏢 Workspace: {WORKSPACE_ID}")
    print(f"🤖 Agent: {AGENT_NAME}")
    print("="*50)
    
    test_health_check()
    test_github_webhook()
    test_linear_webhook()
    test_custom_webhook()
    
    print("\n✨ Testing complete!")

