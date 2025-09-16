"""CRUD operations for agent-level MCP tool management."""

import uuid
from typing import Optional

from pydantic import BaseModel, Field
from restack_ai.function import function
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import AgentMcpTool, McpServer, Agent
from src.functions.mcp_tools_refresh import mcp_tools_list


class AgentMcpToolCreateInput(BaseModel):
    """Input for creating an agent MCP tool."""
    agent_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)
    tool_name: str = Field(..., min_length=1)
    custom_description: Optional[str] = None
    require_approval: bool = False
    enabled: bool = True


class AgentMcpToolUpdateInput(BaseModel):
    """Input for updating an agent MCP tool."""
    id: str = Field(..., min_length=1)
    custom_description: Optional[str] = None
    require_approval: Optional[bool] = None
    enabled: Optional[bool] = None


class AgentMcpToolDeleteInput(BaseModel):
    """Input for deleting an agent MCP tool."""
    id: str = Field(..., min_length=1)


class AgentMcpToolsByAgentInput(BaseModel):
    """Input for getting agent MCP tools by agent ID."""
    agent_id: str = Field(..., min_length=1)


class AgentMcpToolListInput(BaseModel):
    """Input for listing available tools from an MCP server."""
    agent_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)


class AgentMcpToolData(BaseModel):
    """Agent MCP tool data."""
    id: str
    agent_id: str
    mcp_server_id: str
    tool_name: str
    custom_description: Optional[str]
    require_approval: bool
    enabled: bool
    created_at: str
    updated_at: str
    # Server info
    server_label: str
    server_description: Optional[str]


class AgentMcpToolSingleOutput(BaseModel):
    """Output for single agent MCP tool operations."""
    success: bool
    data: Optional[AgentMcpToolData] = None
    error: Optional[str] = None


class AgentMcpToolListOutput(BaseModel):
    """Output for agent MCP tool list operations."""
    success: bool
    data: list[AgentMcpToolData] = Field(default_factory=list)
    error: Optional[str] = None


class AgentMcpToolDeleteOutput(BaseModel):
    """Output for agent MCP tool delete operations."""
    success: bool
    error: Optional[str] = None


class ListedTool(BaseModel):
    """A tool listed from an MCP server."""
    name: str
    description: Optional[str] = None
    already_added: bool = False


class AgentMcpToolListOutput(BaseModel):
    """Output for tool list operations."""
    success: bool
    tools: list[ListedTool] = Field(default_factory=list)
    error: Optional[str] = None


def _convert_to_tool_data(tool: AgentMcpTool, server: McpServer) -> AgentMcpToolData:
    """Convert database model to output data."""
    return AgentMcpToolData(
        id=str(tool.id),
        agent_id=str(tool.agent_id),
        mcp_server_id=str(tool.mcp_server_id),
        tool_name=tool.tool_name,
        custom_description=tool.custom_description,
        require_approval=tool.require_approval,
        enabled=tool.enabled,
        created_at=tool.created_at.isoformat() if tool.created_at else "",
        updated_at=tool.updated_at.isoformat() if tool.updated_at else "",
        server_label=server.server_label,
        server_description=server.server_description,
    )


@function.defn()
async def agent_mcp_tools_create(
    function_input: AgentMcpToolCreateInput,
) -> AgentMcpToolSingleOutput:
    """Create a new agent MCP tool."""
    async for db in get_async_db():
        try:
            # Validate agent exists
            agent_query = select(Agent).where(Agent.id == uuid.UUID(function_input.agent_id))
            agent_result = await db.execute(agent_query)
            agent = agent_result.scalar_one_or_none()
            if not agent:
                return AgentMcpToolSingleOutput(
                    success=False,
                    error=f"Agent with id {function_input.agent_id} not found"
                )

            # Validate MCP server exists
            server_query = select(McpServer).where(McpServer.id == uuid.UUID(function_input.mcp_server_id))
            server_result = await db.execute(server_query)
            server = server_result.scalar_one_or_none()
            if not server:
                return AgentMcpToolSingleOutput(
                    success=False,
                    error=f"MCP server with id {function_input.mcp_server_id} not found"
                )

            # Check if tool already exists for this agent and server
            existing_query = select(AgentMcpTool).where(
                and_(
                    AgentMcpTool.agent_id == uuid.UUID(function_input.agent_id),
                    AgentMcpTool.mcp_server_id == uuid.UUID(function_input.mcp_server_id),
                    AgentMcpTool.tool_name == function_input.tool_name
                )
            )
            existing_result = await db.execute(existing_query)
            existing_tool = existing_result.scalar_one_or_none()
            if existing_tool:
                return AgentMcpToolSingleOutput(
                    success=False,
                    error=f"Tool '{function_input.tool_name}' already exists for this agent and server"
                )

            # Create new tool
            new_tool = AgentMcpTool(
                agent_id=uuid.UUID(function_input.agent_id),
                mcp_server_id=uuid.UUID(function_input.mcp_server_id),
                tool_name=function_input.tool_name,
                custom_description=function_input.custom_description,
                require_approval=function_input.require_approval,
                enabled=function_input.enabled,
            )
            
            db.add(new_tool)
            await db.commit()
            await db.refresh(new_tool)

            return AgentMcpToolSingleOutput(
                success=True,
                data=_convert_to_tool_data(new_tool, server)
            )

        except Exception as e:
            await db.rollback()
            return AgentMcpToolSingleOutput(
                success=False,
                error=f"Failed to create agent MCP tool: {str(e)}"
            )


@function.defn()
async def agent_mcp_tools_read_by_agent(
    function_input: AgentMcpToolsByAgentInput,
) -> AgentMcpToolListOutput:
    """Get all MCP tools for an agent."""
    async for db in get_async_db():
        try:
            # Query tools with server info
            query = (
                select(AgentMcpTool, McpServer)
                .join(McpServer, AgentMcpTool.mcp_server_id == McpServer.id)
                .where(AgentMcpTool.agent_id == uuid.UUID(function_input.agent_id))
                .order_by(McpServer.server_label, AgentMcpTool.tool_name)
            )
            
            result = await db.execute(query)
            rows = result.all()

            tools = []
            for tool, server in rows:
                tools.append(_convert_to_tool_data(tool, server))

            return AgentMcpToolListOutput(
                success=True,
                data=tools
            )

        except Exception as e:
            return AgentMcpToolListOutput(
                success=False,
                error=f"Failed to read agent MCP tools: {str(e)}"
            )


@function.defn()
async def agent_mcp_tools_update(
    function_input: AgentMcpToolUpdateInput,
) -> AgentMcpToolSingleOutput:
    """Update an agent MCP tool."""
    async for db in get_async_db():
        try:
            # Find the tool with server info
            query = (
                select(AgentMcpTool, McpServer)
                .join(McpServer, AgentMcpTool.mcp_server_id == McpServer.id)
                .where(AgentMcpTool.id == uuid.UUID(function_input.id))
            )
            
            result = await db.execute(query)
            row = result.first()
            
            if not row:
                return AgentMcpToolSingleOutput(
                    success=False,
                    error=f"Agent MCP tool with id {function_input.id} not found"
                )

            tool, server = row

            # Update fields if provided
            if function_input.custom_description is not None:
                tool.custom_description = function_input.custom_description
            if function_input.require_approval is not None:
                tool.require_approval = function_input.require_approval
            if function_input.enabled is not None:
                tool.enabled = function_input.enabled

            await db.commit()
            await db.refresh(tool)

            return AgentMcpToolSingleOutput(
                success=True,
                data=_convert_to_tool_data(tool, server)
            )

        except Exception as e:
            await db.rollback()
            return AgentMcpToolSingleOutput(
                success=False,
                error=f"Failed to update agent MCP tool: {str(e)}"
            )


@function.defn()
async def agent_mcp_tools_delete(
    function_input: AgentMcpToolDeleteInput,
) -> AgentMcpToolDeleteOutput:
    """Delete an agent MCP tool."""
    async for db in get_async_db():
        try:
            # Find and delete the tool
            query = select(AgentMcpTool).where(AgentMcpTool.id == uuid.UUID(function_input.id))
            result = await db.execute(query)
            tool = result.scalar_one_or_none()
            
            if not tool:
                return AgentMcpToolDeleteOutput(
                    success=False,
                    error=f"Agent MCP tool with id {function_input.id} not found"
                )

            await db.delete(tool)
            await db.commit()

            return AgentMcpToolDeleteOutput(success=True)

        except Exception as e:
            await db.rollback()
            return AgentMcpToolDeleteOutput(
                success=False,
                error=f"Failed to delete agent MCP tool: {str(e)}"
            )


@function.defn()
async def agent_mcp_tools_list(
    function_input: AgentMcpToolListInput,
) -> AgentMcpToolListOutput:
    """List available tools from an MCP server for an agent."""
    async for db in get_async_db():
        try:
            # Get MCP server info
            server_query = select(McpServer).where(McpServer.id == uuid.UUID(function_input.mcp_server_id))
            server_result = await db.execute(server_query)
            server = server_result.scalar_one_or_none()
            
            if not server:
                return AgentMcpToolListOutput(
                    success=False,
                    error=f"MCP server with id {function_input.mcp_server_id} not found"
                )

            # Get existing tools for this agent and server
            existing_query = select(AgentMcpTool.tool_name).where(
                and_(
                    AgentMcpTool.agent_id == uuid.UUID(function_input.agent_id),
                    AgentMcpTool.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
                )
            )
            existing_result = await db.execute(existing_query)
            existing_tools = {row[0] for row in existing_result.all()}

            # Discover tools from MCP server
            server_url = server.server_url
            if server.local:
                server_url = "placeholder"  # Will use MCP_URL env var

            # Get OAuth token if available
            headers = server.headers or {}
            try:
                from src.functions.mcp_oauth_crud import get_oauth_token_for_mcp_server, GetOAuthTokenForMcpServerInput
                oauth_token = await get_oauth_token_for_mcp_server(
                    GetOAuthTokenForMcpServerInput(
                        mcp_server_id=function_input.mcp_server_id,
                        user_id=None,  # Will use most recent token for this MCP server
                        workspace_id=function_input.workspace_id
                    )
                )
                if oauth_token:
                    headers["Authorization"] = f"Bearer {oauth_token}"
            except Exception as e:
                # OAuth token retrieval failed, continue without auth
                pass

            # Use the same approach as McpToolsListWorkflow: try session init first
            from src.functions.mcp_tools_refresh import (
                mcp_session_init, mcp_tools_list, mcp_tools_list_direct,
                McpSessionInitInput, McpToolsSessionInput, McpToolsListDirectInput
            )
            
            # First, try initialization to check if session is needed
            session_init_input = McpSessionInitInput(
                server_url=server_url,
                headers=headers,
                local=server.local
            )
            session_init_result = await mcp_session_init(session_init_input)
            
            # Check if server returned a session ID (indicates session is required)
            if session_init_result.session_id:
                # Use session-based tool listing
                tools_input = McpToolsSessionInput(
                    mcp_endpoint=session_init_result.mcp_endpoint or server_url,
                    session_id=session_init_result.session_id,
                    headers=headers,
                )
                tools_result = await mcp_tools_list(tools_input)
            else:
                # Use direct tool listing (no session required)
                tools_input = McpToolsListDirectInput(
                    server_url=server_url,
                    headers=headers,
                    local=server.local
                )
                tools_result = await mcp_tools_list_direct(tools_input)

            if not tools_result.success:
                return AgentMcpToolListOutput(
                    success=False,
                    error=tools_result.error or "Failed to list tools from MCP server"
                )

            # Convert to listed tools format
            listed_tools = []
            for tool_name in tools_result.tools or []:
                listed_tools.append(ListedTool(
                    name=tool_name,
                    description=None,  # MCP servers don't typically provide descriptions in tool listing
                    already_added=tool_name in existing_tools
                ))

            return AgentMcpToolListOutput(
                success=True,
                tools=listed_tools
            )

        except Exception as e:
            return AgentMcpToolListOutput(
                success=False,
                error=f"Failed to list tools: {str(e)}"
            )
