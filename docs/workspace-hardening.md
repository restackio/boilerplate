# Workspace hardening backlog

Audit of how multi-tenant workspaces work in the boilerplate today, and the
caveats we need to address before opening the platform to external users.

Findings are ordered by impact (highest first). Each item lists the symptom,
the root cause, and the affected files so we can pick them up one by one.

---

## How it works today (mental model)

```text
users ──┐                                     ┌── teams (workspace-scoped, no per-team ACL)
        │   user_workspaces                   │
        ├── (user_id, workspace_id, role) ────┼── agents / tasks / datasets / mcp_servers / …
        │   role ∈ {owner, admin, member}     │
        │                                     └── channel_integrations (Slack)
        └── localStorage["currentWorkspaceId"]
            picked by the frontend → injected as workspace_id into every workflow call
```

- `workspaces` is the top-level tenant.
- `user_workspaces` is the M:N join, with a `role` column that is **not**
  enforced anywhere yet.
- The frontend stores the active workspace in `localStorage` and injects it
  into every workflow call via `useWorkspaceScopedActions`.
- Activities filter by `workspace_id` for data scoping, but do **not** verify
  that the calling user is actually a member of that workspace.

Key files:

| Area                    | Path                                                               |
|-------------------------|--------------------------------------------------------------------|
| Workspace model         | `apps/backend/src/database/models.py`                              |
| Workspace CRUD          | `apps/backend/src/functions/workspaces_crud.py`                    |
| Auth                    | `apps/backend/src/functions/auth_crud.py`                          |
| Frontend context        | `apps/frontend/lib/database-workspace-context.tsx`                 |
| Scoped hooks            | `apps/frontend/hooks/use-workspace-scoped-actions.ts`              |
| Workflow passthrough    | `apps/frontend/app/actions/workflow.ts`                            |
| Workspace guard         | `apps/frontend/components/auth/workspace-guard.tsx`                |
| Slack OAuth             | `apps/slack-bot/src/http_receiver.py`, `slack_oauth.py`            |
| Channel integration upsert | `apps/backend/src/functions/channels_crud.py`                  |
| Migrations              | `packages/database/migrations/postgres/001_initial_schema.sql`, `012_add_workspaces_is_admin.sql`, `016_slack_integration.sql` |
| Admin seed              | `packages/database/admin/postgres-admin.sql`                       |

---

## 1. Authorization is "trust the client"

**Symptom**: any caller who can invoke a workflow can pass any `workspace_id`
and read/mutate that tenant's data. There is no central middleware that ties
session → allowed workspace IDs.

**Root cause**: `apps/frontend/app/actions/workflow.ts` forwards the input
verbatim. Activities like `agents_read`, `tasks_read`, `datasets_read` only
filter by the supplied `workspace_id` — they don't verify the caller is in
`user_workspaces` for that workspace.

Two specific spots are worse than the rest:

- **`tasks_get_by_id`** in `apps/backend/src/functions/tasks_crud.py` —
  `workspace_id` is *optional*; if omitted, lookup is by task UUID only.
- **`tasks_delete`** — `TaskDeleteInput` has only `task_id`. **No** workspace
  filter at all.
- **`workspaces_delete`** — deletes the workspace by id; no caller/role check.

**Suggested fix direction**: workflow-layer `requires_workspace_membership(
session_user_id, workspace_id, min_role)` check, executed before any tenant
data is touched.

---

## 2. The role column is enforced nowhere

**Symptom**: `owner`, `admin`, and `member` are functionally identical at
runtime today.

**Root cause**: `UserWorkspace.role` has a `CHECK (role IN
('owner','admin','member'))` but no codepath checks it. The seed sets
`role='owner'` on workspace creation; nothing else cares.

**Suggested fix direction**: either gate destructive actions on
`role IN ('owner','admin')`, or drop the column and replace with a single
`is_admin` boolean if we don't need three tiers.

---

## 3. Slack `channel_integrations` has a global uniqueness footgun ✅ done

**Symptom (was)**: a Slack workspace could only be bound to one Restack
workspace at a time, and `channel_integration_upsert` silently overwrote
`workspace_id` + `credentials` when the same Slack team installed from a
different Restack workspace. Combined with token lookup by `external_id`
only, this was a cross-tenant token + routing leak.

**Resolution (v1)**:

- `channel_integration_upsert` now refuses cross-workspace takeover and
  returns a structured `error="already_connected_elsewhere"` instead.
  Same-workspace re-installs still refresh `credentials` (token rotation).
- `oauth_callback` in the slack-bot detects that error and renders a
  friendly HTML page asking the user to disconnect from the other
  workspace first.
- `_resolve_bot_token` now accepts an optional `workspace_id` and adds it
  to the `WHERE` clause as defense-in-depth. Logs a warning when
  `workspace_id` is missing so we can promote it to required later.
- `task_metadata` now carries `workspace_id`, plumbed from the slack-bot
  through to all Slack-posting activities.

**Future (B-tier)**: an explicit "transfer this Slack workspace from
Restack workspace A → B" flow that requires confirmation from an admin in
**both** Restack workspaces. Out of scope for v1.

**Touched files**:

- `apps/backend/src/functions/channels_crud.py`
- `apps/backend/src/functions/slack_callback.py`
- `apps/backend/src/functions/slack_api.py`
- `apps/backend/src/agents/agent_task.py`
- `apps/slack-bot/src/http_receiver.py`
- `apps/slack-bot/src/bot_services/task_manager.py`
- `apps/mcp_server/src/workflows/tools/slack_connect_channel.py`
- `apps/mcp_server/src/workflows/tools/slack_list_channels.py`

---

## 4. OAuth `state` is a plaintext workspace_id

**Symptom**: anyone who knows or guesses a workspace UUID can craft an
`Add to Slack` URL targeting it.

**Root cause**: `apps/slack-bot/src/bot_services/slack_oauth.py` sets
`state = workspace_id` (raw UUID); the callback in `http_receiver.py` trusts
it as the workspace to bind to.

**Suggested fix direction**: `state = HMAC(secret, workspace_id || nonce)`
with the nonce stored in the user's session and verified on callback.

---

## 5. `currentWorkspaceId` lives in `localStorage`

**Symptom**:

- Two tabs cannot view two different workspaces side by side. Switching in
  tab A retroactively switches tab B.
- A user with many workspaces can't bookmark workspace-specific URLs.

**Root cause**: `apps/frontend/lib/database-workspace-context.tsx` persists
the active id in origin-wide `localStorage`.

**Suggested fix direction**: move `workspace_id` into the URL
(`/w/[workspaceId]/...`); keep `localStorage` as a "last used" hint.

---

## 6. Workspace deletion ignores everything outside Postgres

**Symptom**: `workspaces_delete` cleans up Postgres rows via FK cascades, but
leaves orphans elsewhere.

**Orphans**:

- ClickHouse dataset payloads.
- Object storage (anything keyed by workspace_id).
- Slack OAuth tokens are deleted from `channel_integrations.credentials`,
  but we don't call Slack's `auth.revoke`. Bot stays installed in their
  Slack from Slack's side until manually removed.
- Temporal workflows in flight.

There is also no soft-delete / undo. A misclick = irrevocable.

**Affected file**: `apps/backend/src/functions/workspaces_crud.py` —
`workspaces_delete`.

**Suggested fix direction**: soft-delete with a 30-day grace period; a
periodic janitor that hard-deletes after the grace and also revokes
external resources (Slack, ClickHouse, object storage).

---

## 7. No team membership concept

**Symptom**: teams are pure organizational labels — there's no way to say
"engineering team can see these agents but support team can't" inside one
workspace.

**Root cause**: `Team` has `workspace_id` but there's no `team_users` join
table.

**Suggested fix direction**: add `team_users (user_id, team_id, role)` if/
when team-level ACLs become a product requirement.

---

## 8. Multi-membership UX gaps

- No invite flow on the frontend, even though the backend
  (`UserSignupInput.workspace_id` in `auth_crud.py`) already supports
  signing a new user up directly into an existing workspace.
- No workspace switcher in the dashboard chrome (worth verifying).
- Signup path always lands on `/workspace/create`. There's no path for "a
  colleague invited me, let me join their workspace".

**Suggested fix direction**: invite tokens (`workspace_invites` table with
`token`, `workspace_id`, `role`, `expires_at`, `accepted_by_user_id`); a
`/invite/[token]` page that calls a `WorkspaceInviteAcceptWorkflow`.

---

## 9. `is_admin` workspace flag is fragile

**Symptom**: the seed creates a workspace with `is_admin = true` that owns
the build agents and stock MCP servers. There's nothing preventing multiple
`is_admin = true` workspaces from being created by hand, and deleting the
admin workspace would cascade-nuke the build agents.

**Affected migration**:
`packages/database/migrations/postgres/012_add_workspaces_is_admin.sql`.

**Suggested fix direction**: partial unique index ensuring at most one
`is_admin = true` row; a guard in `workspaces_delete` that refuses to
delete admin workspaces.

---

## 10. Operational / scaling gotchas

- **No workspace quotas** anywhere — agents, tasks, datasets, integrations
  are uncapped per workspace.
- **No per-workspace rate limiting** on workflow execution. The Slack rate
  limit we have is per-user.
- **MCP server seeding on every workspace create** —
  `workspaces_create` seeds `restack-core` + `OpenAI` + a "General" team. If
  those defaults change, existing workspaces drift. No backfill mechanism.

---

## Suggested order of attack (subject to product priorities)

1. ~~**#3** — Slack global-uniqueness footgun.~~ ✅ Done.
2. **#1, #2** — Authorization middleware + role enforcement. Pre-requisite
   to letting strangers onto the platform.
3. **#4** — Sign the OAuth `state`.
4. **#1 cont.** — Plug `tasks_delete` and friends with mandatory
   `workspace_id`.
5. **#5** — Move `workspace_id` into the URL.
6. **#8** — Invite flow.
7. **#6** — Slack `auth.revoke` on disconnect; janitor for external
   resources.
8. **#9** — Admin-workspace guards.
9. **#10** — Quotas + per-workspace rate limits.
10. **#7** — Team membership ACL (only when product needs it).
