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
    from src.functions.subtask_notify import (
        SubtaskNotifyInput,
        subtask_notify,
    )
    from src.functions.tasks_crud import (
        TaskCreateInput,
        TaskUpdateInput,
        tasks_update,
    )


class MessagesEvent(BaseModel):
    messages: list[Message]


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
        context = f"📋 Progress: {completed}/{total} completed"
        if in_progress > 0:
            context += f", {in_progress} in progress"
        context += "\n\n"

        # List all todos with visual indicators (natural order)
        for todo in todos:
            icon = "✅" if todo["status"] == "completed" else "🔧"
            context += f"{icon} {todo['content']}\n"

        context += "\n💡 Update status as you complete steps using updatetodos."

        return context

    @agent.state
    def state_response(self) -> dict[str, Any]:
        """Ultra-minimal state: just raw data, properly sorted."""
        # Just sort events by sequence number - no transformation
        sorted_events = sorted(
            self.events, key=lambda e: e.get("sequence_number", 0)
        )

        return {
            "events": sorted_events,
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

            # Store messages for OpenAI API call
            self.messages.extend(messages_event.messages)

            # Process each user message individually to maintain conversation continuity
            for _i, message in enumerate(messages_event.messages):
                if message.role == "user":
                    # Add user message to events for frontend
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

                    try:
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
                                workspace_id=str(
                                    self.workspace_id
                                )
                                if self.workspace_id
                                else None,
                            ),
                            start_to_close_timeout=timedelta(
                                seconds=60
                            ),
                        )

                        # Step 2: execute with streaming (function self-traces via decorator)
                        completion = await agent.step(
                            function=llm_response_stream,
                            function_input=prepared,
                            start_to_close_timeout=timedelta(
                                minutes=10
                            ),
                        )
                    except Exception as e:
                        error_message = f"Error during llm_response_stream: {e}"

                        # Create error event for frontend display
                        error_event = create_agent_error_event(
                            message=error_message,
                            error_type="llm_response_failed",
                            code="agent_error",
                        )
                        self.events.append(
                            error_event.model_dump()
                        )

                        raise NonRetryableError(
                            error_message
                        ) from e
                    else:
                        if completion.parsed_response:
                            log.info("TODO: save in db")

        except Exception as e:
            log.error(f"Error during message event: {e}")

            # Create error event for frontend display
            error_event = create_agent_error_event(
                message=f"Error processing message: {e}",
                error_type="message_processing_failed",
                code="agent_error",
            )
            self.events.append(error_event.model_dump())
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
        )

        await agent.step(
            function=llm_response_stream,
            function_input=prepared,
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

            return {
                "success": True,
                "todos": todos_values,
                "message": f"✓ Todos updated: {completed}/{total} completed, {in_progress} in progress",
            }

        except Exception as e:
            log.error(f"Error updating todos: {e}")
            error_event = create_agent_error_event(
                message=f"Error updating todos: {e}",
                error_type="todo_update_failed",
                code="agent_error",
            )
            self.events.append(error_event.model_dump())
            return {
                "success": False,
                "error": str(e),
                "todos": [],
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

            return {
                "success": True,
                "task_id": child_task_id,
                "message": f"✓ Subtask '{task_title}' created",
            }

        except Exception as e:
            log.error(f"Error creating subtask: {e}")
            return {"success": False, "error": str(e)}

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

            # Update minimal state (all subscribed clients get update instantly)
            if task_id in self.subtasks:
                self.subtasks[task_id]["status"] = status
                if status == "completed":
                    log.info(f"✓ Subtask completed: {title}")
                elif status == "failed":
                    self.subtasks[task_id]["error"] = message
                    log.warning(
                        f"✗ Subtask failed: {title} - {message}"
                    )
            else:
                log.warning(
                    f"Subtask {task_id} not found in state"
                )

            return {"success": True}

        except Exception as e:
            log.error(f"Error handling subtask notification: {e}")
            return {"success": False, "error": str(e)}

    @agent.event
    async def response_item(self, event_data: dict) -> dict:
        """Store OpenAI ResponseStreamEvent in simple format."""
        try:
            # Check for OpenAI error events and convert them to our error format
            event_type = event_data.get("type", "")

            if "error" in event_type or event_data.get("error"):
                # Handle OpenAI/MCP errors using native OpenAI error format
                error_info = event_data.get("error", {})
                error_event = create_agent_error_event(
                    message=error_info.get(
                        "message", "Unknown OpenAI error"
                    ),
                    error_type=error_info.get(
                        "type", "unknown_error"
                    ),
                    code=error_info.get("code")
                    or (
                        "openai_error"
                        if "mcp" not in event_type
                        else "mcp_error"
                    ),
                    param=error_info.get("param"),
                )
                self.events.append(error_event.model_dump())
                log.error(f"OpenAI/MCP error: {error_info}")

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
                        start_to_close_timeout=timedelta(
                            seconds=10
                        ),
                    )
            else:
                # Store normal events
                self.events.append(event_data)

            # Extract response_id from response.created event for conversation continuity
            if (
                event_data.get("type") == "response.created"
                and "response" in event_data
            ):
                response = event_data["response"]
                if "id" in response:
                    self.last_response_id = response["id"]
                    self.response_index += (
                        1  # Increment response counter
                    )

            # Continuous metrics: Trigger evaluation after each response completes
            # Inspired by OpenAI agents tracing and Temporal interceptor patterns
            if (
                event_data.get("type") == "response.completed"
                and "response" in event_data
                and self.task_id
                and self.workspace_id
            ):
                response = event_data["response"]
                response_id = response.get("id")

                # Extract the last user message and assistant response
                user_message = next(
                    (
                        msg
                        for msg in reversed(self.messages)
                        if msg.role == "user"
                    ),
                    None,
                )

                # Get assistant response from the completed response
                assistant_content = ""
                if "output" in response:
                    for output_item in response["output"]:
                        if (
                            output_item.get("type") == "message"
                            and output_item.get("role")
                            == "assistant"
                        ):
                            for content in output_item.get(
                                "content", []
                            ):
                                if (
                                    content.get("type")
                                    == "output_text"
                                ):
                                    assistant_content += (
                                        content.get("text", "")
                                    )

                # Extract usage data for performance metrics
                usage = response.get("usage", {})
                input_tokens = usage.get("input_tokens", 0)
                output_tokens = usage.get("output_tokens", 0)
                input_tokens + output_tokens

                # Approximate cost (GPT-5-mini pricing)
                (input_tokens * 0.00001) + (
                    output_tokens * 0.00003
                )

                # Duration is captured automatically by generation_span tracing in llm_response_stream
                # No need to manually track it here - traces provide accurate wall-clock duration

                log.info(
                    f"Response {self.response_index} completed for task {self.task_id}. "
                    "Triggering continuous metrics evaluation..."
                )

                # Fire-and-forget child workflow for metrics evaluation (truly parallel, non-blocking)
                # Uses ABANDON policy so agent can continue even if metrics fail
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
                            "duration_ms": 0,  # Duration from traces, not workflow time
                            "input_tokens": input_tokens,
                            "output_tokens": output_tokens,
                            "status": "completed",
                            "run_quality_metrics": True,
                        },
                        parent_close_policy=ParentClosePolicy.ABANDON,  # Ensures true parallelism
                    )
                    log.info(
                        f"✓ Continuous metrics workflow started (parallel) for response {self.response_index}"
                    )
                except Exception as e:
                    # Don't fail the agent if metrics evaluation fails
                    log.warning(
                        f"Failed to start continuous metrics workflow: {e}"
                    )

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
                log.info(
                    f"Pipeline agent {self.agent_id} completed data loading for task {self.task_id}"
                )

                await agent.step(
                    function=tasks_update,
                    function_input=TaskUpdateInput(
                        task_id=self.task_id,
                        status="completed",
                    ),
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
                        start_to_close_timeout=timedelta(
                            seconds=10
                        ),
                    )

                self.end = True
                log.info(
                    f"Pipeline agent {self.agent_id} workflow marked for completion"
                )

        except ValueError as e:
            log.error(f"Error handling response_item: {e}")

            # Create error event for this processing error
            error_event = create_agent_error_event(
                message=f"Error processing response item: {e}",
                error_type="response_processing_failed",
                code="agent_error",
            )
            self.events.append(error_event.model_dump())
            return {"processed": False, "error": str(e)}
        else:
            return {"processed": True}

    @agent.event
    async def end(self) -> EndEvent:
        log.info("Received end")
        self.end = True
        return {"end": True}

    @agent.run
    async def run(self, agent_input: AgentTaskInput) -> None:
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
                start_to_close_timeout=timedelta(seconds=10),
            )

        agent_result = await agent.step(
            function=agents_get_by_id,
            function_input=AgentIdInput(agent_id=self.agent_id),
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

            except Exception as e:
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
