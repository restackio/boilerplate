from restack_ai.workflow import workflow, import_functions  

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
    @workflow.run
    async def run(self, input: McpServerGetByWorkspaceInput):
        return await mcp_servers_read(input)

@workflow.defn()
class McpServersCreateWorkflow:
    @workflow.run
    async def run(self, input: McpServerCreateInput):
        return await mcp_servers_create(input)

@workflow.defn()
class McpServersUpdateWorkflow:
    @workflow.run
    async def run(self, input: McpServerUpdateInput):
        return await mcp_servers_update(input)

@workflow.defn()
class McpServersDeleteWorkflow:
    @workflow.run
    async def run(self, input: McpServerIdInput):
        return await mcp_servers_delete(input)

@workflow.defn()
class McpServersGetByIdWorkflow:
    @workflow.run
    async def run(self, input: McpServerIdInput):
        return await mcp_servers_get_by_id(input) 