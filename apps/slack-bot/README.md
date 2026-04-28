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

### 1b. Subscribe to lifecycle events (so "Connected" status stays honest)

Under **Event Subscriptions → Subscribe to bot events**, make sure both are listed:

- `app_uninstalled` — fires when an admin removes the app from the workspace
- `tokens_revoked` — fires when the bot token is revoked

Without these, removing the app from Slack leaves the row in
`channel_integrations` (with `channel_type='slack'`) and the dashboard keeps
showing the workspace as "Connected". Neither event needs extra OAuth scopes.

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

## Future work

### Multiple agents per Slack channel (many-to-one)

Today the system enforces a **one-to-one** mapping between a Slack channel and an
agent at runtime: `channel_route_event` in
`apps/backend/src/functions/channels_crud.py` uses `scalar_one_or_none()` when
looking up the channel→agent mapping, so if more than one `channels` row ever
existed for the same external channel the lookup would raise
`MultipleResultsFound` and fail the event.

The underlying schema (`packages/database/migrations/postgres/016_slack_integration.sql`)
does **not** prevent multiple different agents from being mapped to the same
channel — its unique constraint is
`(channel_integration_id, external_channel_id, agent_id)`, which only blocks
exact duplicates. So the one-to-one property is enforced by the routing code,
not by the data model.

Planned direction: **allow composing multiple agents in a single channel.** The
rough outline:

- Remove the `scalar_one_or_none()` assumption in `channel_route_event` and
  return the list of matching agents instead of a single one.
- Decide and implement a multi-agent UX for incoming messages. Options:
  - **Picker** – render a Block Kit selector so the user chooses which agent to
    route the message to.
  - **LLM-routed (concierge)** – let the concierge LLM pick the best agent based
    on the message + agent descriptions, then hand off.
  - **Fan-out** – send the message to every mapped agent in parallel and post
    their replies as threaded responses.
- Update the Slack settings UI and the concierge `configure_channel_agent` tool
  to allow adding additional agents to a channel that already has one, rather
  than replacing.

Tracked here so we don't forget — for Phase 1 we're intentionally staying
one-to-one to keep the concierge and UI mental model simple.

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE).

