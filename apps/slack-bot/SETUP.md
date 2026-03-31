# Slack Bot Setup

Connect your Restack boilerplate to Slack in 3 steps.

## 1. Create the Slack App

Click the link below to create a pre-configured Slack app from the included manifest:

**[Create Slack App from Manifest](https://api.slack.com/apps?new_app=1&manifest_json=%7B%22display_information%22%3A%7B%22name%22%3A%22Restack%22%2C%22description%22%3A%22AI%20agent%20integration%20for%20your%20workspace%22%2C%22background_color%22%3A%22%236c48fa%22%7D%2C%22features%22%3A%7B%22app_home%22%3A%7B%22home_tab_enabled%22%3Afalse%2C%22messages_tab_enabled%22%3Atrue%2C%22messages_tab_read_only_enabled%22%3Afalse%7D%2C%22bot_user%22%3A%7B%22display_name%22%3A%22Restack%22%2C%22always_online%22%3Atrue%7D%2C%22slash_commands%22%3A%5B%7B%22command%22%3A%22%2Frestack-list%22%2C%22description%22%3A%22View%20your%20tasks%22%2C%22usage_hint%22%3A%22%22%2C%22should_escape%22%3Afalse%7D%5D%7D%2C%22oauth_config%22%3A%7B%22scopes%22%3A%7B%22bot%22%3A%5B%22app_mentions%3Aread%22%2C%22channels%3Ahistory%22%2C%22channels%3Aread%22%2C%22chat%3Awrite%22%2C%22chat%3Awrite.public%22%2C%22commands%22%2C%22im%3Ahistory%22%2C%22im%3Aread%22%2C%22im%3Awrite%22%2C%22reactions%3Aread%22%2C%22reactions%3Awrite%22%2C%22users%3Aread%22%5D%7D%7D%2C%22settings%22%3A%7B%22event_subscriptions%22%3A%7B%22bot_events%22%3A%5B%22app_mention%22%2C%22message.channels%22%2C%22message.im%22%5D%7D%2C%22interactivity%22%3A%7B%22is_enabled%22%3Atrue%7D%2C%22org_deploy_enabled%22%3Afalse%2C%22socket_mode_enabled%22%3Atrue%2C%22token_rotation_enabled%22%3Afalse%7D%7D)**

This opens the Slack app creation wizard with all scopes, events, and Socket Mode pre-configured.

## 2. Copy Tokens

After creating the app, gather 3 values:

| Token | Where to find it |
|---|---|
| `SLACK_BOT_TOKEN` | **OAuth & Permissions** > Install to Workspace > copy the **Bot User OAuth Token** (`xoxb-...`) |
| `SLACK_APP_TOKEN` | **Basic Information** > App-Level Tokens > Generate Token (scope: `connections:write`) > copy the token (`xapp-...`) |
| `SLACK_SIGNING_SECRET` | **Basic Information** > App Credentials > **Signing Secret** |

## 3. Configure Environment

Add the tokens to your `.env` file (in the boilerplate root):

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
DEFAULT_WORKSPACE_ID=your-workspace-uuid
```

`DEFAULT_WORKSPACE_ID` is the UUID of the workspace you created in the Restack dashboard.

**Important:** `SLACK_BOT_TOKEN` must be set on both the slack-bot _and_ the backend. The backend uses it to stream agent responses back to Slack via `slack_callback.py`.

## Running

### Development

The slack-bot starts automatically with `pnpm dev` (via Turborepo). If Slack tokens are not set, it logs a warning and idles.

To run standalone:

```bash
cd apps/slack-bot
uv sync
uv run dev
```

### Production

Each app in the boilerplate has its own Dockerfile and is deployed independently. The slack-bot is optional -- if deployed without Slack tokens configured, it exits cleanly with code 0 (no resources wasted).

```bash
docker build -t slack-bot ./apps/slack-bot
docker run -e SLACK_BOT_TOKEN=xoxb-... \
           -e SLACK_APP_TOKEN=xapp-... \
           -e SLACK_SIGNING_SECRET=... \
           -e DEFAULT_WORKSPACE_ID=... \
           -e RESTACK_ENGINE_ADDRESS=... \
           -e DATABASE_URL=... \
           slack-bot
```

Make sure the backend container also has `SLACK_BOT_TOKEN` set.

Socket Mode uses a WebSocket connection, so no public URL or ingress is needed for the slack-bot -- even in production.

## How It Works

- **@mention in a channel** -- Creates a task, auto-selects the best agent, replies in thread
- **DM the bot** -- Same flow but in a direct message thread
- **Thread replies** -- Forwarded to the running agent as follow-up messages
- **Task completion** -- Agent results stream back into the Slack thread
- `/restack-list` -- Links to the dashboard

## Architecture

```
Slack (Socket Mode) <-> Slack Bot <-> Restack Engine <-> Backend Workflows <-> Agents
                                                              |
                                                              v
                                                     slack_callback.py
                                                     (posts results back)
```

The bot uses Socket Mode (WebSocket) so no public URL or ngrok is needed.
