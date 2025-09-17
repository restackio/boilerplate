# MCP Server

Model Context Protocol server for external tool integrations and API connections.

## Quick start

```bash
# Development with hot reload
pnpm dev

# Production mode
pnpm start
```

## Features

- **Tool Registry**: Auto-discovery of Python functions as workflow tools
- **External APIs**: Weather, Slack, email, and other service integrations
- **Type Safety**: Pydantic schemas for input/output validation
- **Async Operations**: Non-blocking API calls for better performance

## Architecture

```
src/
├── functions/          # Tool implementations  
├── schemas/            # Pydantic validation schemas
└── services.py         # MCP protocol server
```

## Adding tools

Create a new tool function:

```python
# src/functions/my_tool.py
async def my_tool(param: str) -> dict:
    """Tool description for the workflow editor"""
    # Your integration logic here
    return {"result": "success"}
```

The MCP server automatically discovers and registers all functions as tools.

## Example tools

### Weather service
```python
async def get_weather(city: str) -> dict:
    """Get current weather for a city"""
    response = await weather_api.get(f"/current?q={city}")
    return {
        "city": city,
        "temperature": response["temp"],
        "description": response["weather"][0]["description"]
    }
```

### Slack notifications
```python
async def send_slack_message(channel: str, message: str) -> bool:
    """Send a message to a Slack channel"""
    payload = {"channel": channel, "text": message}
    response = await slack_client.post("/chat.postMessage", json=payload)
    return response.status_code == 200
```

## Development

```bash
# Install dependencies
uv sync

# Start development server
uv run dev

# Test tools endpoint
curl http://localhost:8001/tools
```

## Configuration

Set environment variables:
```bash
OPENAI_API_KEY=your_key
SLACK_BOT_TOKEN=your_token
WEATHER_API_KEY=your_key
```
