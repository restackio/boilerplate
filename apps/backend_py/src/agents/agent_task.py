from datetime import timedelta

from pydantic import BaseModel
from restack_ai.agent import (
    NonRetryableError,
    agent,
    import_functions,
    log,
    agent_info,
)



with import_functions():
    from openai.types.responses.tool_param import Mcp

    from src.functions.llm_response import (
        LlmResponseInput,
        Message,
        llm_response,
    )
    from src.functions.agents_crud import (
        agents_get_by_id,
        AgentIdInput,
    )
    from src.functions.send_agent_event import (
        SendAgentEventInput,
        send_agent_event,
    )


class MessagesEvent(BaseModel):
    messages: list[Message]


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
        self.messages = []

    @agent.state
    def state_messages(self):
        return self.messages

    @agent.event
    async def messages(self, messages_event: MessagesEvent) -> list[Message]:
        try:
            self.messages.extend(messages_event.messages)

            mcp_servers = [
                Mcp(
                    type="mcp",
                    server_label="deepwiki",
                    server_url="https://mcp.deepwiki.com/mcp",
                    require_approval="never",
                ),
                # Mcp(
                #     type="mcp",
                #     server_label="restack",
                #     server_url="https://6761eab1c231.ngrok-free.app/mcp",
                #     require_approval="never",
                # ),
            ]
            try:
                completion = await agent.step(
                    function=llm_response,
                    function_input=LlmResponseInput(messages=self.messages, mcp_servers=mcp_servers),
                    start_to_close_timeout=timedelta(seconds=120),
                )
            except Exception as e:
                error_message = f"Error during llm_response: {e}"
                raise NonRetryableError(error_message) from e
            else:
                log.info(f"completion: {completion}")
                
                # Extract assistant messages from the final_response.output array
                if completion.final_response and completion.final_response.get("output"):
                    for output_item in completion.final_response["output"]:
                        if (output_item.get("type") == "message" and 
                            output_item.get("role") == "assistant" and
                            output_item.get("status") == "completed"):
                            
                            content = ""
                            if output_item.get("content"):
                                # Extract text content from content array
                                for content_item in output_item["content"]:
                                    if content_item.get("type") == "output_text":
                                        content += content_item.get("text", "")
                            
                            if content:  # Only add non-empty messages
                                self.messages.append(
                                    Message(
                                        role="assistant",
                                        content=content,
                                    )
                                )
                
                # If no assistant messages were found, add a fallback
                if not any(msg.role == "assistant" for msg in self.messages[-1:]):
                    self.messages.append(
                        Message(
                            role="assistant",
                            content="No response content found",
                        )
                    )
        except Exception as e:
            log.error(f"Error during message event: {e}")
            raise
        else:
            return self.messages

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

        log.info("AgentTask agents_get_by_id result", result=result)
        self.messages.append(
            Message(
                role="developer",
                content=result.agent.instructions
            )
        )

        log.info("AgentTask agent_id", agent_id=self.agent_id)
        await agent.condition(lambda: self.end)
