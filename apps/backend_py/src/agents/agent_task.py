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
    from openai.types.responses.tool_param import Mcp

    from src.functions.agent_mcp_servers_crud import (
        AgentMcpServerGetByAgentInput,
        agent_mcp_servers_read_by_agent,
    )
    from src.functions.agents_crud import (
        AgentIdInput,
        agents_get_by_id,
    )
    from src.functions.llm_response import (
        LlmResponseInput,
        Message,
        llm_response,
    )
    from src.functions.mcp_servers_crud import (
        McpRequireApproval,
        McpServerIdInput,
        mcp_servers_get_by_id,
    )


class MessagesEvent(BaseModel):
    messages: list[Message]


class McpApprovalEvent(BaseModel):
    approval_id: str
    approved: bool


class EndEvent(BaseModel):
    end: bool


class AgentTaskInput(BaseModel):
    title: str
    description: str
    status: str
    agent_id: str
    assigned_to_id: str


@agent.defn()
class AgentTask:
    def __init__(self) -> None:
        self.end = False
        self.agent_id = "None"
        self.conversation_items = []  # Unified storage for all conversation items (messages + response items)
        self.messages = []  # Keep for backward compatibility
        self.pending_approval_requests = {}
        self.mcp_servers = []
        self.last_response_id = (
            None  # Track response ID for conversation continuity
        )

    def _add_conversation_item(
        self,
        item_type: str,
        content: str | None = None,
        item_id: str | None = None,
        item_data: dict | None = None,
        timestamp: str | None = None,
    ) -> None:
        """Helper to add items to unified conversation state with consistent structure."""
        # Generate unique ID if not provided
        if not item_id:
            item_id = f"{item_type}_{uuid()}"

        # Check for duplicates before adding
        for existing_item in self.conversation_items:
            if existing_item.get("id") == item_id:
                log.warning(
                    f"Duplicate item detected with ID {item_id}, skipping"
                )
                return existing_item

        conversation_item = {
            "id": item_id,
            "type": item_type,
            "content": content or "",
            "timestamp": timestamp,
            "rawData": item_data or {},
        }

        # Add type-specific fields
        if item_type == "tool-call" and item_data:
            conversation_item.update(
                {
                    "toolName": item_data.get("name"),
                    "toolArguments": item_data.get("arguments"),
                    "toolOutput": item_data.get("output"),
                    "status": "completed"
                    if item_data.get("output")
                    else "in-progress",
                }
            )
        elif (
            item_type == "tool-list"
            and item_data
            and item_data.get("tools")
        ):
            tool_names = [
                tool.get("name")
                for tool in item_data.get("tools", [])
            ]
            conversation_item["content"] = (
                f"Available tools: {', '.join(tool_names)}"
            )
            conversation_item["status"] = "completed"
        elif item_type == "mcp-approval-request" and item_data:
            conversation_item.update(
                {
                    "toolName": item_data.get("name"),
                    "toolArguments": item_data.get("arguments"),
                    "serverLabel": item_data.get("server_label"),
                    "status": "waiting-approval",
                }
            )
            conversation_item["content"] = (
                f"Approval required for tool: {item_data.get('name')}"
            )
            if item_data.get("arguments"):
                conversation_item["content"] += (
                    f" with arguments: {item_data.get('arguments')}"
                )

        self.conversation_items.append(conversation_item)
        return conversation_item

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
        return deduplicated_items

    @agent.event
    async def messages(  # noqa: C901, PLR0912, PLR0915
        self, messages_event: MessagesEvent
    ) -> list[Message]:
        try:
            # Add messages to unified conversation items with consistent structure
            for message in messages_event.messages:
                self._add_conversation_item(
                    item_type=message.role,  # "user" or "assistant"
                    content=message.content,
                    timestamp=message.timestamp
                    if hasattr(message, "timestamp")
                    else None,
                    item_data={
                        "role": message.role
                    },  # Keep original role for backward compatibility
                )

            # Also maintain the old messages array for any existing code that might need it
            self.messages.extend(messages_event.messages)

            # Load MCP servers on first message if not already loaded
            if not self.mcp_servers:
                log.info(
                    "Loading MCP servers configuration on first message"
                )
                agent_mcp_servers_result = await agent.step(
                    function=agent_mcp_servers_read_by_agent,
                    function_input=AgentMcpServerGetByAgentInput(
                        agent_id=self.agent_id
                    ),
                    start_to_close_timeout=timedelta(seconds=30),
                )

                mcp_servers = []

                # Build MCP server configurations for each agent-MCP relationship
                for (
                    agent_mcp_server
                ) in agent_mcp_servers_result.agent_mcp_servers:
                    # Get the full MCP server details
                    mcp_server_result = await agent.step(
                        function=mcp_servers_get_by_id,
                        function_input=McpServerIdInput(
                            mcp_server_id=agent_mcp_server.mcp_server_id
                        ),
                        start_to_close_timeout=timedelta(
                            seconds=30
                        ),
                    )

                    mcp_server = mcp_server_result.mcp_server

                    # Create MCP configuration with allowed tools filter
                    # Convert require_approval to proper format using Pydantic model
                    require_approval_data = (
                        McpRequireApproval.model_validate(
                            mcp_server.require_approval
                        ).model_dump()
                    )

                    mcp_config = Mcp(
                        type="mcp",
                        server_label=mcp_server.server_label,
                        server_url=mcp_server.server_url,
                        server_description=mcp_server.server_description,
                        headers=mcp_server.headers,
                        require_approval=require_approval_data,
                    )

                    # Add allowed_tools filter if specified
                    if agent_mcp_server.allowed_tools:
                        mcp_config["allowed_tools"] = (
                            agent_mcp_server.allowed_tools
                        )

                    mcp_servers.append(mcp_config)

                self.mcp_servers = mcp_servers
                log.info(
                    f"Loaded {len(mcp_servers)} MCP servers for agent {self.agent_id}"
                )

            try:
                # Use previous_response_id for conversation continuity
                llm_input = LlmResponseInput(
                    messages=self.messages,
                    mcp_servers=self.mcp_servers,  # Always include MCP servers
                )
                if self.last_response_id:
                    llm_input.previous_response_id = (
                        self.last_response_id
                    )

                completion = await agent.step(
                    function=llm_response,
                    function_input=llm_input,
                    start_to_close_timeout=timedelta(seconds=120),
                )
            except Exception as e:
                error_message = f"Error during llm_response: {e}"
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
                    response_id = completion.response_id

                    for output_item in completion.final_response[
                        "output"
                    ]:
                        # Store MCP approval requests for later processing
                        if (
                            output_item.get("type")
                            == "mcp_approval_request"
                        ):
                            approval_id = output_item.get("id")
                            if approval_id and response_id:
                                self.pending_approval_requests[
                                    approval_id
                                ] = {
                                    "response_id": response_id,
                                    "approval_request": output_item,
                                }
                                log.info(
                                    f"Stored MCP approval request: {approval_id} for response: {response_id}"
                                )

                                # Add MCP approval request to unified conversation items
                                self._add_conversation_item(
                                    item_type="mcp-approval-request",
                                    item_id=output_item.get("id"),
                                    item_data=output_item,
                                )

                        # Add completed tool calls to unified conversation items
                        elif (
                            output_item.get("type") == "mcp_call"
                        ):
                            self._add_conversation_item(
                                item_type="tool-call",
                                item_id=output_item.get("id"),
                                content=f"Tool call: {output_item.get('name', '')}",
                                item_data=output_item,
                            )

                        # Add tool lists to unified conversation items
                        elif (
                            output_item.get("type")
                            == "mcp_list_tools"
                        ):
                            self._add_conversation_item(
                                item_type="tool-list",
                                item_id=output_item.get("id"),
                                item_data=output_item,
                            )

                        # Extract assistant messages from completed responses
                        elif (
                            output_item.get("type") == "message"
                            and output_item.get("role")
                            == "assistant"
                            and output_item.get("status")
                            == "completed"
                        ):
                            content = ""
                            if output_item.get("content"):
                                # Extract text content from content array
                                for content_item in output_item[
                                    "content"
                                ]:
                                    if (
                                        content_item.get("type")
                                        == "output_text"
                                    ):
                                        content += (
                                            content_item.get(
                                                "text", ""
                                            )
                                        )

                            if (
                                content
                            ):  # Only add non-empty messages
                                self.messages.append(
                                    Message(
                                        role="assistant",
                                        content=content,
                                    )
                                )

                                # Add completed assistant message to unified conversation items
                                self._add_conversation_item(
                                    item_type="assistant",
                                    item_id=output_item.get("id"),
                                    content=content,
                                    item_data=output_item,
                                )

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

        # Find the pending approval request
        approval_id = approval_event.approval_id
        if approval_id not in self.pending_approval_requests:
            log.error(
                f"No pending approval request found for ID: {approval_id}"
            )
            return {
                "approval_id": approval_id,
                "approved": approval_event.approved,
                "processed": False,
                "error": "No pending approval request found",
            }

        try:
            # Get the stored approval request data
            approval_data = self.pending_approval_requests[
                approval_id
            ]
            response_id = approval_data["response_id"]

            # Send approval response using previous_response_id to continue the paused response
            approval_input = LlmResponseInput(
                previous_response_id=response_id,
                mcp_servers=self.mcp_servers,  # Include MCP servers for approval context
                approval_response={
                    "type": "mcp_approval_response",
                    "approve": approval_event.approved,
                    "approval_request_id": approval_id,
                },
            )

            completion = await agent.step(
                function=llm_response,
                function_input=approval_input,
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
                    item.get("type") == "mcp-approval-request"
                    and item.get("id") == approval_id
                ):
                    item["status"] = (
                        "completed"
                        if approval_event.approved
                        else "failed"
                    )
                    if approval_event.approved:
                        item["content"] += " - Approved"
                    else:
                        item["content"] += " - Denied"
                    break

            # Process the continued response
            if (
                completion.final_response
                and completion.final_response.get("output")
            ):
                for output_item in completion.final_response[
                    "output"
                ]:
                    # Add any new tool calls from approval continuation
                    if output_item.get("type") == "mcp_call":
                        self._add_conversation_item(
                            item_type="tool-call",
                            item_id=output_item.get("id"),
                            content=f"Tool call: {output_item.get('name', '')}",
                            item_data=output_item,
                        )

                    elif (
                        output_item.get("type") == "message"
                        and output_item.get("role") == "assistant"
                        and output_item.get("status")
                        == "completed"
                    ):
                        content = ""
                        if output_item.get("content"):
                            for content_item in output_item[
                                "content"
                            ]:
                                if (
                                    content_item.get("type")
                                    == "output_text"
                                ):
                                    content += content_item.get(
                                        "text", ""
                                    )

                        if content:
                            self.messages.append(
                                Message(
                                    role="assistant",
                                    content=content,
                                )
                            )

                            # Add to unified conversation items
                            self._add_conversation_item(
                                item_type="assistant",
                                item_id=output_item.get("id"),
                                content=content,
                                item_data=output_item,
                            )

            # Remove the processed approval request
            del self.pending_approval_requests[approval_id]

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
        self.messages.append(
            Message(
                role="developer",
                content=result.agent.instructions,
            )
        )

        log.info("AgentTask agent_id", agent_id=self.agent_id)
        await agent.condition(lambda: self.end)
