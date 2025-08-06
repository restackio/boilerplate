from datetime import timedelta
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.mcp_servers_crud import (
        mcp_servers_read,
        mcp_servers_create,
        mcp_servers_update,
        mcp_servers_delete,
        mcp_servers_get_by_id,
        McpServerGetByWorkspaceInput,
        McpServerCreateInput,
        McpServerUpdateInput,
        McpServerIdInput,
    )

@workflow.defn()
class McpServersReadWorkflow:
    """Workflow to read MCP servers by workspace"""
    
    @workflow.run
    async def run(self, workflow_input: McpServerGetByWorkspaceInput):
        log.info("McpServersReadWorkflow started")
        try:
            result = await workflow.step(
                function=mcp_servers_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during mcp_servers_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class McpServersCreateWorkflow:
    """Workflow to create a new MCP server"""
    
    @workflow.run
    async def run(self, workflow_input: McpServerCreateInput):
        log.info("McpServersCreateWorkflow started")
        try:
            result = await workflow.step(
                function=mcp_servers_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during mcp_servers_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class McpServersUpdateWorkflow:
    """Workflow to update an existing MCP server"""
    
    @workflow.run
    async def run(self, workflow_input: McpServerUpdateInput):
        log.info("McpServersUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=mcp_servers_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during mcp_servers_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class McpServersDeleteWorkflow:
    """Workflow to delete an MCP server"""
    
    @workflow.run
    async def run(self, workflow_input: McpServerIdInput):
        log.info("McpServersDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=mcp_servers_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during mcp_servers_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)

@workflow.defn()
class McpServersGetByIdWorkflow:
    """Workflow to get a specific MCP server by ID"""
    
    @workflow.run
    async def run(self, workflow_input: McpServerIdInput):
        log.info("McpServersGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=mcp_servers_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during mcp_servers_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) 