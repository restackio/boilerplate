from restack_ai.workflow import workflow, import_functions

with import_functions():
    from src.functions.agent_mcp_servers_crud import (
        agent_mcp_servers_read_by_agent,
        agent_mcp_servers_create,
        agent_mcp_servers_update,
        agent_mcp_servers_delete,
        agent_mcp_servers_get_by_id,
        AgentMcpServerGetByAgentInput,
        AgentMcpServerCreateInput,
        AgentMcpServerUpdateInput,
        AgentMcpServerIdInput,
    )

@workflow.defn()
class AgentMcpServersReadByAgentWorkflow:
    @workflow.run
    async def run(self, input: AgentMcpServerGetByAgentInput):
        return await agent_mcp_servers_read_by_agent(input)

@workflow.defn()
class AgentMcpServersCreateWorkflow:
    @workflow.run
    async def run(self, input: AgentMcpServerCreateInput):
        return await agent_mcp_servers_create(input)

@workflow.defn()
class AgentMcpServersUpdateWorkflow:
    @workflow.run
    async def run(self, input: AgentMcpServerUpdateInput):
        return await agent_mcp_servers_update(input)

@workflow.defn()
class AgentMcpServersDeleteWorkflow:
    @workflow.run
    async def run(self, input: AgentMcpServerIdInput):
        return await agent_mcp_servers_delete(input)

@workflow.defn()
class AgentMcpServersGetByIdWorkflow:
    @workflow.run
    async def run(self, input: AgentMcpServerIdInput):
        return await agent_mcp_servers_get_by_id(input) 