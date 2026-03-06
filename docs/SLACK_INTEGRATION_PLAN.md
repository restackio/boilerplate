# Slack Integration Plan (Opinionated)

**Goal:** Slack as the **full interface** for agent tasks. Users can create tasks, see streaming results, check status, and reply in thread—without opening the boilerplate UI. Configuration is **agent-centric**: each agent is tied to one or more Slack channels so that channel traffic and tasks are scoped to that agent.

---

## 1. Vision: Slack as first-class interface

| Action              | Where it happens                                    | Result                                                                                                |
| ------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Create task         | DM, channel mention, slash command, Assistant panel | Task created; thread becomes the task’s Slack thread                                                  |
| Stream result       | Backend → Slack                                     | Same streaming experience as in the web UI (Slack `chat.startStream` / `appendStream` / `stopStream`) |
| See status          | Thread                                              | Status updates (and optional 👀 ack) in the same thread                                               |
| Reply               | Thread reply                                        | Treated as new user message; agent continues in that task                                             |
| List / filter tasks | Slash command or DM                                 | e.g. `/restack-list` shows tasks (optionally scoped to channel/agent)                                 |

No requirement to open the boilerplate UI for the core loop: create → stream → status → reply.

---

## 2. Agent-level Slack channel configuration

**Opinionated choice:** Slack behavior is configured **per agent**, not only per workspace.

- Each **agent** has an optional **Slack config**:
  - **Slack channel(s)** where this agent “lives” (e.g. `#support-agent`, `#data-requests`).
  - Optional: **default channel** for posting when the task wasn’t created from Slack (e.g. scheduled tasks).
- **Routing rules:**
  - If the message comes from a **channel that is linked to an agent** → use that agent for the new task (no picker).
  - If the message is in a **DM or unlinked channel** → show agent picker or use workspace default agent.
- One channel can be linked to one agent only (1:1 or N:1 channel→agent). One agent can have multiple channels.

**Data model (recommended):**

- **Agent**
  - Add optional `slack_config` (JSONB), e.g.:
    - `slack_channel_ids: string[]` — channel IDs where this agent is the default.
    - `slack_default_channel_id: string | null` — where to post for non–Slack-origin tasks (e.g. scheduled).
- **Task**
  - Persist Slack context so the backend can stream and notify:
  - Add `metadata` (JSONB) on Task with:
    - `slack_channel`, `slack_thread_ts`, `slack_user_id`, `slack_team_id`, `slack_message_ts` (and optionally `source`: `dm | mention | slash | assistant`).

**Backend / API:**

- CRUD for agents includes reading/writing `slack_config`.
- Task create/update accepts and stores `metadata` (including Slack fields); `TasksCreateWorkflow` passes it through and it is persisted in DB.

**Frontend (boilerplate UI):**

- Agent settings: section “Slack” with:
  - “Linked channels” (e.g. paste channel IDs or pick from connected Slack; at least one channel ID list).
  - Optional “Default Slack channel” for posting when task is not created from Slack.

### 2.1 Leveraging the official Slack MCP server for routing

**Idea:** The agent can use the [official Slack MCP server](https://docs.slack.dev/ai/slack-mcp-server/) as a **tool** to discover channels, resolve “where to post”, and optionally read Slack context—instead of relying only on static `slack_config` in the DB.

- **Slack MCP** exposes tools such as:

  - **Search channels** — find channels by name/description (public and private the app can see).
  - **Search users** — find users by name/email.
  - **Read channel / Read thread** — get message history for context.
  - **Send message** — post to a channel or thread.
  - **Draft message** — prepare formatted messages.

- **How the agent can use it for routing:**

  - When the agent needs to “post to Slack” (e.g. for a task created outside Slack, or to broadcast a result), it can call Slack MCP **search_channels** (and optionally **search_users**) to choose the right channel (e.g. “#support”, “#data-requests”) based on task content or instructions.
  - Agent instructions can say e.g. “Use Slack MCP to find the appropriate channel for this task and send the summary there.”
  - So **routing is agent-driven**: the agent decides the channel using MCP tools; we don’t need to hard-code every channel in `slack_config` (though we can still use `slack_config` as a default or hint).

- **Integration options:**

  1. **Expose Slack MCP as an agent tool** — Add the Slack MCP server as an MCP server / tool source for the agent in the boilerplate. The agent then has “search Slack channels”, “send Slack message”, etc. available and can reason about where to route.
  2. **Hybrid** — Keep `slack_config` (linked channels, default channel) for **inbound** routing (which agent owns a channel when a message arrives). Use **Slack MCP** for **outbound** routing when the agent proactively chooses a channel (e.g. “post this result to the best channel”) or needs to read Slack context.

- **Requirements:** Slack MCP uses OAuth (user or bot token); the workspace must have approved the app. Our backend or runtime must connect the agent to the Slack MCP server (e.g. via MCP client or a wrapper tool that calls Slack MCP). Same Slack app we use for the Bolt bot can back the MCP connection so channels/users are consistent.

**Recommendation:** Implement agent-level `slack_config` for **inbound** (message in channel X → agent A). Add **Slack MCP as an agent tool** so the agent can **discover and choose channels** for outbound posts and for context (read channel/thread). That way routing can be both configured and intelligent.

---

## 3. End-to-end flows (opinionated)

### 3.1 Create task from Slack

- **Triggers:** DM to bot, `@bot` in channel, slash (e.g. `/restack-new`, `/ask-agent`), Assistant panel message.
- **Routing:**
  - If in a **linked channel** → agent = agent for that channel; create task immediately (optional: quick “Creating task for Agent X” in thread).
  - Else → show **agent picker** (blocks with agent list) or use workspace default; then create task.
- **Slack bot (Bolt):**
  - On create, call `TasksCreateWorkflow` with:
    - `workspace_id` (from Slack team → workspace mapping, e.g. OAuth or `DEFAULT_WORKSPACE_ID`),
    - `agent_id` or `agent_name`,
    - `title` / `description` from message,
    - `metadata`: `{ slack_channel, slack_thread_ts, slack_user_id, slack_team_id, slack_message_ts, source }`.
- **Backend:**
  - `TaskCreateInput` (or equivalent) accepts `metadata`; `tasks_create` persists it on Task.
  - Task is created; agent run starts. Downstream steps use `task.metadata` for Slack.

### 3.2 Stream result to Slack

- **When:** Task has `metadata.slack_channel` and `metadata.slack_thread_ts` and the agent produces LLM output.
- **Where:** Same thread as the trigger message.
- **How (opinionated):**
  - **Option A (preferred):** Backend (or MCP) holds Slack bot token; when the task has Slack context, the LLM stream is teed to Slack:
    - Before first token: call Slack `chat.startStream` (or Bolt `client.chat_stream()`), store `stream_ts`.
    - For each delta: call `chat.appendStream` with `stream_ts`.
    - On stream end: call `chat.stopStream` with `stream_ts` and optional blocks (e.g. feedback buttons, “View in dashboard” link).
  - **Option B:** Slack bot opens a stream and subscribes to task/agent events (e.g. WebSocket or polling) and forwards chunks; more moving parts, so Option A is preferred.
- **Requirements:** Slack app has **Agents and AI Apps** enabled and `assistant:write` scope; use [Slack streaming API](https://docs.slack.dev/changelog/2025/10/7/chat-streaming/) (and Bolt’s `chat_stream()` if using Bolt).

### 3.3 Status updates in thread

- **When:** Task status changes (in_progress, completed, failed, etc.).
- **Where:** Same thread (`metadata.slack_thread_ts`).
- **How:**
  - On status change (e.g. in workflow or agent completion handler), if `task.metadata` has Slack context, call MCP (or backend) to post to Slack:
    - e.g. “Task completed”, “Task failed”, with link to task in boilerplate and optional blocks.
  - Optional: **ack reaction** (e.g. 👀) when the task is first received; remove when first response is sent (OpenClaw-style).

### 3.4 Reply in thread → continue conversation

- **When:** User replies in the same Slack thread.
- **How:**
  - Slack bot listens for messages where `thread_ts` matches an existing task (lookup by `metadata.slack_thread_ts` or by a small “thread_ts → task_id” store).
  - On reply: call a **“add user message and continue”** workflow (e.g. `TasksAddUserMessageWorkflow`) with `task_id` and the new message text.
  - Backend appends the message to the task’s conversation and triggers the agent to continue; any new stream is again sent to the same thread (same streaming path as above).

### 3.5 List / filter tasks from Slack

- **e.g. `/restack-list`:**
  - Optional args: status filter, “mine” vs “all”, agent filter.
  - Resolve workspace from Slack team; optionally scope to “agent for this channel” if in a linked channel.
  - Call backend (e.g. `TasksReadWorkflow` or existing list API) and post a summary (ephemeral or in channel) with links to tasks and thread links where applicable.

---

## 4. Architecture (opinionated)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Slack (DM / channel / thread / Assistant)                               │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  events, slash, actions
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Slack Bot (Bolt)                                                        │
│  - Resolve workspace from team_id (OAuth/store)                          │
│  - Resolve agent from channel_id (agent.slack_config.slack_channel_ids)  │
│  - Create task with metadata; handle reply-in-thread → add message        │
│  - Optional: start stream, then proxy chunks from backend (if not in MCP) │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  schedule_workflow, query tasks
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend (Restack / Temporal)                                            │
│  - TasksCreateWorkflow: persist task.metadata (Slack context)            │
│  - TasksAddUserMessageWorkflow: append message, trigger agent           │
│  - LLM stream: if task.metadata has Slack, tee to Slack stream (MCP)     │
│  - On status change / completion: notify Slack (MCP)                      │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  invoke tools (e.g. send to Slack)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MCP Server                                                              │
│  - send_slack_notification (existing)                                   │
│  - slack_start_stream / slack_append_stream / slack_stop_stream (new)   │
│  - Token: per-workspace bot token or single bot token from env           │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Agent → channel mapping** is in the DB (Agent.slack_config) for **inbound** routing; Slack bot and backend resolve “channel_id → agent_id” from that. For **outbound** routing (agent choosing where to post), the agent can use the **official Slack MCP server** as a tool (search channels, send message, read channel/thread) so it can decide the target channel from context.
- **Streaming:** Backend (in `llm_response_stream` or agent step) checks `task.metadata` for Slack; if present, passes Slack context into the step that runs the LLM and tees the stream to MCP Slack streaming tools (start/append/stop). MCP uses the same bot token as the rest of Slack.

---

## 5. Implementation phases (order of work)

### Phase 1: Data and config

1. **Task metadata**
   - Add `metadata` (JSONB) to Task; migration; in `tasks_create` / `TaskCreateInput` accept and persist `metadata`.
2. **Agent Slack config**
   - Add `slack_config` (JSONB) to Agent; migration; CRUD and API for reading/writing it.
3. **Frontend: Agent Slack settings**
   - In agent edit/settings: “Slack” section — linked channel IDs, optional default channel for non-Slack tasks.

### Phase 2: Create task from Slack and persist context

4. **Slack bot: channel → agent resolution**
   - Given `channel_id` and `workspace_id`, call backend (or DB) to get agent whose `slack_config.slack_channel_ids` contains `channel_id`; else show picker or use default.
5. **Slack bot: create task with metadata**
   - All entry points (DM, mention, slash, Assistant) pass `metadata: { slack_channel, slack_thread_ts, slack_user_id, slack_team_id, slack_message_ts, source }` in `TasksCreateWorkflow` input.
6. **Backend: accept and persist**
   - `TaskCreateInput.metadata` and persistence in `tasks_create`; workflow passes it through.

### Phase 3: Notify Slack on completion / status

7. **Backend: completion callback**
   - When a task completes (or fails), if `task.metadata` has Slack context, call MCP `send_slack_notification` (or equivalent) to post in the thread with status and link.
8. **Optional: ack reaction**
   - Slack bot adds 👀 when task is created; backend or bot removes it when first response is sent.

### Phase 4: Stream result to Slack

9. **MCP: Slack streaming tools**
   - Implement `slack_start_stream`, `slack_append_stream`, `slack_stop_stream` (wrapping Slack `chat.startStream` / `appendStream` / `stopStream`), using bot token (env or per-workspace).
10. **Backend: tee LLM stream to Slack**
    - In `llm_response_stream` (or the step that runs the LLM), if `task.metadata` has Slack context, pass channel/thread_ts into that step; first delta → start stream (MCP), deltas → append, end → stop with optional blocks.
    - Ensure `LlmResponseInput` (or equivalent) can carry optional Slack context; agent or workflow provides it from `task.metadata`.

### Phase 5: Reply in thread

11. **Backend: add user message workflow**
    - `TasksAddUserMessageWorkflow` (or similar): input `task_id`, `message_text`; appends user message to task conversation and triggers agent to continue (e.g. send_agent_event with new message).
12. **Slack bot: thread reply handler**
    - On message in thread, resolve `task_id` from `thread_ts` (DB or cache); call `TasksAddUserMessageWorkflow` with the message text; streaming of the next response again goes to the same thread (Phase 4).

### Phase 6: List tasks and polish

13. **Slack bot: `/restack-list` (and similar)**
    - Resolve workspace; optionally agent from channel; call backend list tasks; format and post (ephemeral or in channel).
14. **Manifest and scopes**
    - Ensure `assistant:write` and any other required scopes; event subscriptions for messages in channels/DMs and thread_ts.
15. **OAuth and multi-workspace**
    - If supporting multiple workspaces: install flow stores bot token per workspace/team_id; Slack bot and MCP resolve token by team_id when posting/streaming.

### Phase 7 (optional): Slack MCP as agent tool for routing

16. **Connect agent to official Slack MCP server**
    - Register the [Slack MCP server](https://docs.slack.dev/ai/slack-mcp-server/) (e.g. `https://mcp.slack.com/mcp`) as an MCP/tool source for the agent in the boilerplate, with the same Slack app’s OAuth so the agent can call Slack MCP tools.
17. **Agent instructions and tool use**
    - Document in agent instructions that the agent can use Slack MCP to search channels, send messages, and read channel/thread when it needs to route or post; use `slack_config` as default/hint and Slack MCP for discovery and ad‑hoc routing.

---

## 6. Out of scope (for this plan)

- **Slack MCP as a Cursor/Claude integration** (user connects Slack in Cursor/Claude): that’s the “Slack MCP Server” product; here we use Slack MCP **as a tool our agent calls** for channel discovery and routing inside the boilerplate.
- **Multiple Slack workspaces per agent:** we assume one Slack app (one workspace or one install per workspace); agent’s `slack_config` refers to channel IDs in that app’s workspace(s).
- **Rich Block Kit beyond status + link:** optional; start with simple status + “View in dashboard” link, add feedback buttons / actions later.

---

## 7. Success criteria

- **Create:** User can create a task from Slack (DM, channel, slash, Assistant) and see it tied to the correct agent when the channel is linked.
- **Stream:** Agent’s LLM response streams into the same Slack thread as in the web UI.
- **Status:** Thread shows status updates (and optional ack reaction) without opening the UI.
- **Reply:** Replying in that thread sends the message to the agent and the next response streams back in the same thread.
- **List:** User can list/filter their tasks from Slack (e.g. `/restack-list`).
- **Config:** Each agent has a clear Slack config (linked channels, optional default channel) in the boilerplate UI.

This plan is intentionally opinionated so we can implement the best possible Slack-first experience with minimal branching (single path: agent → channels, task → metadata, stream → MCP, reply → add-message workflow).
