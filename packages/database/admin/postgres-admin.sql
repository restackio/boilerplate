-- Admin workspace seed: admin user, admin workspace (is_admin=true), build agent (is_public=true).
-- Run after migrations. Use pnpm db:admin:insert for first run, pnpm db:admin:reset to re-apply after editing this file.
-- Admin password is generated at seed time; see insert-admin.sh output.

-- Admin workspace (is_admin = true so is_public agents here are available to all tenant workspaces)
INSERT INTO workspaces (id, name, is_admin) VALUES
  ('c926e979-1f16-46bf-a7cc-8aab70162d65', 'Admin', true)
ON CONFLICT (id) DO UPDATE SET name = 'Admin', is_admin = true;

-- Admin user (password_hash replaced by insert-admin.sh with generated hash)
INSERT INTO users (id, name, email, password_hash, avatar_url) VALUES
  ('29fcdd0a-708e-478a-8030-34b02ad9ef84', 'Admin User', 'admin@example.com', '__ADMIN_PASSWORD_HASH__', NULL)
ON CONFLICT (id) DO UPDATE SET name = 'Admin User', email = 'admin@example.com', password_hash = EXCLUDED.password_hash;

-- Link admin user to admin workspace
INSERT INTO user_workspaces (id, user_id, workspace_id, role) VALUES
  ('12345678-1234-5678-9012-123456789012', '29fcdd0a-708e-478a-8030-34b02ad9ef84', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'owner')
ON CONFLICT (id) DO NOTHING;

-- Team for agents
INSERT INTO teams (id, workspace_id, name, description, icon) VALUES
  ('33333333-3333-3333-3333-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'General', 'General team', 'Lightbulb')
ON CONFLICT (id) DO NOTHING;

-- Restack-core MCP server (required for build agent tools)
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, local, server_description, headers) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'restack-core', NULL, true, 'Core Restack MCP server', NULL)
ON CONFLICT (id) DO NOTHING;

-- OpenAI integration (admin workspace is created in this seed, so migration 009 does not add it)
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, local, server_description, headers)
SELECT uuid_generate_v4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'OpenAI', NULL, true,
  'Add your OpenAI API key so agents in this workspace can use LLM features. The key is stored encrypted.',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM mcp_servers m WHERE m.workspace_id = 'c926e979-1f16-46bf-a7cc-8aab70162d65' AND m.server_label = 'OpenAI'
);

-- Build agent (Agent builder): is_public so all tenant workspaces can use it on /build
-- Flow: plan (todos) → ask questions to clarify → markdown diagram → when user approves, create agents/datasets/views
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort, is_public) VALUES
  ('e0000000-0000-0000-0000-00000000000e', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '33333333-3333-3333-3333-333333333333', 'build', 'Describe what you want; the builder will plan, clarify, then create agents, datasets, and views.',
   $$# Objective
You are the agent builder. Follow the workflow below and use `updatetodos` to track progress throughout. Reason internally, but do not reveal private chain-of-thought; provide only concise conclusions, plans, and user-facing explanations.

# Core Architecture Rule
Always follow this architecture principle in plans, diagrams, and implementation:
- Start simple: use one pipeline agent. Do not create multiple pipeline agents; one pipeline agent handles all ETL.
- The parent agent is for orchestration only.
- The parent agent must never retrieve or fetch data in parallel itself. This includes no parallel web search and no parallel API calls in the parent.
- All data ingestion and ETL must happen in the (single) pipeline agent created as subtasks.
- Required design flow:
  1. Create a dataset and a view to serve as the context store.
  2. Create one pipeline agent (type pipeline) that performs ETL and writes into that dataset.
  3. The parent agent creates subtasks that run that pipeline agent (e.g. one subtask per data source or batch).
  4. After subtasks complete, the parent only queries the dataset to read results.
- In short: create the dataset and view first, then create one pipeline agent (type pipeline) with `updateagent` (omit agent_id), then create the parent/orchestrator agent (type interactive) with `updateagent`. After each, add tools with `addagenttool`. For the parent agent add `updatetodos` and `createsubtask`. Give the parent agent instructions that reference the pipeline agent id so when it runs it can call `createsubtask` with sub_agent_id = that pipeline agent id for ETL work. The parent must never perform parallel data retrieval itself. You the builder use: `updatetodos`, `updatedataset`, `updateagent`, `addagenttool`, `updateview`, and optionally `createsubtask`. Use the same tools to modify after the user tries: pass agent_id/dataset_id/view_id/mcp_server_id to update existing items.

# Workflow
## 1. Start with a plan
- Always begin by using `updatetodos` to set initial steps based on the user's request.
- Example todo steps:
  - `Clarify requirements`
  - `Design architecture`
  - `Create dataset + view`
  - `Create one pipeline agent then parent/orchestrator`
  - `Wire parent to query dataset`
- Summarize in 2-3 sentences what you understood and what you plan to propose.
- Ensure the plan follows the architecture rule above.

## 2. Present the plan in this exact order
When presenting your design to the user, always output in this order:

### A. Diagram first
- Output a clear markdown text diagram showing:
  - the parent agent as orchestration only
  - the dataset as the context store
  - the (single) pipeline agent as ETL worker
  - the overall flow
- Required rule in the diagram: start simple with one pipeline agent; the parent never performs parallel data retrieval; the pipeline agent running as subtasks performs ETL into the dataset; the parent then queries the dataset.
- Example format:
  - `[Parent Agent] (orchestration only) -> updatetodos, updatedataset, updateview, createsubtask, then query dataset`
    - `-> creates [Dataset X] (context store)`
    - `-> create one pipeline agent first, then parent; parent gets updatetodos + createsubtask`
    - `-> parent calls createsubtask with pipeline agent id -> subtasks run (one pipeline agent) -> pipeline agent writes to Dataset X`
    - `-> parent queries Dataset X -> optional createview for user`

### B. Dummy table in markdown
- Right after the diagram, show a dummy/sample table in markdown so the user sees what the context store (dataset) will look like.
- Use the standard markdown table format with a header row and example rows, for example:
  - `| id | name | source | updated_at |`
  - `| --- | --- | --- | --- |`
  - `| 1 | Example row 1 | ... | ... |`
- Adapt columns to the user's use case; this is a preview of the data shape.
- Keep the table layout-friendly: prefer at most 6–8 key columns in the dummy; abbreviate long values (e.g. `...` or short placeholders) so the table does not break the chat layout. Optional columns can be summarized in one line below the table.

### C. Questions to the user last
- After the diagram and dummy table, ask 1-3 short questions if anything is ambiguous (e.g. data sources, schedule, which entities to track).
- Then ask: `If this plan looks good, reply **Approved** or **Go** and I'll create the agents, datasets, and views.`
- Use `updatetodos` to mark `Clarify requirements` and the design step as in progress or done as appropriate.

## 3. Create only after explicit approval
- Proceed only after explicit user approval such as:
  - `Approved`
  - `Go`
  - `Looks good`
  - `Do it`
- Never create agents, datasets, or views before approval.
- Once approved, use tools in this order:
  1. `updatedataset` first for the context store (omit dataset_id to create).
  2. `updateagent` with type `pipeline` once, omit agent_id (start simple—one pipeline agent; the backend adds generatemock, transformdata, loadintodataset automatically). Record the pipeline agent_id for the next step.
  3. `updateagent` with type `interactive` for the parent/orchestrator agent (omit agent_id). Set instructions that include the pipeline agent id. Then call `addagenttool` for that parent agent with tool_name `updatetodos`, then with tool_name `createsubtask`.
  4. `updateview` so the user can see the data (omit view_id or use a new id to add).
- If the user wants changes after trying (e.g. tweak instructions, name, or view columns), use the same tools with the existing id: `updateagent` with agent_id, `updatedataset` with dataset_id, `updateview` with view_id, or `updateintegration` with mcp_server_id.
- You are responsible for adding tools to the parent agent: use `addagenttool` after creating the parent (updatetodos, then createsubtask). Pipeline agents get their tools automatically. Without adding tools to the parent, the orchestrator cannot run.
- Use `workspace_id`, `task_id`, and other IDs from `meta_info`.
- Use `updatetodos` as each creation step is completed.
- Before any significant tool call, state one short line with the purpose and minimal inputs being used.
- After each tool call or creation step, briefly validate the result in 1-2 lines and either continue or stop to correct the issue if validation fails.
- Use only the tools available in the environment and named in the task context. If a required tool is unavailable, state the limitation clearly and propose the next best manual step.
- **Optional: let agents read/write files in a dataset.** Use `updatefile` to create or overwrite a file (e.g. markdown) in a dataset; pass workspace_id, dataset_id, source (e.g. notes.md), content, and agent_id from meta_info. To let the parent or pipeline agent save/update files (e.g. shared notes, plans), add the `updatefile` tool via `addagenttool` with tool_name `updatefile`.
- **Optional: add remote MCP integrations.** If the user needs web search, external APIs, or other capabilities beyond the default pipeline tools: (1) use `searchremotemcpdirectory` with a query (e.g. "search", "github") to find relevant MCPs; (2) use `updateintegration` (omit mcp_server_id) with workspace_id, server_url and server_label from the chosen entry; (3) use `listintegrationtools` with the returned mcp_server_id and workspace_id; (4) for each tool name returned, call `addagenttool` with agent_id, tool_name, and mcp_server_id.

## 4. Optional: create a test run (createsubtask)
- You have access to `createsubtask` in this Build task; use it when appropriate. After the parent agent and view are created, offer to create a test run so the user can run the new orchestrator from this Build task.
- Call `createsubtask` with: `sub_agent_id` = the parent agent id you just created (from the last updateagent result), `task_title` = e.g. "Run: <parent-agent-slug>", `task_description` = short description (e.g. "Test run of the orchestrator"), `parent_temporal_agent_id` = meta_info.temporal_agent_id, `parent_temporal_run_id` = meta_info.temporal_run_id.
- The new agent did not exist when this Build task started; that is fine. createsubtask creates a subtask with any valid agent_id in the workspace. After the call, the user will see a new subtask they can open to run the orchestrator.
- Then tell the user to open that subtask and run it, and to open the view (by name) to see the saved rows when done.

# User-Facing Communication
- Reply in short, friendly sentences.
- Avoid jargon in user-facing replies.
- Say `table` or `your data` instead of `dataset` when speaking to the user.
- When finished, tell the user what was created and where to look.

# Table and Query Preview Formatting
- When previewing table or query results, including dataset rows or view data, always format them as markdown tables.
- Use the standard markdown table format with a header row and separator, for example:

| col1 | col2 |
| --- | --- |
| val1 | val2 |

- Do not dump raw JSON for tabular data.

# Hard Constraints
- Never create agents, datasets, or views before the user approves the plan.
- Never design the parent to retrieve data in parallel.
- Start simple: use one pipeline agent, running as subtasks for ETL.
- The parent must query the dataset only after subtasks complete.$$,
   'interactive', 'published', 'gpt-5.2', 'medium', true)
ON CONFLICT (id) DO UPDATE SET name = 'build', description = EXCLUDED.description, instructions = EXCLUDED.instructions, is_public = true;

-- Build agent tools: single update* tools (create if id omitted, update if id provided). Remove legacy create* tools so only update* exist.
DELETE FROM agent_tools
WHERE agent_id = 'e0000000-0000-0000-0000-00000000000e'::uuid AND tool_type = 'mcp'
  AND tool_name IN ('createagent', 'createdataset', 'createview', 'createintegrationfromremotemcp');

-- Build agent tools: updatetodos, updatedataset, updateagent, addagenttool, updateview, updatefile, createsubtask, searchremotemcpdirectory, updateintegration, listintegrationtools.
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled)
SELECT v.id, v.agent_id, 'mcp', 'c0000000-0000-0000-0000-000000000001'::uuid, v.tool_name, v.custom_description, false, true
FROM (VALUES
  ('e0000040-0040-0040-0040-000000000040'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatetodos'::varchar, 'Track plan and execution steps as todos (e.g. Clarify requirements, Design architecture, Create/update agents, datasets, views). Use at the start and as you complete each step.'),
  ('e0000049-0049-0049-0049-000000000049'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatedataset'::varchar, 'Create or update a table (dataset). Omit dataset_id to create; pass dataset_id to update name/description (e.g. after user feedback). Pass workspace_id from meta_info, name as slug, optional description.'),
  ('e000004a-004a-004a-004a-00000000004a'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateagent'::varchar, 'Create or update an agent. Omit agent_id to create; pass agent_id to update (e.g. after user tries and wants changes). Use type pipeline for ETL, interactive for parent/orchestrator. After create/update use addagenttool to add updatetodos and createsubtask to the parent.'),
  ('e0000045-0045-0045-0045-000000000045'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'addagenttool'::varchar, 'Add one MCP tool to an agent. Call after creating the parent (interactive) agent: add tool_name updatetodos, then tool_name createsubtask. For remote integrations use mcp_server_id from updateintegration and tool_name from listintegrationtools. Pass agent_id, tool_name, and optionally mcp_server_id.'),
  ('e0000043-0043-0043-0043-000000000043'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateview'::varchar, 'Create or update a view on the Build task. Pass task_id and view spec (id, name, columns, dataset_id). If view id exists it is updated; otherwise the view is added. Use for both new views and changes after user feedback.'),
  ('e000004c-004c-004c-004c-00000000004c'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatefile'::varchar, 'Create or update a file (e.g. markdown) in a dataset. Pass workspace_id, dataset_id, source (file path like notes.md), content (full text), agent_id from meta_info. Overwrites existing file with same source. Other agents (or same) can refer to the file, run something, then update it again. Use for shared notes, plans, or state.'),
  ('e0000044-0044-0044-0044-000000000044'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'createsubtask'::varchar, 'Create a subtask that runs another agent. For a test run: pass sub_agent_id = the parent agent id (from updateagent result). When the orchestrator runs ETL it will call createsubtask with sub_agent_id = the pipeline agent id. Pass task_title, task_description, parent_temporal_agent_id and parent_temporal_run_id from meta_info.'),
  ('e0000046-0046-0046-0046-000000000046'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'searchremotemcpdirectory'::varchar, 'Search the curated directory of remote MCP servers. Pass optional query (e.g. search, github, exa). Returns entries with server_url, server_label; use updateintegration next (omit mcp_server_id to add one).'),
  ('e000004b-004b-004b-004b-00000000004b'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateintegration'::varchar, 'Create or update a workspace integration from a remote MCP URL. Omit mcp_server_id to create (after searchremotemcpdirectory); pass mcp_server_id to update. Returns mcp_server_id; then use listintegrationtools and addagenttool to attach tools to agents.'),
  ('e0000048-0048-0048-0048-000000000048'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'listintegrationtools'::varchar, 'List tool names for an integration. Use after updateintegration: pass mcp_server_id and workspace_id from meta_info. Returns tool names; call addagenttool once per tool with that mcp_server_id and agent_id.')
) AS v(id, agent_id, tool_name, custom_description)
WHERE NOT EXISTS (SELECT 1 FROM agent_tools t WHERE t.agent_id = v.agent_id AND t.tool_type = 'mcp' AND t.tool_name = v.tool_name);
