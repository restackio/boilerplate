# Slack Bot Setup

Connect your Restack boilerplate to Slack. Three modes are available:

- **Socket Mode** (default) — you create your own Slack app and connect directly via WebSocket. Best for self-hosted deployments.
- **HTTP Mode** — events are forwarded by the Restack Central Router. The end user clicks "Add to Slack" and everything is wired automatically. Best for managed deployments on Restack Cloud.
- **Integrated Router** (one-click) — the boilerplate itself acts as the router, handling OAuth, multi-workspace installs, and per-channel agent routing. No external router service needed.

---

## Mode 1: Socket Mode (self-managed Slack app)

### 1. Create the Slack App

Click the link below to create a pre-configured Slack app from the included manifest:

**[Create Slack App from Manifest](https://api.slack.com/apps?new_app=1&manifest_json=%7B%22display_information%22%3A%7B%22name%22%3A%22Restack%22%2C%22description%22%3A%22AI%20agent%20integration%20for%20your%20workspace%22%2C%22background_color%22%3A%22%236c48fa%22%7D%2C%22features%22%3A%7B%22app_home%22%3A%7B%22home_tab_enabled%22%3Afalse%2C%22messages_tab_enabled%22%3Atrue%2C%22messages_tab_read_only_enabled%22%3Afalse%7D%2C%22bot_user%22%3A%7B%22display_name%22%3A%22Restack%22%2C%22always_online%22%3Atrue%7D%2C%22slash_commands%22%3A%5B%7B%22command%22%3A%22%2Frestack-list%22%2C%22description%22%3A%22View%20your%20tasks%22%2C%22usage_hint%22%3A%22%22%2C%22should_escape%22%3Afalse%7D%5D%7D%2C%22oauth_config%22%3A%7B%22scopes%22%3A%7B%22bot%22%3A%5B%22app_mentions%3Aread%22%2C%22channels%3Ahistory%22%2C%22channels%3Aread%22%2C%22chat%3Awrite%22%2C%22chat%3Awrite.public%22%2C%22commands%22%2C%22im%3Ahistory%22%2C%22im%3Aread%22%2C%22im%3Awrite%22%2C%22reactions%3Aread%22%2C%22reactions%3Awrite%22%2C%22users%3Aread%22%5D%7D%7D%2C%22settings%22%3A%7B%22event_subscriptions%22%3A%7B%22bot_events%22%3A%5B%22app_mention%22%2C%22message.channels%22%2C%22message.im%22%5D%7D%2C%22interactivity%22%3A%7B%22is_enabled%22%3Atrue%7D%2C%22org_deploy_enabled%22%3Afalse%2C%22socket_mode_enabled%22%3Atrue%2C%22token_rotation_enabled%22%3Afalse%7D%7D)**

This opens the Slack app creation wizard with all scopes, events, and Socket Mode pre-configured.

### 2. Copy Tokens

After creating the app, gather 3 values:

| Token | Where to find it |
|---|---|
| `SLACK_BOT_TOKEN` | **OAuth & Permissions** > Install to Workspace > copy the **Bot User OAuth Token** (`xoxb-...`) |
| `SLACK_APP_TOKEN` | **Basic Information** > App-Level Tokens > Generate Token (scope: `connections:write`) > copy the token (`xapp-...`) |
| `SLACK_SIGNING_SECRET` | **Basic Information** > App Credentials > **Signing Secret** |

### 3. Configure Environment

Add the tokens to your `.env` file (in the boilerplate root):

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
DEFAULT_WORKSPACE_ID=your-workspace-uuid
```

`DEFAULT_WORKSPACE_ID` is the UUID of the workspace you created in the Restack dashboard.

**Important:** `SLACK_BOT_TOKEN` must be set on both the slack-bot _and_ the backend. The backend uses it to stream agent responses back to Slack via `slack_callback.py`.

---

## Mode 2: HTTP Mode (central router integration)

When deployed with the Restack Central Router, end users get a one-click "Add to Slack" experience. The router owns the Slack app, handles OAuth, and forwards events to your deployment.

### Configuration

```
SLACK_EVENT_MODE=http
SLACK_ROUTER_API_KEY=your-shared-secret
SLACK_HTTP_PORT=3002
```

| Variable | Description |
|---|---|
| `SLACK_EVENT_MODE` | Set to `http` to enable HTTP receiver mode (default: `socket`) |
| `SLACK_ROUTER_API_KEY` | Shared secret for authenticating events from the central router |
| `SLACK_HTTP_PORT` | Port for the HTTP event receiver (default: `3002`) |

In HTTP mode, `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are **not needed** — the bot token is sent per-request by the router (supporting multi-workspace).

### How it works

1. The deployment registers with the central router at startup (or from the frontend's Integrations page)
2. The router provides an "Add to Slack" OAuth URL
3. When a user installs the app, the router stores the workspace mapping
4. Incoming Slack events are forwarded to your deployment's `/slack/events` endpoint
5. Your bot processes the event and streams responses directly to Slack

---

## Mode 3: Integrated Router (one-click)

In this mode, the boilerplate handles everything end-to-end — OAuth installation, multi-workspace support, and channel→agent routing — without an external central router service.

### How the OAuth flow works

1. A workspace admin clicks **"Add to Slack"** on the frontend Integrations page
2. They are redirected to Slack's OAuth consent screen using `SLACK_CLIENT_ID`
3. After approval, Slack redirects back to `SLACK_HTTP_BASE_URL/slack/oauth/callback`
4. The boilerplate exchanges the code for a bot token using `SLACK_CLIENT_SECRET` and stores the installation in the database
5. A public **#restack-agents** channel is created (or the bot joins it, if that name already exists and the channel is visible to the bot)
6. The admin configures **channel→agent mappings** in the frontend (e.g., `#support` → Customer Support Agent, `#engineering` → Code Review Agent)
7. Incoming Slack events hit the bot's HTTP endpoint, the channel router looks up the mapping, and dispatches to the correct agent

### OAuth v2 best practices (Slack)

The flow follows Slack’s [Installing with OAuth](https://docs.slack.dev/authentication/installing-with-oauth/) guide. Notable points this boilerplate adheres to:

- **One `redirect_uri` for the whole flow** — The same URL is used in the “Add to Slack” link (`/oauth/v2/authorize`) and in the `oauth.v2.access` call. A mismatch returns `bad_redirect_uri` from Slack. It must also appear under your app’s **OAuth & Permissions → Redirect URLs** (or as a subpath of a listed URL).
- **HTTPS in production** — Use `https://` for your public `SLACK_HTTP_BASE_URL` and frontend URLs in production, as required for redirect URLs.
- **`state`** — We pass an encoded value that carries the platform workspace id (and optional same-origin return URL for the browser). The callback requires a decodable `state` with a workspace id before continuing; treat production hardening (e.g. a signed or server-stored `state` nonce) as a follow-up if you need stricter CSRF protection than encoding alone.
- **User-visible result** — After a successful (or failed) install, the user is redirected to the app with `slack_connected` or `slack_error` in the query string, instead of a dead-end HTML page, so the outcome is obvious (recommended in the same doc).

### Configuration

```
SLACK_EVENT_MODE=http
SLACK_CLIENT_ID=your-slack-app-client-id
SLACK_CLIENT_SECRET=your-slack-app-client-secret
SLACK_HTTP_BASE_URL=https://your-domain.com
SLACK_HTTP_PORT=3002
```

| Variable | Description |
|---|---|
| `SLACK_EVENT_MODE` | Set to `http` to enable the integrated HTTP receiver |
| `SLACK_CLIENT_ID` | OAuth Client ID from your Slack app's **Basic Information** page |
| `SLACK_CLIENT_SECRET` | OAuth Client Secret from your Slack app's **Basic Information** page |
| `SLACK_HTTP_BASE_URL` | Public base URL of your deployment (used for OAuth redirects and event subscriptions) |
| `SLACK_HTTP_PORT` | Port for the HTTP event receiver (default: `3002`) |

In this mode, `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are **not needed** — the bot token is obtained per-workspace via OAuth and stored in the database.

### Slack App Setup (HTTP mode manifest)

Use this manifest when creating a Slack app for HTTP / Integrated Router mode. Replace `https://your-domain.com` with your actual deployment URL.

```json
{
  "display_information": {
    "name": "Restack",
    "description": "AI agent integration for your workspace",
    "background_color": "#6c48fa"
  },
  "features": {
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "bot_user": {
      "display_name": "Restack",
      "always_online": true
    },
    "slash_commands": [
      {
        "command": "/restack-list",
        "url": "https://your-domain.com/slack/commands",
        "description": "View your tasks",
        "usage_hint": "",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "redirect_urls": [
      "https://your-domain.com/slack/oauth/callback"
    ],
    "scopes": {
      "bot": [
        "app_mentions:read",
        "channels:history",
        "channels:join",
        "channels:manage",
        "channels:read",
        "chat:write",
        "chat:write.public",
        "commands",
        "im:history",
        "im:read",
        "im:write",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://your-domain.com/slack/events",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "message.channels",
        "message.im"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://your-domain.com/slack/interactions"
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

Key differences from the Socket Mode manifest:
- `socket_mode_enabled` is `false`
- `event_subscriptions.request_url` and `interactivity.request_url` point to your deployment
- `oauth_config.redirect_urls` is set for the OAuth callback
- `app_home.home_tab_enabled` is `true` (supports the App Home tab)
- Subscribes to `app_home_opened` event in addition to existing events
- Slash command has a `url` instead of relying on Socket Mode dispatch

---

## Running

### Development

The slack-bot starts automatically with `pnpm dev` (via Turborepo). If tokens are not set, it logs a warning and idles.

To run standalone:

```bash
cd apps/slack-bot
uv sync
uv run dev
```

### Production

Each app in the boilerplate has its own Dockerfile and is deployed independently. The slack-bot is optional — if deployed without credentials configured, it exits cleanly with code 0 (no resources wasted).

**Socket Mode:**

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

Socket Mode uses a WebSocket connection, so no public URL or ingress is needed.

**HTTP Mode:**

```bash
docker build -t slack-bot ./apps/slack-bot
docker run -e SLACK_EVENT_MODE=http \
           -e SLACK_ROUTER_API_KEY=... \
           -e SLACK_HTTP_PORT=3002 \
           -e DEFAULT_WORKSPACE_ID=... \
           -e RESTACK_ENGINE_ADDRESS=... \
           -e DATABASE_URL=... \
           -p 3002:3002 \
           slack-bot
```

HTTP Mode requires the port to be exposed and reachable by the central router.

Make sure the backend container also has `SLACK_BOT_TOKEN` set (in Socket Mode) or is configured to accept per-request tokens (in HTTP Mode).

---

## How It Works

- **@mention in a channel** — Creates a task, auto-selects the best agent, replies in thread
- **DM the bot** — Same flow but in a direct message thread
- **Thread replies** — Forwarded to the running agent as follow-up messages
- **Task completion** — Agent results stream back into the Slack thread
- `/restack-list` — Links to the dashboard

## Architecture

**Socket Mode:**
```
Slack (WebSocket) <-> Slack Bot <-> Restack Engine <-> Backend Workflows <-> Agents
                                                            |
                                                            v
                                                   slack_callback.py
                                                   (posts results back)
```

**HTTP Mode (Central Router):**
```
Slack -> Central Router -> Slack Bot (HTTP) -> Restack Engine -> Backend -> Agents
                                                                    |
                                                                    v
                                                           slack_callback.py
                                                           (posts directly to Slack API)
```

**Integrated Router:**
```
Slack → Slack Bot (HTTP mode) → channel_router → Database lookup
  → agent_id found → create task → Restack Engine → Agent → Slack API
```
