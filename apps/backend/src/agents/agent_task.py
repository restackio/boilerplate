from datetime import timedelta
from typing import Any

from pydantic import BaseModel
from restack_ai.agent import (
    NonRetryableError,
    agent,
    import_functions,
    log,
    uuid,
)

with import_functions():
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
    agent_id: str
    assigned_to_id: str | None = None
    task_id: str | None = None


@agent.defn()
class AgentTask:
    def __init__(self) -> None:
        self.end = False
        self.agent_id = "None"
        self.task_id = None
        self.messages = []
        self.tools = []
        self.events = []
        self.last_response_id = None  # For conversation continuity

        # Agent model configuration for GPT-5 features
        self.agent_model = None
        self.agent_reasoning_effort = None
        self.agent_response_format = None

    @agent.state
    def state_response(self) -> dict[str, Any]:
        """Ultra-minimal state: just raw data, properly sorted."""
        # Just sort events by sequence number - no transformation
        sorted_events = sorted(self.events, key=lambda e: e.get("sequence_number", 0))

        return {
            "events": sorted_events,
            "messages": [msg.model_dump() if hasattr(msg, "model_dump") else msg for msg in self.messages],
            "task_id": self.task_id,
            "agent_task_id": self.agent_id,
            "last_response_id": self.last_response_id,
        }

    @agent.event
    async def messages(
        self, messages_event: MessagesEvent
    ) -> list[Message]:
        try:
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
                            "content": [{"type": "input_text", "text": message.content}]
                        }
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
                            ),
                            start_to_close_timeout=timedelta(seconds=60),
                        )

                        # Step 2: execute with streaming so both steps are visible in logs
                        completion = await agent.step(
                            function=llm_response_stream,
                            function_input=prepared,
                            start_to_close_timeout=timedelta(seconds=120),
                        )
                    except Exception as e:
                        error_message = (
                            f"Error during llm_response_stream: {e}"
                        )
                        raise NonRetryableError(error_message) from e
                    else:

                        if completion.parsed_response:
                            log.info("TODO: save in db")

        except Exception as e:
            log.error(f"Error during message event: {e}")
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
        )

        prepared = await agent.step(
            function=llm_prepare_response,
            function_input=approval_input,
        )

        await agent.step(
            function=llm_response_stream, function_input=prepared
        )

        return {
            "approval_id": approval_event.approval_id,
            "processed": True,
        }

    @agent.event
    async def response_item(self, event_data: dict) -> dict:
        """Store OpenAI ResponseStreamEvent in simple format."""
        try:
            # Store all events and update sequence tracking
            self.events.append(event_data)

            # Extract response_id from response.created event for conversation continuity
            if event_data.get("type") == "response.created" and "response" in event_data:
                response = event_data["response"]
                if "id" in response:
                    self.last_response_id = response["id"]

        except ValueError as e:
            log.error(f"Error handling response_item: {e}")
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

        # Load agent configuration and tools once at startup (deterministic)
        log.info("Loading agent configuration and tools at startup")

        agent_result = await agent.step(
            function=agents_get_by_id,
            function_input=AgentIdInput(agent_id=self.agent_id),
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.info("AgentTask agents_get_by_id result", result=agent_result)

        # Set agent configuration (deterministic based on database state at startup)
        if agent_result.agent:
            agent_data = agent_result.agent
            self.agent_model = agent_data.model
            self.agent_reasoning_effort = agent_data.reasoning_effort
            self.agent_response_format = agent_data.response_format

            log.info(
                f"Loaded agent configuration - Model: {self.agent_model}, "
                f"Reasoning: {self.agent_reasoning_effort}"
            )

            # Add instructions to initial messages if they exist
            if agent_data.instructions and agent_data.instructions.strip():
                self.messages.append(
                    Message(
                        role="developer",
                        content=f"{agent_data.instructions}. Markdown is supported. Use headings wherever appropriate.",
                    )
                )
        else:
            # Set defaults if no agent found
            self.agent_model = "gpt-5"
            self.agent_reasoning_effort = "medium"
            self.agent_response_format = {"type": "text"}

        # Load tools once at startup (deterministic)
        tools_result = await agent.step(
            function=agent_tools_read_by_agent,
            function_input=AgentToolsGetByAgentInput(
                agent_id=self.agent_id
            ),
            start_to_close_timeout=timedelta(seconds=30),
        )
        self.tools = tools_result.tools or []

        log.info("AgentTask agent_id", agent_id=self.agent_id)
        await agent.condition(lambda: self.end)
