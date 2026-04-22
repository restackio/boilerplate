import asyncio
from datetime import timedelta
from typing import Any

from openai.types.responses.response_error_event import (
    ResponseErrorEvent,
)
from pydantic import BaseModel
from restack_ai.agent import (
    NonRetryableError,
    ParentClosePolicy,
    agent,
    agent_info,
    all_events_finished,
    import_functions,
    log,
    uuid,
)

# `patched` is Temporal's version-safe code change primitive. Use it when
# adding new activity calls or timers to existing agent methods so that
# workflows already in-flight at deploy time don't hit non-determinism on
# replay. Not re-exported by restack_ai so we import it directly.
from temporalio.workflow import patched

from src.constants import TASK_QUEUE

# Patch IDs — Temporal uses these to gate new code paths. Never rename or
# remove an ID once it has been deployed, or existing workflows will break.
PATCH_SUBTASK_RECONCILIATION = "subtask-reconciliation-v1"
# Completes fan-out pipeline parents that never call `loadintodataset`
# themselves (their children do). Without this, such parents run forever
# because the only existing pipeline completion trigger keys off that MCP
# call. Gated because the new branch schedules activities and sets
# `self.end` in a replay-sensitive spot.
PATCH_PIPELINE_PARENT_COMPLETION = "pipeline-parent-completion-v1"

SLACK_FLUSH_THRESHOLD = 200


def _get(obj: object, key: str) -> object:
    """Get a value from a dict or object attribute (Restack may return either)."""
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def create_agent_error_event(
    message: str,
    error_type: str = "unknown_error",
    code: str | None = None,
    param: str | None = None,
    sequence_number: int = 0,
) -> ResponseErrorEvent:
    """Create an OpenAI-native error event for agent processing."""
    return ResponseErrorEvent(
        code=code or error_type,
        message=message,
        param=param,
        sequence_number=sequence_number,
        type="error",
    )


def create_agent_error_event_dict(
    message: str,
    error_type: str = "unknown_error",
    code: str | None = None,
    param: str | None = None,
    sequence_number: int = 0,
) -> dict[str, Any]:
    """Create error event dict for frontend display (state.events).

    Frontend expects event.type === 'error' and event.error with id, error_type, error_message, error_source.
    """
    code_val = code or error_type
    error_id = str(uuid())
    return {
        "type": "error",
        "code": code_val,
        "message": message,
        "param": param,
        "sequence_number": sequence_number,
        "error": {
            "id": error_id,
            "type": "error",
            "error_type": code_val,
            "error_message": message,
            "error_source": "backend",
            "error_details": {"code": code_val, "message": message, "param": param},
        },
    }


with import_functions():
    from src.functions.agent_subagents_crud import (
        AgentSubagentsReadInput,
        agent_subagents_read,
    )
    from src.functions.agent_tools_crud import (
        AgentToolsGetByAgentInput,
        agent_tools_read_by_agent,
    )
    from src.functions.agents_crud import (
        AgentIdInput,
        agents_get_by_id,
    )
    from src.functions.llm_prepare_response import (
        LlmPrepareResponseInput,
        llm_prepare_response,
    )
    from src.functions.llm_response_stream import (
        LlmResponseInput,
        Message,
        llm_response_stream,
    )
    from src.functions.send_agent_event import (
        SendAgentEventInput,
        send_agent_event,
    )
    from src.functions.slack_callback import (
        SlackPostMessageInput,
        SlackUpdateMessageInput,
        markdown_to_slack,
        slack_post_message,
        slack_update_message,
    )
    from src.functions.subtask_notify import (
        SubtaskNotifyInput,
        subtask_notify,
    )
    from src.functions.tasks_crud import (
        TaskCreateInput,
        TaskGetByIdInput,
        TaskSaveAgentStateInput,
        TaskUpdateInput,
        tasks_get_by_parent_id,
        tasks_save_agent_state,
        tasks_update,
    )


class MessagesEvent(BaseModel):
    messages: list[Message]
    source: str | None = None


class McpApprovalEvent(BaseModel):
    approval_id: str
    approved: bool


class EndEvent(BaseModel):
    end: bool


class SdkResponseEventData(BaseModel):
    type: str
    event: dict[str, Any]
    sequence_number: int | None = None
    timestamp: str | None = None
    item_id: str | None = None


class AgentTaskInput(BaseModel):
    title: str
    description: str
    status: str
    agent_id: str  # Database UUID
    assigned_to_id: str | None = None  # Database UUID
    task_id: str | None = None  # Database UUID
    user_id: str | None = None  # Database UUID
    workspace_id: str | None = None  # Database UUID
    parent_task_id: str | None = None  # Database UUID
    temporal_parent_agent_id: str | None = (
        None  # Temporal workflow ID for event routing
    )
    task_metadata: dict | None = None


@agent.defn()
class AgentTask:
    def __init__(self) -> None:
        self.end = False
        self.initialized = False
        self.agent_id = "None"
        self.task_id = None
        self.user_id = None
        self.assigned_to_id = None
        self.workspace_id = None
        self.agent_type = None
        self.task_metadata = {}
        self.messages = []
        self.tools = []
        self.events = []
        self.todos = {}
        self.subtasks = {}
        self.last_response_id = (
            None  # For conversation continuity
        )
        # Response tracking for continuous metrics
        self.response_index = (
            0  # Track which response in conversation
        )
        self.message_count = 0  # Total messages exchanged
        # Agent model configuration for GPT-5 features
        self.agent_model = None
        self.agent_reasoning_effort = None
        # Parent task tracking for subtask status updates
        self.parent_task_id = None  # Database UUID
        self.temporal_parent_agent_id = (
            None  # Temporal workflow ID for sending events
        )
        self.response_in_progress = (
            False  # Track if currently responding
        )
        self._slack_msg_ts = None
        self._slack_text_buf = ""
        self._slack_flush_len = 0

    def _format_todos_for_llm(
        self,
        todos: list[dict],
        completed: int,
        in_progress: int,
        total: int,
    ) -> str:
        """Format todos for LLM context (simple version).

        Based on: https://docs.claude.com/en/api/agent-sdk/todo-tracking
        """
        # Progress summary
        context = f"Progress: {completed}/{total} completed"
        if in_progress > 0:
            context += f", {in_progress} in progress"
        context += "\n\n"

        # List all todos with status indicators (natural order)
        for todo in todos:
            status_text = (
                "[COMPLETED]"
                if todo["status"] == "completed"
                else "[IN PROGRESS]"
            )
            context += f"{status_text} {todo['content']}\n"

        context += "\nUpdate status as you complete steps using updatetodos."

        return context

    @agent.state
    def state_response(self) -> dict[str, Any]:
        """Ultra-minimal state: just raw data in insertion order."""
        # Events are already in chronological order as they arrive
        # No sorting needed - trust insertion order
        return {
            "events": self.events,
            "messages": [
                msg.model_dump()
                if hasattr(msg, "model_dump")
                else msg
                for msg in self.messages
            ],
            "todos": list(
                self.todos.values()
            ),  # Include todos in state
            "subtasks": list(
                self.subtasks.values()
            ),  # Include subtasks for real-time status updates
            "task_id": self.task_id,
            "temporal_agent_id": agent_info().workflow_id,
            "last_response_id": self.last_response_id,
            "response_in_progress": self.response_in_progress,
            "initialized": self.initialized,
        }

    @agent.event
    async def messages(
        self, messages_event: MessagesEvent
    ) -> list[Message]:
        try:
            await agent.condition(
                lambda: self.initialized,
                timeout=timedelta(seconds=60),
            )

            # Store messages for OpenAI API call (so frontend sees them immediately)
            self.messages.extend(messages_event.messages)
            from_slack = messages_event.source == "slack"

            # Process each user message individually to maintain conversation continuity
            for _i, message in enumerate(messages_event.messages):
                if message.role == "user":
                    # Add user message to events for frontend
                    # Events are stored in insertion order (chronologically correct)
                    user_event = {
                        "type": "response.output_item.done",
                        "item": {
                            "id": f"msg_user_{uuid()}",
                            "type": "message",
                            "role": "user",
                            "status": "completed",
                            "content": [
                                {
                                    "type": "input_text",
                                    "text": message.content,
                                }
                            ],
                        },
                    }
                    self.events.append(user_event)

                    if not from_slack and self._has_slack_context():
                        await self._mirror_user_message_to_slack(message.content)

                try:
                    # Wait for any in-progress response to complete before starting new one
                    # This ensures last_response_id is fully committed before we use it
                    if self.response_in_progress:
                        await agent.condition(
                            lambda: not self.response_in_progress,
                            timeout=timedelta(minutes=10),
                        )

                    # Mark response as in progress
                    self.response_in_progress = True

                    # Step 1: prepare request for OpenAI (using current last_response_id for continuity)
                    prepared: LlmResponseInput = await agent.step(
                        function=llm_prepare_response,
                        function_input=LlmPrepareResponseInput(
                            messages=self.messages,
                            tools=self.tools,
                            model=self.agent_model,
                            reasoning_effort=self.agent_reasoning_effort,
                            previous_response_id=self.last_response_id,
                            task_id=str(self.task_id)
                            if self.task_id
                            else None,
                            agent_id=self.agent_id,
                            workspace_id=str(self.workspace_id)
                            if self.workspace_id
                            else None,
                        ),
                        task_queue=TASK_QUEUE,
                        start_to_close_timeout=timedelta(
                            seconds=60
                        ),
                    )

                    # Step 2: execute with streaming (function self-traces via decorator)
                    # Note: last_response_id is updated in real-time via response_item handler
                    completion = await agent.step(
                        function=llm_response_stream,
                        function_input=prepared,
                        task_queue=TASK_QUEUE,
                        start_to_close_timeout=timedelta(
                            minutes=10
                        ),
                    )
                except Exception as e:
                    self.response_in_progress = False

                    error_message = (
                        f"Error during llm_response_stream: {e}"
                    )

                    # Create error event for frontend display
                    self.events.append(
                        create_agent_error_event_dict(
                            message=error_message,
                            error_type="llm_response_failed",
                            code="agent_error",
                        )
                    )

                    raise NonRetryableError(error_message) from e
                else:
                    if completion.parsed_response:
                        log.info("TODO: save in db")

        except Exception as e:
            # Reset response_in_progress flag on error
            self.response_in_progress = False
            log.error(
                f"Error during message event: {e}. "
                f"Setting response_in_progress=False"
            )

            # Create error event for frontend display
            self.events.append(
                create_agent_error_event_dict(
                    message=f"Error processing message: {e}",
                    error_type="message_processing_failed",
                    code="agent_error",
                )
            )
            raise
        else:
            return self.messages

    @agent.event
    async def mcp_approval(
        self, approval_event: McpApprovalEvent
    ) -> dict:
        """Simple MCP approval - just send the approval response to OpenAI."""
        log.info(
            f"MCP approval: {approval_event.approval_id} - {'approved' if approval_event.approved else 'denied'}"
        )

        approval_input = LlmPrepareResponseInput(
            messages=self.messages,
            tools=self.tools,
            model=self.agent_model,
            reasoning_effort=self.agent_reasoning_effort,
            previous_response_id=self.last_response_id,
            approval_response={
                "type": "mcp_approval_response",
                "approve": approval_event.approved,
                "approval_request_id": approval_event.approval_id,
            },
            task_id=str(self.task_id) if self.task_id else None,
            agent_id=self.agent_id,
            workspace_id=str(self.workspace_id)
            if self.workspace_id
            else None,
        )

        prepared = await agent.step(
            function=llm_prepare_response,
            function_input=approval_input,
            task_queue=TASK_QUEUE,
        )

        # Note: last_response_id is updated in real-time via response_item handler
        _ = await agent.step(
            function=llm_response_stream,
            function_input=prepared,
            task_queue=TASK_QUEUE,
            start_to_close_timeout=timedelta(seconds=120),
        )

        return {
            "approval_id": approval_event.approval_id,
            "processed": True,
        }

    @agent.event
    async def todo_update(self, update_data: dict) -> dict:
        """Update todos in agent state (simple - just replace full list).

        Args:
            update_data: Dict containing todos (list of {id, content, status})

        Returns:
            Dict with success status and current todos
        """
        try:
            todos_list = update_data.get("todos", [])

            # Replace todos with new list (agent sends full current state)
            self.todos = {}
            for todo in todos_list:
                todo_id = str(todo.get("id"))
                self.todos[todo_id] = {
                    "id": todo_id,
                    "content": todo.get("content", ""),
                    "status": todo.get(
                        "status", "in_progress"
                    ),  # Only in_progress or completed
                }

            # Calculate progress
            todos_values = list(self.todos.values())
            completed = sum(
                1
                for t in todos_values
                if t["status"] == "completed"
            )
            in_progress = sum(
                1
                for t in todos_values
                if t["status"] == "in_progress"
            )
            total = len(todos_values)

            # Inject todo context into messages for LLM awareness
            # Following Claude Agent SDK pattern: https://docs.claude.com/en/api/agent-sdk/todo-tracking
            if todos_values:
                todo_context = self._format_todos_for_llm(
                    todos_values, completed, in_progress, total
                )
                self.messages.append(
                    Message(
                        role="developer", content=todo_context
                    )
                )
                log.info(
                    "Todo context injected into message stream for LLM awareness"
                )

            log.info(
                f"Todos updated: {completed}/{total} completed, {in_progress} in progress"
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(f"Error updating todos: {e}")
            self.events.append(
                create_agent_error_event_dict(
                    message=f"Error updating todos: {e}",
                    error_type="todo_update_failed",
                    code="agent_error",
                )
            )
            return {
                "success": False,
                "error": str(e),
                "todos": [],
            }
        else:
            return {
                "success": True,
                "todos": todos_values,
                "message": f"Todos updated: {completed}/{total} completed, {in_progress} in progress",
            }

    @agent.event
    async def subtask_create(self, create_data: dict) -> dict:
        """Create a subtask with another agent.

        Creates the subtask via TasksCreateWorkflow and stores minimal state.
        All clients (web, mobile, desktop) subscribe to this state for real-time updates.

        Args:
            create_data: Dict containing {agent_id, task_title, task_description}

        Returns:
            Dict with success status and subtask info
        """
        try:
            agent_id = create_data.get("agent_id", "")
            task_title = create_data.get("task_title", "")
            parent_workflow_id = agent_info().workflow_id

            # Get agent info for display
            agent_result = await agent.step(
                function=agents_get_by_id,
                function_input=AgentIdInput(agent_id=agent_id),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
            agent_name = (
                agent_result.agent.name
                if agent_result and agent_result.agent
                else "Unknown"
            )

            # Create and start child task using TasksCreateWorkflow
            task_input = TaskCreateInput(
                workspace_id=self.workspace_id,
                title=task_title,
                description=create_data.get(
                    "task_description", ""
                ),
                agent_id=agent_id,
                assigned_to_id=self.user_id,
                status="in_progress",
                parent_task_id=self.task_id,
                temporal_parent_agent_id=parent_workflow_id,
            )

            child_workflow_id = f"task_create_{uuid()}"
            task_result = await agent.child_execute(
                workflow="TasksCreateWorkflow",
                workflow_id=child_workflow_id,
                workflow_input=task_input,
                task_queue=TASK_QUEUE,
            )

            # Store minimal state (for multi-client real-time updates)
            child_task_id = str(task_result["task"]["id"])
            self.subtasks[child_task_id] = {
                "task_id": child_task_id,
                "title": task_title,
                "agent_name": agent_name,
                "status": "in_progress",
            }

            log.info(
                f"Subtask created and registered: {child_task_id} for parent: {self.task_id}"
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(f"Error creating subtask: {e}")
            return {"success": False, "error": str(e)}
        else:
            return {
                "success": True,
                "task_id": child_task_id,
                "message": f"Subtask '{task_title}' created",
            }

    def _apply_unknown_subtask_notification(
        self,
        task_id: str,
        title: str,
        status: str,
        message: str,
    ) -> None:
        """Handle `subtask_notify` for a `task_id` not yet in `self.subtasks`.

        Expected race: `subtask_create` launches the child via
        `await agent.child_execute(TasksCreateWorkflow, ...)` and only writes
        `self.subtasks[child_task_id]` after that await returns. The child
        itself fires `subtask_notify(started)` at boot, which can arrive here
        while `subtask_create` is still yielded. So "task_id not in
        self.subtasks" on a `started` notification is expected and benign —
        `subtask_create` will register the entry as `in_progress` shortly.

        Terminal notifications (completed/failed) for an unknown id are NOT
        expected (the child has to actually run before reaching a terminal
        state, which takes far longer than child_execute's return). If one
        does arrive early, seed a minimal entry from the payload so we don't
        silently lose it and the `all_terminal` check still fires correctly.
        """
        if status == "started":
            log.info(
                f"Subtask {task_id} 'started' notification arrived "
                f"before subtask_create finished registering it "
                f"(expected race with child_execute); will be "
                f"reconciled when subtask_create resumes."
            )
            return

        log.warning(
            f"Subtask {task_id} terminal notification ({status}) "
            f"arrived before registration — seeding entry from payload "
            f"so it is not lost."
        )
        seeded: dict = {
            "task_id": task_id,
            "title": title,
            "agent_name": "Unknown",
            "status": status,
        }
        if status == "failed" and message:
            seeded["error"] = message
        self.subtasks[task_id] = seeded

    @agent.event
    async def subtask_notify(self, notify_data: dict) -> dict:
        """Handle subtask lifecycle notifications (lightweight state updates).

        Called by child agents for important events: started, completed, failed.
        Updates minimal state for real-time multi-client synchronization.

        Args:
            notify_data: Dict containing {task_id, title, status, message}

        Returns:
            Dict with success status
        """
        try:
            task_id = str(notify_data.get("task_id", ""))
            title = notify_data.get("title", "Subtask")
            status = notify_data.get("status", "")
            message = notify_data.get("message", "")

            log.info(
                f"Subtask notification: {title} ({task_id}) → {status}"
            )

            # Update minimal state (all subscribed clients get update instantly).
            # See `_apply_subtask_notification` for the expected-race
            # handling when `task_id` isn't in `self.subtasks` yet.
            if task_id in self.subtasks:
                self.subtasks[task_id]["status"] = status
                if status == "completed":
                    log.info(f"Subtask completed: {title}")
                elif status == "failed":
                    self.subtasks[task_id]["error"] = message
                    log.warning(
                        f"Subtask failed: {title} - {message}"
                    )
            else:
                self._apply_unknown_subtask_notification(
                    task_id, title, status, message
                )

            # Check if all subtasks have reached terminal state
            all_terminal = all(
                subtask["status"] in ["completed", "failed"]
                for subtask in self.subtasks.values()
            )

            # Send developer message to LLM only when ALL subtasks are done
            if all_terminal and self.subtasks:
                # Build summary of all subtasks
                completed_count = sum(
                    1
                    for s in self.subtasks.values()
                    if s["status"] == "completed"
                )
                failed_count = sum(
                    1
                    for s in self.subtasks.values()
                    if s["status"] == "failed"
                )

                subtask_summary = f"All subtasks completed: {completed_count} successful, {failed_count} failed\n\n"
                subtask_summary += "Details:\n"
                for subtask in self.subtasks.values():
                    subtask_status = subtask["status"]
                    subtask_title = subtask["title"]
                    subtask_summary += (
                        f"- {subtask_title}: {subtask_status}"
                    )
                    if (
                        subtask_status == "failed"
                        and "error" in subtask
                    ):
                        subtask_summary += (
                            f" - {subtask['error']}"
                        )
                    subtask_summary += "\n"

                # Send event to trigger LLM processing using agent.step
                developer_message = Message(
                    role="developer", content=subtask_summary
                )
                await agent.step(
                    function=send_agent_event,
                    function_input=SendAgentEventInput(
                        event_name="messages",
                        temporal_agent_id=agent_info().workflow_id,
                        event_input={
                            "messages": [
                                developer_message.model_dump()
                            ]
                        },
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                log.info(
                    f"All subtasks completed - status update sent to LLM ({completed_count} successful, {failed_count} failed)"
                )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(f"Error handling subtask notification: {e}")
            return {"success": False, "error": str(e)}
        else:
            return {"success": True}

    async def _handle_error_event(self, event_data: dict) -> None:
        """Handle OpenAI/MCP error events. Supports both nested event.error and top-level code/message."""
        error_info = event_data.get("error") or event_data
        if not isinstance(error_info, dict):
            error_info = {}
        event_type = event_data.get("type", "")
        message = error_info.get("message") or event_data.get("message") or "Unknown error"
        code = (
            error_info.get("code")
            or event_data.get("code")
            or ("openai_error" if "mcp" not in event_type else "mcp_error")
        )
        self.events.append(
            create_agent_error_event_dict(
                message=message,
                error_type=error_info.get("type") or event_data.get("type") or "unknown_error",
                code=code,
                param=error_info.get("param") or event_data.get("param"),
                sequence_number=event_data.get("sequence_number", 0),
            )
        )
        log.error(f"OpenAI/MCP error: code={code} message={message[:200]}")

        # Notify parent of error if this is a subtask
        if self.temporal_parent_agent_id and self.task_id:
            await agent.step(
                function=subtask_notify,
                function_input=SubtaskNotifyInput(
                    temporal_parent_agent_id=self.temporal_parent_agent_id,
                    task_id=self.task_id,
                    title=self.title,
                    status="failed",
                    message=error_info.get(
                        "message", "Unknown error"
                    ),
                ),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )

    def _has_slack_context(self) -> bool:
        meta = self.task_metadata or {}
        return bool(meta.get("slack_channel"))

    async def _mirror_user_message_to_slack(self, content: str) -> None:
        """Post a dashboard-originated user message into the Slack thread."""
        try:
            await agent.step(
                function=slack_post_message,
                function_input=SlackPostMessageInput(
                    channel=self.task_metadata["slack_channel"],
                    text=f"💬 *From dashboard:*\n{markdown_to_slack(content)}",
                    thread_ts=self.task_metadata.get("slack_thread_ts"),
                    slack_team_id=self.task_metadata.get("slack_team_id"),
                ),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )
        except (OSError, ValueError, TypeError) as e:
            log.warning(f"Failed to mirror user message to Slack: {e}")

    async def _slack_post_or_update(
        self, text: str, *, final: bool = False
    ) -> None:
        """Post or progressively update a Slack message in the originating thread."""
        if not self._has_slack_context():
            return
        meta = self.task_metadata
        channel = meta["slack_channel"]
        thread_ts = meta.get("slack_thread_ts") or None
        team_id = meta.get("slack_team_id")

        display = markdown_to_slack(text.strip())
        if not display:
            return

        if not final:
            display += " ..."

        try:
            if self._slack_msg_ts is None:
                result = await agent.step(
                    function=slack_post_message,
                    function_input=SlackPostMessageInput(
                        channel=channel,
                        text=display,
                        thread_ts=thread_ts,
                        slack_team_id=team_id,
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                ok = _get(result, "ok")
                msg_ts = _get(result, "message_ts")
                if ok and msg_ts:
                    self._slack_msg_ts = msg_ts
                    self._slack_flush_len = len(text)
            else:
                update_result = await agent.step(
                    function=slack_update_message,
                    function_input=SlackUpdateMessageInput(
                        channel=channel,
                        ts=self._slack_msg_ts,
                        text=display,
                        slack_team_id=team_id,
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                if _get(update_result, "ok"):
                    self._slack_flush_len = len(text)
                else:
                    self._slack_msg_ts = None
        except (OSError, ValueError, TypeError) as e:
            log.warning(f"Slack streaming error: {e}")
            self._slack_msg_ts = None

    def _extract_assistant_content(self, response: dict) -> str:
        """Extract assistant content from response output."""
        assistant_content = ""
        if "output" in response:
            for output_item in response["output"]:
                if (
                    output_item.get("type") == "message"
                    and output_item.get("role") == "assistant"
                ):
                    for content in output_item.get("content", []):
                        if content.get("type") == "output_text":
                            assistant_content += content.get(
                                "text", ""
                            )
        return assistant_content

    async def _trigger_metrics_evaluation(
        self,
        response: dict,
        response_id: str,
        assistant_content: str,
    ) -> None:
        """Trigger continuous metrics evaluation workflow."""
        user_message = next(
            (
                msg
                for msg in reversed(self.messages)
                if msg.role == "user"
            ),
            None,
        )

        usage = response.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)

        log.info(
            f"Response {self.response_index} completed for task {self.task_id}. "
            "Triggering continuous metrics evaluation..."
        )

        try:
            await agent.child_start(
                workflow="TaskMetricsWorkflow",
                workflow_id=f"metrics_{self.task_id}_{response_id}",
                workflow_input={
                    "task_id": self.task_id,
                    "agent_id": self.agent_id,
                    "agent_name": getattr(
                        self, "agent_name", "Unknown"
                    ),
                    "parent_agent_id": None,
                    "workspace_id": self.workspace_id,
                    "agent_version": "draft"
                    if self.parent_task_id is None
                    else "v1",
                    "response_id": response_id,
                    "response_index": self.response_index,
                    "message_count": len(self.messages),
                    "task_input": user_message.content
                    if user_message
                    else "",
                    "task_output": assistant_content,
                    "duration_ms": 0,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "status": "completed",
                    "run_quality_metrics": True,
                },
                task_queue=TASK_QUEUE,
                parent_close_policy=ParentClosePolicy.ABANDON,
            )
            log.info(
                f"Continuous metrics workflow started (parallel) for response {self.response_index}"
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.warning(
                f"Failed to start continuous metrics workflow: {e}"
            )

    async def _save_final_state(self) -> None:
        """Save complete agent state to database when task completes.

        This creates a durable snapshot that survives after Temporal workflow expires.
        Only called once when task finishes (completed/failed/closed).
        While task is in_progress, frontend uses real-time Temporal state.
        """
        if not self.task_id:
            log.warning("No task_id - cannot save final state")
            return

        try:
            # Before snapshotting, pull any missed terminal statuses from the
            # child tasks table. Defends against lost `subtask_notify` events
            # that would otherwise leave the persisted snapshot lying about
            # which children are still "in_progress".
            #
            # Gated by `patched()`: this schedules a new activity
            # (`tasks_get_by_parent_id`) that old workflow histories don't
            # have, so running it unconditionally would cause non-determinism
            # on replay of in-flight workflows at deploy time.
            if patched(PATCH_SUBTASK_RECONCILIATION):
                await self._reconcile_subtasks_from_db()

            # Get complete final state from state_response()
            final_state = self.state_response()

            # Add completion metadata
            final_state["metadata"] = {
                **final_state.get("metadata", {}),
                "temporal_agent_id": agent_info().workflow_id,
                "temporal_run_id": agent_info().run_id,
                "response_count": self.response_index,
                "message_count": len(self.messages),
            }

            # Save state to database
            await agent.step(
                function=tasks_save_agent_state,
                function_input=TaskSaveAgentStateInput(
                    task_id=str(self.task_id),
                    agent_state=final_state,
                ),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=15),
            )

            log.info(
                f"Final state saved to database for task {self.task_id} "
                f"({len(final_state.get('events', []))} events, "
                f"{len(final_state.get('todos', []))} todos, "
                f"{len(final_state.get('subtasks', []))} subtasks)"
            )

        except Exception as e:  # noqa: BLE001
            log.error(f"Failed to save final state: {e}")
            # Don't re-raise - state save failure shouldn't block workflow completion

    async def _wait_for_subtasks_to_finish(
        self,
        max_wait: timedelta = timedelta(minutes=30),
        context: str = "completion",
    ) -> None:
        """Block until every spawned subtask has reached a terminal state.

        Without this, a parent agent that finishes its own work (e.g. its own
        `loadintodataset` call fires, or an external `end` event arrives) would
        mark `self.end = True` while child `AgentTask` workflows are still
        running. That leaves their `subtask_notify` callbacks landing on a
        completed parent workflow — which Temporal rejects with "workflow
        execution already completed" — and freezes `self.subtasks[id].status`
        at `"in_progress"` forever, causing the UI to lie about child state.

        Only waits when `self.subtasks` has at least one non-terminal entry.
        On timeout it logs a warning and returns (the parent will still end,
        and `_save_final_state` / `_reconcile_subtasks_from_db` will correct
        whatever it can from the database).
        """
        if not self.subtasks:
            return

        terminal = ("completed", "failed")
        pending = [
            s for s in self.subtasks.values() if s.get("status") not in terminal
        ]
        if not pending:
            return

        log.info(
            f"Parent {self.task_id} waiting for {len(pending)} in-flight "
            f"subtask(s) before {context}"
        )
        try:
            await agent.condition(
                lambda: all(
                    s.get("status") in terminal
                    for s in self.subtasks.values()
                ),
                timeout=max_wait,
            )
            log.info(
                f"Parent {self.task_id}: all subtasks reached terminal state"
            )
        except TimeoutError:
            still_pending = [
                s["task_id"]
                for s in self.subtasks.values()
                if s.get("status") not in terminal
            ]
            log.warning(
                f"Parent {self.task_id} timed out waiting for "
                f"{len(still_pending)} subtask(s); continuing anyway. "
                f"Pending: {still_pending}"
            )

    async def _reconcile_subtasks_from_db(self) -> None:
        """Overlay canonical child Task.status from DB onto `self.subtasks`.

        Safety net for the edge case where a child's `subtask_notify` event
        was lost (e.g. parent completed before the event landed, or a worker
        restarted mid-notification). We query the child tasks table by
        `parent_task_id` and, for every in-memory subtask still marked
        non-terminal, copy the DB status over. Terminal states already in
        memory are left alone (they came from real notifications).
        """
        if not self.task_id or not self.subtasks:
            return

        try:
            result = await agent.step(
                function=tasks_get_by_parent_id,
                function_input=TaskGetByIdInput(
                    task_id=str(self.task_id)
                ),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )
        except Exception as e:  # noqa: BLE001
            log.warning(
                f"Failed to reconcile subtasks from DB for {self.task_id}: {e}"
            )
            return

        db_rows = _get(result, "tasks") or []
        terminal = ("completed", "failed")
        reconciled = 0
        for row in db_rows:
            row_id = _get(row, "id")
            row_status = _get(row, "status")
            if not row_id or not row_status:
                continue
            row_id = str(row_id)
            if row_id not in self.subtasks:
                continue
            in_memory = self.subtasks[row_id].get("status")
            if in_memory in terminal:
                continue
            if row_status in terminal:
                self.subtasks[row_id]["status"] = row_status
                reconciled += 1

        if reconciled:
            log.info(
                f"Reconciled {reconciled} subtask status(es) from DB for "
                f"parent {self.task_id}"
            )

    async def _handle_pipeline_completion(self) -> None:
        """Handle pipeline MCP call completion."""
        log.info(
            f"Pipeline agent {self.agent_id} completed data loading for task {self.task_id}"
        )

        # Wait for any in-flight subtasks BEFORE saving state or marking end.
        # Otherwise the parent's `_save_final_state` would capture stale
        # subtask statuses and its workflow would terminate before children's
        # `subtask_notify` events could land.
        #
        # Gated by `patched()`: workflows started before this patch was
        # deployed won't run the wait (their history doesn't include the
        # timer that `agent.condition(..., timeout=...)` schedules, so
        # running it would trigger a non-determinism error during replay).
        if patched(PATCH_SUBTASK_RECONCILIATION):
            await self._wait_for_subtasks_to_finish(
                context="pipeline completion"
            )

        # Save final state before marking complete
        await self._save_final_state()

        await agent.step(
            function=tasks_update,
            function_input=TaskUpdateInput(
                task_id=self.task_id,
                status="completed",
            ),
            task_queue=TASK_QUEUE,
            start_to_close_timeout=timedelta(seconds=30),
        )

        # Notify parent of completion if this is a subtask
        if self.temporal_parent_agent_id and self.task_id:
            await agent.step(
                function=subtask_notify,
                function_input=SubtaskNotifyInput(
                    temporal_parent_agent_id=self.temporal_parent_agent_id,
                    task_id=self.task_id,
                    title=self.title,
                    status="completed",
                ),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )

        self.end = True
        log.info(
            f"Pipeline agent {self.agent_id} workflow marked for completion"
        )

    @agent.event
    async def response_item(  # noqa: C901
        self, event_data: dict
    ) -> dict:
        """Store OpenAI ResponseStreamEvent in insertion order."""
        try:
            event_type = event_data.get("type", "")

            # Update last_response_id immediately on response.created
            # This ensures continuity even if user sends another message while streaming
            if (
                event_type == "response.created"
                and event_data.get("response", {}).get("id")
            ):
                response_id = event_data["response"]["id"]
                log.info(
                    f"Response created: {response_id} (previous: {self.last_response_id})"
                )
                self.last_response_id = response_id
                self.response_index += 1

            # Store events in chronological insertion order
            # Handle error events
            if "error" in event_type or event_data.get("error"):
                await self._handle_error_event(event_data)
                # Also store the original event so frontend can display it
                self.events.append(event_data)
            else:
                # Store normal events
                self.events.append(event_data)

            # Progressive Slack streaming: accumulate text deltas
            if (
                event_type == "response.output_text.delta"
                and self._has_slack_context()
            ):
                delta = event_data.get("delta") or ""
                self._slack_text_buf += delta
                if (
                    len(self._slack_text_buf)
                    - self._slack_flush_len
                    >= SLACK_FLUSH_THRESHOLD
                ):
                    await self._slack_post_or_update(
                        self._slack_text_buf
                    )

            # On response.created, reset the Slack streaming buffer
            if (
                event_type == "response.created"
                and self._has_slack_context()
            ):
                self._slack_text_buf = ""
                self._slack_flush_len = 0
                self._slack_msg_ts = None

            # Handle response.completed events with state persistence and metrics
            if (
                event_data.get("type") == "response.completed"
                and "response" in event_data
                and self.task_id
                and self.workspace_id
            ):
                response = event_data["response"]
                response_id = response.get("id")
                self.response_in_progress = False
                # Persist agent state first (fire-and-forget) so messages/todos/subtasks
                # survive when the user leaves and returns; don't block on save
                save_task = asyncio.create_task(self._save_final_state())
                save_task.add_done_callback(
                    lambda t: log.warning("State save failed: %s", t.exception())
                    if not t.cancelled() and t.exception() else None
                )
                assistant_content = (
                    self._extract_assistant_content(response)
                )
                await self._trigger_metrics_evaluation(
                    response, response_id, assistant_content
                )

                # Post or finalize the response in the Slack thread
                if (
                    assistant_content
                    and self._has_slack_context()
                ):
                    await self._slack_post_or_update(
                        assistant_content, final=True
                    )

            # Handle pipeline MCP call completion
            if (
                self.agent_type == "pipeline"
                and event_data.get("type")
                == "response.output_item.done"
                and event_data.get("item", {}).get("type")
                == "mcp_call"
                and event_data.get("item", {}).get("name")
                == "loadintodataset"
                and event_data.get("item", {}).get("status")
                == "completed"
            ):
                await self._handle_pipeline_completion()

            # Fan-out pipeline parents (e.g. a batch agent that spawns one
            # child per ticket) never call `loadintodataset` themselves —
            # their children do. Without a second completion trigger, the
            # parent's workflow runs forever: `subtask_notify` flips all
            # children to terminal, the developer-message path fires an
            # LLM summary turn, that turn's `response.completed` persists
            # the final snapshot… and then nothing sets `self.end`. Close
            # the loop here: once every known subtask is terminal and the
            # LLM has delivered its final turn, complete the parent.
            #
            # Safety:
            # - Only fires when this agent has at least one subtask, so
            #   leaf pipeline agents still complete via `loadintodataset`.
            # - Skipped for non-pipeline (e.g. interactive) agents, which
            #   are expected to stay open awaiting user input.
            # - `not self.end` prevents double-completion if the user
            #   sends more messages and the LLM takes another turn.
            # - Patched because it schedules the same activities as
            #   `_handle_pipeline_completion`, and adding those mid-run
            #   would non-determine any workflow already past this point.
            if (
                patched(PATCH_PIPELINE_PARENT_COMPLETION)
                and self.agent_type == "pipeline"
                and event_data.get("type") == "response.completed"
                and not self.end
                and self.subtasks
                and all(
                    (s.get("status") if isinstance(s, dict) else None)
                    in ("completed", "failed")
                    for s in self.subtasks.values()
                )
            ):
                log.info(
                    f"Pipeline parent {self.agent_id} has all "
                    f"{len(self.subtasks)} subtasks terminal and finished "
                    f"its summary turn — auto-completing."
                )
                await self._handle_pipeline_completion()

        except ValueError as e:
            log.error(f"Error handling response_item: {e}")
            self.events.append(
                create_agent_error_event_dict(
                    message=f"Error processing response item: {e}",
                    error_type="response_processing_failed",
                    code="agent_error",
                )
            )
            return {"processed": False, "error": str(e)}
        else:
            return {"processed": True}

    @agent.event
    async def end(self, _end_event: EndEvent) -> EndEvent:
        log.info("Received end")
        # Same contract as `_handle_pipeline_completion`: don't terminate while
        # child agents are still running. This covers externally-signalled
        # ends (e.g. user cancel) and the post-error path that relies on `end`
        # being sent after `_handle_error_event`.
        #
        # Gated by `patched()`: both calls schedule new activities/timers not
        # present in old workflow histories. Without the gate, any in-flight
        # workflow that receives an `end` event after this deploy would fail
        # replay with a non-determinism error.
        if patched(PATCH_SUBTASK_RECONCILIATION):
            await self._wait_for_subtasks_to_finish(
                context="end event"
            )
            await self._save_final_state()
        self.end = True
        return {"end": True}

    @agent.run
    async def run(  # noqa: PLR0915
        self, agent_input: AgentTaskInput
    ) -> None:
        self.agent_id = agent_input.agent_id
        self.task_id = agent_input.task_id
        self.user_id = agent_input.user_id
        self.assigned_to_id = agent_input.assigned_to_id
        self.workspace_id = agent_input.workspace_id
        self.title = agent_input.title
        self.description = agent_input.description
        self.status = agent_input.status

        # Set parent info if this is a subtask (passed directly from workflow)
        self.parent_task_id = agent_input.parent_task_id
        self.temporal_parent_agent_id = (
            agent_input.temporal_parent_agent_id
        )
        self.task_metadata = agent_input.task_metadata or {}

        meta_info = {
            "agent_id": self.agent_id,
            "task_id": self.task_id,
            "workspace_id": agent_input.workspace_id,
            "temporal_agent_id": agent_info().workflow_id,
            "temporal_run_id": agent_info().run_id,
        }

        # Notify parent if this is a subtask (lightweight notification)
        if self.temporal_parent_agent_id and self.task_id:
            log.info(
                f"Subtask detected. Parent task: {self.parent_task_id}, "
                f"Parent Temporal agent: {self.temporal_parent_agent_id}"
            )
            await agent.step(
                function=subtask_notify,
                function_input=SubtaskNotifyInput(
                    temporal_parent_agent_id=self.temporal_parent_agent_id,
                    task_id=self.task_id,
                    title=self.title,
                    status="started",
                ),
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )

        agent_result = await agent.step(
            function=agents_get_by_id,
            function_input=AgentIdInput(agent_id=self.agent_id),
            task_queue=TASK_QUEUE,
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.info(
            "AgentTask agents_get_by_id result",
            result=agent_result,
        )

        if agent_result.agent:
            agent_data = agent_result.agent
            self.agent_model = agent_data.model
            self.agent_reasoning_effort = (
                agent_data.reasoning_effort
            )
            self.agent_type = agent_data.type

            if (
                agent_data.instructions
                and agent_data.instructions.strip()
            ):
                instructions = agent_data.instructions

                self.messages.append(
                    Message(
                        role="developer",
                        content=f"{instructions}. Markdown is supported. Use headings wherever appropriate. Agent meta info: {meta_info!s}",
                    )
                )
        else:
            raise NonRetryableError(
                message=f"Agent with id {self.agent_id} not found"
            )

        tools_result = await agent.step(
            function=agent_tools_read_by_agent,
            function_input=AgentToolsGetByAgentInput(
                agent_id=self.agent_id,
                user_id=agent_input.user_id,
            ),
            task_queue=TASK_QUEUE,
            start_to_close_timeout=timedelta(seconds=30),
        )
        self.tools = tools_result.tools or []

        # Check if createsubtask tool is enabled and append subagents list
        # MCP tools have their names in the 'allowed_tools' array
        has_createsubtask = any(
            (
                tool.get("type") == "mcp"
                and tool.get("allowed_tools")
                and "createsubtask"
                in tool.get("allowed_tools", [])
            )
            for tool in self.tools
        )

        log.info(
            "AgentTask: Checked for createsubtask tool",
            has_createsubtask=has_createsubtask,
            tools_count=len(self.tools),
        )

        if has_createsubtask:
            try:
                # Fetch configured subagents using step function (proper Restack pattern)
                log.info(
                    "AgentTask: Fetching subagents for agent",
                    agent_id=self.agent_id,
                )

                subagents_result = await agent.step(
                    function=agent_subagents_read,
                    function_input=AgentSubagentsReadInput(
                        parent_agent_id=self.agent_id
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(
                        seconds=60
                    ),  # Increased timeout for reliability
                )

                # Format subagents list and append to instructions
                if (
                    subagents_result
                    and subagents_result.subagents
                ):
                    subagents_list = []
                    for subagent in subagents_result.subagents:
                        type_label = (
                            "Pipeline"
                            if subagent.type == "pipeline"
                            else "Interactive"
                        )
                        subagents_list.append(
                            f"- `{subagent.id}` - **{subagent.name}**: {subagent.description or 'No description'} (Type: {type_label})"
                        )
                    subagents_text = (
                        "\n\n## Available Subagents for subtask creation\n"
                        + "\n".join(subagents_list)
                    )

                    # Append to existing messages
                    self.messages.append(
                        Message(
                            role="developer",
                            content=subagents_text,
                        )
                    )

                    log.debug(
                        "AgentTask: Subagents successfully loaded and appended to instructions",
                        count=len(subagents_result.subagents),
                        agent_id=self.agent_id,
                    )
                else:
                    log.debug(
                        "AgentTask: No subagents configured for this agent",
                        agent_id=self.agent_id,
                    )

            except (
                ValueError,
                TypeError,
                RuntimeError,
                AttributeError,
            ) as e:
                log.error(
                    "AgentTask: Failed to load subagents",
                    error=str(e),
                    agent_id=self.agent_id,
                )

        self.initialized = True

        log.info("AgentTask agent_id", agent_id=self.agent_id)

        # Wait for workflow completion
        # Note: Tracing happens at operation level (e.g., in llm_response_stream)
        # not at workflow level, since workflows can run for extended periods
        await agent.condition(
            lambda: self.end and all_events_finished()
        )

        # Save final state to database when workflow completes
        log.info(
            "Workflow completing - saving final state snapshot"
        )
        await self._save_final_state()
