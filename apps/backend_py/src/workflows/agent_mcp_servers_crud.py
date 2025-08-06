from datetime import timedelta
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

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
    """Workflow to read agent MCP servers by agent ID"""
    
    @workflow.run
    async def run(self, workflow_input: AgentMcpServerGetByAgentInput):
        log.info("AgentMcpServersReadByAgentWorkflow started")
        try:
            result = await workflow.step(
                function=agent_mcp_servers_read_by_agent,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agent_mcp_servers_read_by_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class AgentMcpServersCreateWorkflow:
    """Workflow to create a new agent MCP server"""
    
    @workflow.run
    async def run(self, workflow_input: AgentMcpServerCreateInput):
        log.info("AgentMcpServersCreateWorkflow started")
        try:
            result = await workflow.step(
                function=agent_mcp_servers_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agent_mcp_servers_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class AgentMcpServersUpdateWorkflow:
    """Workflow to update an existing agent MCP server"""
    
    @workflow.run
    async def run(self, workflow_input: AgentMcpServerUpdateInput):
        log.info("AgentMcpServersUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=agent_mcp_servers_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agent_mcp_servers_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class AgentMcpServersDeleteWorkflow:
    """Workflow to delete an agent MCP server"""
    
    @workflow.run
    async def run(self, workflow_input: AgentMcpServerIdInput):
        log.info("AgentMcpServersDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=agent_mcp_servers_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agent_mcp_servers_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class AgentMcpServersGetByIdWorkflow:
    """Workflow to get a specific agent MCP server by ID"""
    
    @workflow.run
    async def run(self, workflow_input: AgentMcpServerIdInput):
        log.info("AgentMcpServersGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=agent_mcp_servers_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agent_mcp_servers_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) 