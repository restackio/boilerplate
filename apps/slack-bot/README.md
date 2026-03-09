# Slack Bot

Two-way Slack integration for AI agent platform with real-time task sync.

## Quick start

```bash
# Development with hot reload
pnpm dev

# Production mode
pnpm start
```

## Features

- **Two-Way Sync**: Slack messages ↔ Platform tasks
- **Assistant Threads**: Dedicated side panel for AI conversations
- **Real-time Updates**: Task completions notify Slack channels
- **Slash Commands**: `/ask-agent` to query agents directly
- **Thread Context**: Maintain conversation context in Slack threads

## Architecture

### Incoming (Slack → Platform)
1. User messages in Slack → Create tasks
2. Slash commands → Execute agent workflows
3. Assistant threads → Interactive AI conversations

### Outgoing (Platform → Slack)
1. Task completions → Post to Slack channel/thread
2. Agent responses → Stream to Slack
3. Status updates → Update Slack message

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Slack     │ ──────→ │  Slack Bot   │ ──────→ │  Backend    │
│  Messages   │         │  (Bolt)      │         │  (Restack)  │
└─────────────┘         └──────────────┘         └─────────────┘
                               ↑                         │
                               │                         │
                               └─────────────────────────┘
                                  Task Completion
                                    Callbacks
```

## Setup

### 1. Create Slack App

1. Go to https://api.slack.com/apps/new
2. Select **From an app manifest**
3. Choose your workspace
4. Paste contents of `manifest.json`
5. Click **Create** then **Install to Workspace**

### 2. Environment Variables

Create `.env` file:

```bash
# Slack credentials
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret

# Backend connection
RESTACK_ENGINE_ID=local
RESTACK_ENGINE_ADDRESS=127.0.0.1:5233
RESTACK_ENGINE_API_KEY=your_api_key

# Optional: Default workspace
DEFAULT_WORKSPACE_ID=your-workspace-id
```

### 3. Get Slack Tokens

**Bot Token:**
1. Go to **OAuth & Permissions**
2. Copy **Bot User OAuth Token** → `SLACK_BOT_TOKEN`

**App Token:**
1. Go to **Basic Information**
2. Under **App-Level Tokens**, click **Generate Token and Scopes**
3. Add `connections:write` scope
4. Copy token → `SLACK_APP_TOKEN`

**Signing Secret:**
1. Go to **Basic Information**
2. Copy **Signing Secret** → `SLACK_SIGNING_SECRET`

## Usage

### Direct Messages
Message `@YourBot` directly to create tasks:
```
@YourBot analyze this bug report: users can't login
```

### Slash Commands
Use `/ask-agent` in any channel:
```
/ask-agent What's the status of the customer support queue?
```

### Assistant Threads
1. Open your bot in the sidebar
2. Click **Messages** tab
3. Start chatting with AI assistant

### Channel Mentions
Mention the bot in channels to create tasks:
```
@YourBot summarize this discussion
```

## Development

### Local Setup
```bash
# Install dependencies
uv sync

# Start development server
uv run dev

# Test connection
curl http://localhost:3000/health
```

### Project Structure
```
src/
├── app.py              # Main Bolt app setup
├── client.py           # Restack client connection
├── server.py           # Server entry point
├── listeners/          # Slack event listeners
│   ├── assistant/      # Assistant thread handlers
│   ├── commands/       # Slash command handlers
│   ├── events/         # Event handlers (messages, etc)
│   └── shortcuts/      # Shortcut handlers
└── utils/              # Helper functions
    ├── formatters.py   # Message formatting
    └── slack_notifier.py # Send updates to Slack
```

## Integration with Backend

### Creating Tasks from Slack
When a user messages the bot, it creates a task via `TasksCreateWorkflow`:

```python
result = await client.schedule_workflow(
    workflow_name="TasksCreateWorkflow",
    workflow_id=f"slack_task_{message_ts}",
    workflow_input={
        "workspace_id": workspace_id,
        "title": f"Slack: {user_name}",
        "description": message_text,
        "agent_name": agent_name,
    }
)
```

### Sending Updates to Slack
Backend workflows can notify Slack using the MCP function:

```python
# In any workflow
await workflow.step(
    function=send_slack_notification,
    function_input={
        "channel": channel_id,
        "thread_ts": thread_ts,
        "text": "Task completed!",
        "blocks": [...] # Rich formatting
    }
)
```

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE).

