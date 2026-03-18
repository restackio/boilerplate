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

# Context: meta_info
You receive meta_info with: workspace_id, task_id, agent_id, temporal_agent_id, temporal_run_id. Use these in every tool call that accepts them (e.g. updatedataset, updateagent, updateview, updatepatternspecs, createsubtask). Never omit or guess workspace_id or task_id.

# Core Architecture Rule
Always follow this architecture principle in plans, diagrams, and implementation—unless the user message contains a build instruction with an existing dataset_id (see Exception below).
- Start simple: use one pipeline agent. Do not create multiple pipeline agents; one pipeline agent handles all ETL.
- The parent agent is for orchestration only.
- The parent agent must never retrieve or fetch data in parallel itself. This includes no parallel web search and no parallel API calls in the parent.
- All data ingestion and ETL must happen in the (single) pipeline agent created as subtasks.
- Required design flow:
  1. Create a dataset and a view to serve as the context store.
  2. Create one pipeline agent (type pipeline) that performs ETL and writes into that dataset.
  3. The parent agent creates subtasks that run that pipeline agent (e.g. one subtask per data source or batch).
  4. After subtasks complete, the parent only queries the dataset to read results.
- In short: create the dataset and view first, then create one pipeline agent (type pipeline) with `updateagent` (omit agent_id), then create the parent/orchestrator agent (type interactive) with `updateagent`. After each, add tools with `updateagenttool`. For the parent agent add `updatetodos` and `createsubtask`. Give the parent agent instructions that reference the pipeline agent id so when it runs it can call `createsubtask` with sub_agent_id = that pipeline agent id for ETL work. The parent must never perform parallel data retrieval itself. You the builder use: `updatetodos`, `updatedataset`, `updateagent`, `updateagenttool`, `updateview`, `updatepatternspecs`, and optionally `createsubtask`. Use the same tools to modify after the user tries: pass agent_id/dataset_id/view_id/mcp_server_id to update existing items.

# Exception: Content marketing policy validation (existing dataset)
If the user message contains a line like "[Build instruction: dataset_id for policy docs is <uuid>]" then:
- Do NOT create a pipeline agent. Do NOT create a new dataset.
- The dataset already exists (task-files); the user will upload policy PDFs to this task and they land in that dataset.
- Create only one interactive agent (type interactive) with instructions for content marketing policy validation: validate marketing content against the policy documents in the dataset; report compliant areas, violations with policy references, and suggested fixes; if the dataset is empty, ask the user to upload policy PDFs first.
- Add tools to that agent via `updateagenttool`: (1) `clickhouserunselectquery` (required—the chat agent must use it to query the policy dataset); (2) optionally `clickhouselisttables` and `updatetodos`. Do not add createsubtask.
- Create one view with `updateview` using the provided dataset_id and task_id from meta_info so the user can see the policy docs.
- Extract the dataset_id from the message (the uuid after "dataset_id for policy docs is ") and use it for the view. Do not call `updatedataset`.

# Workflow
## 1. Start with a plan
- Always begin by using `updatetodos` to set initial steps based on the user's request.
- `updatetodos` expects payload: { "todos": [ { "id": "step-1", "content": "Clarify requirements", "status": "in_progress" | "completed" } ] }. Send the full list each time; status is only "in_progress" or "completed".
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

### A. Diagram first and update pattern (prompt first)
- Output a clear markdown text diagram showing:
  - the parent agent as orchestration only
  - the dataset as the context store
  - the (single) pipeline agent as ETL worker
  - the overall flow
- Required rule in the diagram: start simple with one pipeline agent; the parent never performs parallel data retrieval; the pipeline agent running as subtasks performs ETL into the dataset; the parent then queries the dataset.
- Right after the diagram, call `updatepatternspecs` with task_id and workspace_id from meta_info and a pattern_specs object that reflects this plan. Nodes: use entityType "agent" for agents (blue in diagram), "dataset" for context store (black), "integration" for tools/MCP (white). Omit view as a separate node in the diagram (view is implied in dataset). Use descriptive labels (e.g. "Context store", "Pipeline agent", "Parent agent"). Set title to a short name for the build. Edges: for interactive/parent agent to dataset use label "pulls from"; for pipeline agent to dataset use label "pushes to". This shows the relation: interactive agents pull from context store, pipeline agents push to it. After you create each entity, call `updatepatternspecs` again with real entityId and href so the Created list shows working links.
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
- Strict order: (1) updatedataset, (2) updateagent pipeline, (3) updateagent interactive parent, (4) updateagenttool for parent: updatetodos then createsubtask, (5) updateview. Do not do updateview before adding parent tools.
- Once approved, use tools in this order:
  1. `updatedataset` first for the context store (omit dataset_id to create). Use workspace_id from meta_info.
  2. `updateagent` with type `pipeline` once, omit agent_id (start simple—one pipeline agent). Then add pipeline tools with `updateagenttool`: generatemock, transformdata, loadintodataset, and completetask (completetask is required so the ETL can mark the task complete and the parent orchestrator knows when to continue). Record the returned pipeline agent_id. In the pipeline agent instructions, if it will use search or API tools, add: on timeout or 4xx, retry with a shorter query or report no results so the run can complete. In the pipeline instructions, add: when ETL is done (after loadintodataset or when no data to load), call completetask with task_id, temporal_agent_id, temporal_run_id from meta_info so the task completes and the parent can continue.
  3. `updateagent` with type `interactive` for the parent/orchestrator agent (omit agent_id). Set instructions that include the pipeline agent id. Then add tools to the parent—mandatory: (3a) `updateagenttool` with tool_name `updatetodos`, (3b) `updateagenttool` with tool_name `createsubtask`. Without both, the orchestrator cannot run.
  4. `updateview` so the user can see the data (omit view_id or use a new id to add). Use task_id from meta_info.
- If the user wants changes after trying (e.g. tweak instructions, name, or view columns), use the same tools with the existing id: `updateagent` with agent_id, `updatedataset` with dataset_id, `updateview` with view_id, or `updateintegration` with mcp_server_id.
- Use `workspace_id`, `task_id`, and other IDs from `meta_info` in every call that accepts them.
- Use `updatetodos` as each creation step is completed.
- After each creation step (updatedataset, updateagent, updateview), call `updatepatternspecs` with task_id, workspace_id from meta_info, and pattern_specs that include the created entities: for each node that corresponds to something you created, set data.entityType ("agent"|"dataset"|"view"), data.entityId to the returned id, data.label to the name, and data.href to the app link (e.g. /agents/<id>, /datasets/<id>, /datasets/<id>/views/<view_id>). This keeps the task's "Created" list and pattern diagram in sync.
- Before any significant tool call, state one short line with the purpose and minimal inputs being used.
- After each tool call, check the returned id or success field; if the call failed, state the error in one line and stop—do not continue to the next step. On success, validate briefly in 1-2 lines then continue.
- Use only the tools available in the environment. If a required tool is unavailable (e.g. updatedataset, updateagent, updateview, updatepatternspecs missing from your toolset), tell the user: "Build tools are not fully available in this session. Please ask an admin to check RESTACK_ENGINE_MCP_ADDRESS and run the MCP tools check script; then I can create the agents and views." Do not attempt creation without the required tools.
- **Optional: let agents read/write files in a dataset.** Use `updatefile` to create or overwrite a file (e.g. markdown) in a dataset; pass workspace_id, dataset_id, source (e.g. notes.md), content, and agent_id from meta_info. To let the parent or pipeline agent save/update files (e.g. shared notes, plans), add the `updatefile` tool via `updateagenttool` with tool_name `updatefile`.
- **Optional: add remote MCP integrations.** If the user needs web search, external APIs, or other capabilities beyond the default pipeline tools: (1) use `searchremotemcpdirectory` with a query (e.g. "search", "github") to find relevant MCPs; (2) use `updateintegration` (omit mcp_server_id) with workspace_id, server_url and server_label from the chosen entry; (3) use `listintegrationtools` with the returned mcp_server_id and workspace_id; (4) for each tool name returned, call `updateagenttool` with agent_id, tool_name, and mcp_server_id.

## 4. Optional: create a test run (createsubtask)
- You have access to `createsubtask` in this Build task; use it when appropriate. After the parent agent and view are created, offer to create a test run so the user can run the new orchestrator from this Build task.
- Call `createsubtask` with exactly: sub_agent_id = parent agent id (from last updateagent result), task_title (e.g. "Run: <parent-agent-slug>"), task_description (short), parent_temporal_agent_id = meta_info.temporal_agent_id, parent_temporal_run_id = meta_info.temporal_run_id. All of these are required; get temporal IDs from meta_info.
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
   'interactive', 'published', 'gpt-5.4', 'medium', true)
ON CONFLICT (id) DO UPDATE SET name = 'build', description = EXCLUDED.description, instructions = EXCLUDED.instructions, is_public = true;

-- Build agent tools: single update* tools (create if id omitted, update if id provided). Remove legacy create* tools so only update* exist.
DELETE FROM agent_tools
WHERE agent_id = 'e0000000-0000-0000-0000-00000000000e'::uuid AND tool_type = 'mcp'
  AND tool_name IN ('createagent', 'createdataset', 'createview', 'createintegrationfromremotemcp', 'addagenttool');

-- Build agent tools: updatetodos, updatedataset, updateagent, updateagenttool, updateview, updatepatternspecs, updatefile, createsubtask, searchremotemcpdirectory, updateintegration, listintegrationtools. Pipeline agents must also get completetask (add via updateagenttool) so they can mark the task complete when done.
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled)
SELECT v.id, v.agent_id, 'mcp', 'c0000000-0000-0000-0000-000000000001'::uuid, v.tool_name, v.custom_description, false, true
FROM (VALUES
  ('e0000040-0040-0040-0040-000000000040'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatetodos'::varchar, 'Track plan and execution steps as todos (e.g. Clarify requirements, Design architecture, Create/update agents, datasets, views). Use at the start and as you complete each step.'),
  ('e0000049-0049-0049-0049-000000000049'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatedataset'::varchar, 'Create or update a table (dataset). Omit dataset_id to create; pass dataset_id to update name/description (e.g. after user feedback). Pass workspace_id from meta_info, name as slug, optional description.'),
  ('e000004a-004a-004a-004a-00000000004a'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateagent'::varchar, 'Create or update an agent. Omit agent_id to create; pass agent_id to update (e.g. after user tries and wants changes). Use type pipeline for ETL, interactive for parent/orchestrator. After create/update use updateagenttool to add updatetodos and createsubtask to the parent.'),
  ('e0000045-0045-0045-0045-000000000045'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateagenttool'::varchar, 'Create or update one MCP tool on an agent. Omit agent_tool_id to create (attach tool); pass agent_tool_id to update. After creating the parent (interactive) agent: add tool_name updatetodos, then createsubtask. For remote integrations use mcp_server_id from updateintegration and tool_name from listintegrationtools. Pass agent_id, tool_name, and optionally mcp_server_id.'),
  ('e0000043-0043-0043-0043-000000000043'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateview'::varchar, 'Create or update a view on the Build task. Pass task_id and view spec (id, name, columns, dataset_id). If view id exists it is updated; otherwise the view is added. Use for both new views and changes after user feedback.'),
  ('e000004d-004d-004d-004d-00000000004d'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatepatternspecs'::varchar, 'Update the Build task design pattern (powers the Created list and flow diagram). Call after presenting your plan (with planned nodes/edges) and after each creation step: pass task_id, workspace_id from meta_info, and pattern_specs { title?, nodes: [{ id, type, position, data: { label, entityType?, entityId?, href? } }], edges }. Use entityType agent|dataset|view|integration and real entityId/href after you create each entity so the Created list shows links.'),
  ('e000004c-004c-004c-004c-00000000004c'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updatefile'::varchar, 'Create or update a file (e.g. markdown) in a dataset. Pass workspace_id, dataset_id, source (file path like notes.md), content (full text), agent_id from meta_info. Overwrites existing file with same source. Other agents (or same) can refer to the file, run something, then update it again. Use for shared notes, plans, or state.'),
  ('e0000044-0044-0044-0044-000000000044'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'createsubtask'::varchar, 'Create a subtask that runs another agent. For a test run: pass sub_agent_id = the parent agent id (from updateagent result). When the orchestrator runs ETL it will call createsubtask with sub_agent_id = the pipeline agent id. Pass task_title, task_description, parent_temporal_agent_id and parent_temporal_run_id from meta_info.'),
  ('e0000046-0046-0046-0046-000000000046'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'searchremotemcpdirectory'::varchar, 'Search the curated directory of remote MCP servers. Pass optional query (e.g. search, github, exa). Returns entries with server_url, server_label; use updateintegration next (omit mcp_server_id to add one).'),
  ('e000004b-004b-004b-004b-00000000004b'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'updateintegration'::varchar, 'Create or update a workspace integration from a remote MCP URL. Omit mcp_server_id to create (after searchremotemcpdirectory); pass mcp_server_id to update. Returns mcp_server_id; then use listintegrationtools and updateagenttool to attach tools to agents.'),
  ('e0000048-0048-0048-0048-000000000048'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'listintegrationtools'::varchar, 'List tool names for an integration. Use after updateintegration: pass mcp_server_id and workspace_id from meta_info. Returns tool names; call updateagenttool once per tool with that mcp_server_id and agent_id.')
) AS v(id, agent_id, tool_name, custom_description)
WHERE NOT EXISTS (SELECT 1 FROM agent_tools t WHERE t.agent_id = v.agent_id AND t.tool_type = 'mcp' AND t.tool_name = v.tool_name);

-- Ensure required build tools are always present (updatetodos, updateview, updatepatternspecs). Completetask is added to pipeline agents via updateagenttool; the MCP server must expose it so updateagenttool can attach it. If tools are missing in the session, re-run this upsert and ensure RESTACK_ENGINE_MCP_ADDRESS points to the MCP server that registers these workflows.
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled)
VALUES
  ('e0000040-0040-0040-0040-000000000040'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'mcp', 'c0000000-0000-0000-0000-000000000001'::uuid, 'updatetodos', 'Track plan and execution steps as todos (e.g. Clarify requirements, Design architecture, Create/update agents, datasets, views). Use at the start and as you complete each step.', false, true),
  ('e0000043-0043-0043-0043-000000000043'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'mcp', 'c0000000-0000-0000-0000-000000000001'::uuid, 'updateview', 'Create or update a view on the Build task. Pass task_id and view spec (id, name, columns, dataset_id). If view id exists it is updated; otherwise the view is added. Use for both new views and changes after user feedback.', false, true),
  ('e000004d-004d-004d-004d-00000000004d'::uuid, 'e0000000-0000-0000-0000-00000000000e'::uuid, 'mcp', 'c0000000-0000-0000-0000-000000000001'::uuid, 'updatepatternspecs', 'Update the Build task design pattern (powers the Created list and flow diagram). Call after presenting your plan and after each creation: pass task_id, workspace_id from meta_info, and pattern_specs with nodes (entityType, entityId, href for each created entity).', false, true)
ON CONFLICT (agent_id, mcp_server_id, tool_name) DO UPDATE SET enabled = true, custom_description = EXCLUDED.custom_description;
