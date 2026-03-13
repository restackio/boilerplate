# Agent build prompt improvement plan

**Context:** Review of last AgentTask workflows and codebase. The Restack MCP `history_workflows_agents` call returned a parse error; later, event logs were provided for five runs (see below).

## 0. Logs provided (event JSONs)

- **Files:** `019ce7ea-7fc2-..._events.json` (Apple), `019ce7ea-8e7d-...` (Microsoft), `019ce7ea-a0ca-...`, `019ce7ea-ae6d-...`, `019ce7ea-bdf7-..._events.json`.
- **What they are:** These are **pipeline-agent** runs (company-scan subtasks), not build-agent runs. Same root workflow `aa02974c-...-TasksCreateWorkflow`; parent task `6995d89f-...`; each subtask runs the same pipeline agent (`d14b48ae-...`) with a task description like "Company scan: Apple (AAPL)" and JSON input (mode, run_id, time_window_days, company).
- **Findings from logs:**
  - **Build/orchestrator worked:** The builder created the pipeline agent and parent; subtasks are well-formed (title, description, workspace_id, parent_task_id, temporal_parent_agent_id).
  - **Pipeline run behavior:** One run (Apple, `019ce7ea-7fc2...`) completed: produced `leadership_change_news` rows for `loadintodataset`, then `response.completed` and `CHILD_WORKFLOW_EXECUTION_COMPLETED`.
  - **Errors during pipeline execution:** `web_search_exa` (exa_search) returned `http_error` 424 and `mcp_tool_execution_error` "timeout of 25000ms exceeded". The pipeline agent retried with shorter queries and still produced output.
- **Implication for build prompt:** When the builder writes **pipeline agent instructions** that use search/API tools, it can add one line so the pipeline is more resilient: e.g. "If a search or API call fails (e.g. timeout or 4xx), retry with a shorter or simpler query, or report no results for that source."

## 1. What we inferred (no direct build-agent logs)

- **Last pending AgentTask runs** (from search): multiple `task_agent_*` RUNNING, task_queue `local-backend`, root workflow `TasksCreateWorkflow`.
- **Relevant code paths:** `agent_task.py` builds `meta_info` (agent_id, task_id, workspace_id, temporal_agent_id, temporal_run_id); handles `todo_update` (expects `{ todos: [ { id, content, status } ] }`); `subtask_create` expects agent_id, task_title, task_description, parent_temporal_agent_id; errors surface as todo_update_failed, message_processing_failed, llm_response_failed.

## 2. Improvement plan

| #   | Issue / goal                                     | Change                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **meta_info usage**                              | Add an explicit "Context: meta_info" section listing required fields (workspace_id, task_id, temporal_agent_id, temporal_run_id, agent_id) and state that every tool call that accepts them must use these values. Reduces missing/invalid ID errors.                                                                                                           |
| 2   | **updatetodos payload**                          | Document the exact payload shape: `{ "todos": [ { "id": "step-1", "content": "Clarify requirements", "status": "in_progress" \| "completed" } ] }`. Reduces todo_update_failed from malformed payloads.                                                                                                                                                         |
| 3   | **Parent tools as mandatory checklist**          | Turn "add updatetodos then createsubtask" into a numbered checklist right after creating the parent agent (e.g. "3a. addagenttool(parent_agent_id, updatetodos); 3b. addagenttool(parent_agent_id, createsubtask)"). Emphasize that skipping this breaks the orchestrator.                                                                                      |
| 4   | **Tool-unavailable handling**                    | Add one line: "If you see only a subset of tools (e.g. no updatedataset/updateagent/updateview), tell the user: 'Build tools are not fully available in this session. Please ask an admin to check RESTACK_ENGINE_MCP_ADDRESS and run the MCP tools check script; then I can create the agents and views.' Do not attempt creation without the required tools." |
| 5   | **createsubtask parameters**                     | Explicitly list createsubtask parameters and that they come from meta_info: task_title, task_description, sub_agent_id (parent agent id for test run), parent_temporal_agent_id = meta_info.temporal_agent_id, parent_temporal_run_id = meta_info.temporal_run_id. Reduces subtask_create errors.                                                               |
| 6   | **Order of operations**                          | Add a single sentence: "Strict order: 1) updatedataset, 2) updateagent (pipeline), 3) updateagent (interactive/parent), 4) addagenttool (updatetodos, then createsubtask), 5) updateview." So the builder never does updateview before parent tools are added.                                                                                                  |
| 7   | **Validation after each step**                   | Strengthen: "After each tool call, check the returned id or success field; if the call failed, state the error in one line and stop—do not continue to the next step."                                                                                                                                                                                          |
| 8   | **Pipeline instructions resilience** (from logs) | When writing pipeline agent instructions that use search or external API tools, add a line: if a call fails (timeout, 4xx), retry with a shorter/simpler query or report no results—so pipeline runs complete despite transient failures.                                                                                                                       |

## 3. Applied in repo

- **postgres-admin.sql** (build agent `instructions`): Sections "Context: meta_info", "updatetodos payload", mandatory parent-tools checklist, tool-unavailable message, createsubtask parameters, strict order, and validation rule are added/updated in the instructions string.

## 4. Follow-ups (optional)

- Fix or relax `history_workflows_agents` response parsing so we can inspect real execution logs and refine the prompt from actual failures.
- Add a short "Build checklist" at the top of the instructions (5–6 bullet points) that the model can mentally tick off.
- If many runs fail on the same step, add a one-line "Common mistake" for that step in the prompt.
- **Pipeline instructions:** Add to build prompt (Optional / pipeline agent instructions): "If the pipeline uses search or API tools, include in its instructions: on timeout or 4xx, retry with a shorter query or report no results so the run can complete."
