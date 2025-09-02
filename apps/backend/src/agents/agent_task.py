from datetime import timedelta
from typing import Any

from pydantic import BaseModel
from restack_ai.agent import (
    NonRetryableError,
    agent,
    import_functions,
    log,
    uuid,
    agent_info
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


@agent.defn()
class AgentTask:
    def __init__(self) -> None:
        self.end = False
        self.agent_id = "None"
        self.conversation_items = []  # Unified storage for all conversation items (messages + response items)
        self.messages = []  # Keep for backward compatibility
        self.mcp_servers = []
        self.tools = []  # unified tools per Responses API
        self.last_response_id = (
            None  # Track response ID for conversation continuity
        )

        # Agent model configuration for GPT-5 features
        self.agent_model = None
        self.agent_reasoning_effort = None
        self.agent_response_format = None


    def _add_user_message_to_conversation(self, message: Message) -> None:
        """Add user messages to conversation items with OpenAI-compatible structure."""
        openai_structure = {
            "type": "message",
            "role": message.role,
            "content": [{"type": "input_text", "text": message.content}],
            "status": "completed"
        }

        conversation_item = {
            "id": f"user_{uuid()}",
            "type": "user",
            "timestamp": getattr(message, "timestamp", None),
            "openai_output": openai_structure  # OpenAI-compatible structure
        }
        self.conversation_items.append(conversation_item)

    @agent.state
    def state_response(self) -> list[dict[str, Any]]:
        """Unified state containing all conversation items (messages + response items)."""
        # Ensure we always return a clean, deduplicated flat array
        if not isinstance(self.conversation_items, list):
            log.warning(
                "conversation_items is not a list, returning empty array"
            )
            return []

        # Deduplicate by ID to handle any potential duplicates
        seen_ids = set()
        deduplicated_items = []

        for item in self.conversation_items:
            if not isinstance(item, dict) or not item.get("id"):
                # Skip malformed items
                continue

            item_id = item["id"]
            
            # Don't filter - we want to capture all streaming events for consistency
            
            if item_id not in seen_ids:
                seen_ids.add(item_id)
                deduplicated_items.append(item)
            else:
                log.warning(
                    f"Removing duplicate item from state_response: {item_id}"
                )

        log.info(
            f"state_response returning {len(deduplicated_items)} items (removed {len(self.conversation_items) - len(deduplicated_items)} duplicates)"
        )
        
        # Debug logging to help identify the frontend issue
        for item in deduplicated_items:
            log.info(f"Returning item: id={item.get('id')}, type={item.get('type')}")
        
        return deduplicated_items

    @agent.event
    async def messages(  # noqa: C901, PLR0912, PLR0915
        self, messages_event: MessagesEvent
    ) -> list[Message]:
        try:
            # Add messages to unified conversation items with OpenAI-compatible structure
            for message in messages_event.messages:
                self._add_user_message_to_conversation(message)

            # Also maintain the old messages array for any existing code that might need it
            self.messages.extend(messages_event.messages)

            # Load agent configuration and tools on first message if not already loaded
            if not self.tools:
                log.info(
                    "Loading agent configuration and tools on first message"
                )

                # Fetch agent configuration for GPT-5 model settings
                agent_result = await agent.step(
                    function=agents_get_by_id,
                    function_input=AgentIdInput(agent_id=self.agent_id),
                    start_to_close_timeout=timedelta(seconds=30),
                )

                if agent_result.agent:
                    agent_data = agent_result.agent
                    self.agent_model = agent_data.model
                    self.agent_reasoning_effort = agent_data.reasoning_effort
                    self.agent_response_format = agent_data.response_format

                    log.info(
                        f"Loaded agent configuration - Model: {self.agent_model}, "
                        f"Reasoning: {self.agent_reasoning_effort}"
                    )
                tools_result = await agent.step(
                    function=agent_tools_read_by_agent,
                    function_input=AgentToolsGetByAgentInput(
                        agent_id=self.agent_id
                    ),
                    start_to_close_timeout=timedelta(seconds=30),
                )
                self.tools = tools_result.tools or []
                # For backward compatibility with any MCP-approval paths, also keep mcp_servers list
                self.mcp_servers = [t for t in self.tools if t.get("type") == "mcp"]
                log.info(
                    f"Loaded {len(self.tools)} tools for agent {self.agent_id}"
                )

            try:
                
                # Step 1: prepare request for OpenAI (typed and fully normalized)
                prepared: LlmResponseInput = await agent.step(
                    function=llm_prepare_response,
                    function_input=LlmPrepareResponseInput(
                        messages=self.messages,
                        tools=self.tools,
                        model=self.agent_model,
                        reasoning_effort=self.agent_reasoning_effort,
                        previous_response_id=self.last_response_id,
                        agent_id=agent_info().workflow_id
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
                error_message = f"Error during llm_response_stream: {e}"
                raise NonRetryableError(error_message) from e
            else:
                log.info(f"completion: {completion}")

                # Track response ID for conversation continuity
                if completion.response_id:
                    self.last_response_id = completion.response_id
                    log.info(
                        f"Updated last_response_id: {self.last_response_id}"
                    )

                # Store response items and check for MCP approval requests
                if (
                    completion.final_response
                    and completion.final_response.get("output")
                ):
                    log.info(f"Processing {len(completion.final_response['output'])} output items from final_response")

                    for output_item in completion.final_response["output"]:
                        item_type = output_item.get("type", "unknown")
                        item_id = output_item.get("id", f"{item_type}_{uuid()}")

                        log.info(f"Adding output_item to conversation: type={item_type}, id={item_id}")

                        conversation_item = {
                            "id": item_id,
                            "type": item_type,
                            "timestamp": None,
                            "openai_output": output_item,
                        }

                        duplicate_found = False
                        for existing_item in self.conversation_items:
                            if existing_item.get("id") == item_id:
                                log.warning(f"Duplicate item detected with ID {item_id}, skipping")
                                duplicate_found = True
                                break

                        if not duplicate_found:
                            self.conversation_items.append(conversation_item)

                        # Special handling: Add assistant messages to messages array for backward compatibility
                        if (
                            item_type == "message"
                            and output_item.get("role") == "assistant"
                            and output_item.get("status") == "completed"
                        ):
                            # Extract text from OpenAI message content structure
                            content = ""
                            if output_item.get("content"):
                                for content_item in output_item["content"]:
                                    if content_item.get("type") == "output_text":
                                        content += content_item.get("text", "")

                            if content:
                                self.messages.append(Message(role="assistant", content=content))

        except Exception as e:
            log.error(f"Error during message event: {e}")
            raise
        else:
            return self.messages



    @agent.event
    async def mcp_approval(  # noqa: C901, PLR0912
        self, approval_event: McpApprovalEvent
    ) -> dict:
        """Handle MCP approval/denial events."""
        log.info(
            f"Received MCP approval: {approval_event.approval_id} - {'approved' if approval_event.approved else 'denied'}"
        )

        # Check if this approval has already been processed
        approval_id = approval_event.approval_id

        # Look for this approval in conversation items to see if it's already been processed
        for item in self.conversation_items:
            if (
                item.get("type") == "mcp-approval-request"
                and item.get("id") == approval_id
                and item.get("status") in ["completed", "failed"]
            ):
                log.warning(f"Approval {approval_id} already processed with status: {item.get('status')}")
                return {
                    "approval_id": approval_id,
                    "approved": approval_event.approved,
                    "processed": True,
                    "message": "Already processed",
                }

        # Use last_response_id to continue the conversation after approval
        if not self.last_response_id:
            error_msg = f"Approval {approval_id} received before response context is available"
            log.error(error_msg)
            raise Exception(error_msg)

        response_id = self.last_response_id
        log.info(f"Processing approval {approval_id} using last_response_id: {response_id}")

        # Find the most recent approval request that matches this approval
        # Sometimes the approval_id from the frontend might not match the exact ID OpenAI expects
        
        # Debug: Log all approval requests in conversation items
        approval_requests = [
            {
                "id": item.get("id"),
                "type": item.get("type"),
                "status": item.get("status"),
                "openai_output_id": item.get("openai_output", {}).get("id"),
                "openai_output_status": item.get("openai_output", {}).get("status"),
            }
            for item in self.conversation_items 
            if item.get("type") == "mcp_approval_request"
        ]
        log.info(f"All approval requests in conversation: {approval_requests}")
        
        matching_approval = None
        for item in reversed(self.conversation_items):  # Search from most recent
            if item.get("type") == "mcp_approval_request":
                # Check if this matches the approval we're processing
                item_id = item.get("id")
                openai_output_id = item.get("openai_output", {}).get("id")
                item_status = item.get("status")
                openai_output_status = item.get("openai_output", {}).get("status")
                
                log.info(f"Checking approval item: id={item_id}, openai_output_id={openai_output_id}, status={item_status}, openai_output_status={openai_output_status}")
                
                if item_id == approval_id or openai_output_id == approval_id:
                    matching_approval = item
                    log.info(f"Found matching approval request by ID match")
                    break
        
        if matching_approval:
            # Use the OpenAI output ID if available, otherwise use the item ID
            actual_approval_id = matching_approval.get("openai_output", {}).get("id") or matching_approval.get("id")
            log.info(f"Found matching approval request, using ID: {actual_approval_id}")
        else:
            actual_approval_id = approval_id
            log.warning(f"No matching approval request found, using original ID: {approval_id}")

        try:

            # Send approval response using previous_response_id to continue the paused response
            approval_input = LlmPrepareResponseInput(
                previous_response_id=response_id,
                mcp_servers=self.mcp_servers,  # Include MCP servers for approval context
                approval_response={
                    "type": "mcp_approval_response",
                    "approve": approval_event.approved,
                    "approval_request_id": actual_approval_id,
                },
                agent_id=agent_info().workflow_id,
            )

            # Prepare then execute the approval continuation as well
            prepared: LlmResponseInput = await agent.step(
                function=llm_prepare_response,
                function_input=approval_input,
                start_to_close_timeout=timedelta(seconds=60),
            )

            completion = await agent.step(
                function=llm_response_stream,
                function_input=prepared,
                start_to_close_timeout=timedelta(seconds=120),
            )

            log.info(
                f"MCP approval response completion: {completion}"
            )

            # Update response ID for future conversation continuity
            if completion.response_id:
                self.last_response_id = completion.response_id
                log.info(
                    f"Updated last_response_id after approval: {self.last_response_id}"
                )

            # Update the existing approval request status in conversation items
            for item in self.conversation_items:
                if (
                    item.get("type") == "mcp_approval_request"
                    and (item.get("id") == approval_id or item.get("openai_output", {}).get("id") == approval_id)
                ):
                    # Update the status in the openai_output structure
                    if "openai_output" in item:
                        item["openai_output"]["status"] = (
                            "completed"
                            if approval_event.approved
                            else "failed"
                        )
                    log.info(f"Updated approval request {approval_id} status to {'completed' if approval_event.approved else 'failed'}")
                    break

            # Process the continued response
            if (
                completion.final_response
                and completion.final_response.get("output")
            ):
                log.info(f"Processing {len(completion.final_response['output'])} output items from approval continuation")

                for output_item in completion.final_response["output"]:
                    item_type = output_item.get("type", "unknown")
                    item_id = output_item.get("id", f"{item_type}_{uuid()}")

                    log.info(f"Adding approval continuation output_item: type={item_type}, id={item_id}")

                    conversation_item = {
                        "id": item_id,
                        "type": item_type,
                        "timestamp": None,
                        "openai_output": output_item,
                    }

                    # Check for duplicates before adding
                    duplicate_found = False
                    for existing_item in self.conversation_items:
                        if existing_item.get("id") == item_id:
                            log.warning(f"Duplicate item detected with ID {item_id}, skipping")
                            duplicate_found = True
                            break

                    if not duplicate_found:
                        self.conversation_items.append(conversation_item)

                    # Special handling: Add assistant messages to messages array for backward compatibility
                    if (
                        item_type == "message"
                        and output_item.get("role") == "assistant"
                        and output_item.get("status") == "completed"
                    ):
                        # Extract text from OpenAI message content structure
                        content = ""
                        if output_item.get("content"):
                            for content_item in output_item["content"]:
                                if content_item.get("type") == "output_text":
                                    content += content_item.get("text", "")

                        if content:
                            self.messages.append(Message(role="assistant", content=content))

        except Exception as e:  # noqa: BLE001
            log.error(f"Error processing MCP approval: {e}")
            return {
                "approval_id": approval_id,
                "approved": approval_event.approved,
                "processed": False,
                "error": str(e),
            }
        else:
            return {
                "approval_id": approval_id,
                "approved": approval_event.approved,
                "processed": True,
            }

    @agent.event
    async def sdk_response_event(self, event_data: dict) -> dict:
        """
        Handle native OpenAI SDK ResponseStreamEvent objects.
        Stores events extracted from parallel processing in agent state.
        Preserves OpenAI's native format and IDs.
        """
        event_type = event_data.get("type", "unknown")
        log.info(f"Received OpenAI SDK event: {event_type}")
        
        try:
            # Use OpenAI's native ID if available, fallback to generating one
            item_id = event_data.get("event_id") or event_data.get("id") or f"openai_event_{uuid()}"
            
            # Store the exact OpenAI event structure
            conversation_item = {
                "id": item_id,
                "type": event_type,
                "timestamp": event_data.get("created_at"),
                "openai_event": event_data,  # Store the complete OpenAI event
            }
            
            # Check for duplicates
            duplicate_found = any(
                item.get("id") == item_id for item in self.conversation_items
            )
            
            if not duplicate_found:
                self.conversation_items.append(conversation_item)
                log.info(f"Added SDK event to conversation: {event_data.get('type')}")
            else:
                log.warning(f"Duplicate SDK event detected: {item_id}")
            
            return {
                "item_id": item_id,
                "type": event_data.get("type"),
                "processed": True
            }
            
        except Exception as e:
            log.error(f"Error processing SDK event: {e}")
            return {
                "type": event_data.get("type"),
                "processed": False,
                "error": str(e)
            }

    @agent.event
    async def end(self) -> EndEvent:
        log.info("Received end")
        self.end = True
        return {"end": True}

    @agent.run
    async def run(self, agent_input: AgentTaskInput) -> None:
        self.agent_id = agent_input.agent_id

        result = await agent.step(
            function=agents_get_by_id,
            function_input=AgentIdInput(agent_id=self.agent_id),
        )

        log.info(
            "AgentTask agents_get_by_id result", result=result
        )
        # Safely add developer instructions if present (avoid None -> pydantic ValidationError)
        try:
            instructions = (
                result.agent.instructions if getattr(result, "agent", None) else None
            )
        except Exception:  # noqa: BLE001
            instructions = None

        if instructions and isinstance(instructions, str) and instructions.strip():
            self.messages.append(
                Message(
                    role="developer",
                    content=f"{instructions}. Markdown is supported. Use headings wherever appropriate.",
                )
            )

        log.info("AgentTask agent_id", agent_id=self.agent_id)
        await agent.condition(lambda: self.end)
