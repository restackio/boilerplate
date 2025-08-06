import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import get_async_db
from ..database.models import McpServer

# Pydantic models for approval structure
class McpApprovalToolFilter(BaseModel):
    tool_names: List[str] = Field(default_factory=list)

class McpRequireApproval(BaseModel):
    never: McpApprovalToolFilter = Field(default_factory=McpApprovalToolFilter)
    always: McpApprovalToolFilter = Field(default_factory=McpApprovalToolFilter)

# Pydantic models for input validation
class McpServerCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    server_label: str = Field(..., min_length=1, max_length=255)
    server_url: str = Field(..., min_length=1, max_length=500)
    server_description: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    require_approval: McpRequireApproval = Field(default_factory=McpRequireApproval)

class McpServerUpdateInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)
    server_label: Optional[str] = Field(None, min_length=1, max_length=255)
    server_url: Optional[str] = Field(None, min_length=1, max_length=500)
    server_description: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    require_approval: Optional[McpRequireApproval] = None

class McpServerIdInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)

class McpServerGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)

# Pydantic models for output serialization
class McpServerOutput(BaseModel):
    id: str
    workspace_id: str
    server_label: str
    server_url: str
    server_description: Optional[str]
    headers: Optional[Dict[str, str]]
    require_approval: McpRequireApproval
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class McpServerListOutput(BaseModel):
    mcp_servers: List[McpServerOutput]

class McpServerSingleOutput(BaseModel):
    mcp_server: McpServerOutput

class McpServerDeleteOutput(BaseModel):
    success: bool

@function.defn()
async def mcp_servers_read(input: McpServerGetByWorkspaceInput) -> McpServerListOutput:
    """Read all MCP servers from database for a specific workspace"""
    async for db in get_async_db():
        try:
            mcp_servers_query = select(McpServer).where(
                McpServer.workspace_id == uuid.UUID(input.workspace_id)
            )
            result = await db.execute(mcp_servers_query)
            mcp_servers = result.scalars().all()
            
            output_result = []
            for mcp_server in mcp_servers:
                output_result.append(McpServerOutput(
                    id=str(mcp_server.id),
                    workspace_id=str(mcp_server.workspace_id),
                    server_label=mcp_server.server_label,
                    server_url=mcp_server.server_url,
                    server_description=mcp_server.server_description,
                    headers=mcp_server.headers,
                    require_approval=McpRequireApproval.model_validate(mcp_server.require_approval),
                    created_at=mcp_server.created_at.isoformat() if mcp_server.created_at else None,
                    updated_at=mcp_server.updated_at.isoformat() if mcp_server.updated_at else None,
                ))
            
            return McpServerListOutput(mcp_servers=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Database error: {str(e)}")

@function.defn()
async def mcp_servers_create(mcp_server_data: McpServerCreateInput) -> McpServerSingleOutput:
    """Create a new MCP server"""
    async for db in get_async_db():
        try:
            mcp_server = McpServer(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(mcp_server_data.workspace_id),
                server_label=mcp_server_data.server_label,
                server_url=mcp_server_data.server_url,
                server_description=mcp_server_data.server_description,
                headers=mcp_server_data.headers,
                require_approval=mcp_server_data.require_approval.model_dump(),
            )
            db.add(mcp_server)
            await db.commit()
            await db.refresh(mcp_server)
            result = McpServerOutput(
                id=str(mcp_server.id),
                workspace_id=str(mcp_server.workspace_id),
                server_label=mcp_server.server_label,
                server_url=mcp_server.server_url,
                server_description=mcp_server.server_description,
                headers=mcp_server.headers,
                require_approval=McpRequireApproval.model_validate(mcp_server.require_approval),
                created_at=mcp_server.created_at.isoformat() if mcp_server.created_at else None,
                updated_at=mcp_server.updated_at.isoformat() if mcp_server.updated_at else None,
            )
            return McpServerSingleOutput(mcp_server=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to create MCP server: {str(e)}")

@function.defn()
async def mcp_servers_update(input: McpServerUpdateInput) -> McpServerSingleOutput:
    """Update an existing MCP server"""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(McpServer.id == uuid.UUID(input.mcp_server_id))
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()
            
            if not mcp_server:
                raise NonRetryableError(message=f"MCP server with id {input.mcp_server_id} not found")
            
            update_data = input.dict(exclude_unset=True, exclude={'mcp_server_id'})
            
            for key, value in update_data.items():
                if hasattr(mcp_server, key):
                    # Special handling for require_approval to convert to dict
                    if key == 'require_approval' and isinstance(value, McpRequireApproval):
                        setattr(mcp_server, key, value.model_dump())
                    else:
                        setattr(mcp_server, key, value)
            
            mcp_server.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(mcp_server)
            result = McpServerOutput(
                id=str(mcp_server.id),
                workspace_id=str(mcp_server.workspace_id),
                server_label=mcp_server.server_label,
                server_url=mcp_server.server_url,
                server_description=mcp_server.server_description,
                headers=mcp_server.headers,
                require_approval=McpRequireApproval.model_validate(mcp_server.require_approval),
                created_at=mcp_server.created_at.isoformat() if mcp_server.created_at else None,
                updated_at=mcp_server.updated_at.isoformat() if mcp_server.updated_at else None,
            )
            return McpServerSingleOutput(mcp_server=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update MCP server: {str(e)}")

@function.defn()
async def mcp_servers_delete(input: McpServerIdInput) -> McpServerDeleteOutput:
    """Delete an MCP server"""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(McpServer.id == uuid.UUID(input.mcp_server_id))
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()
            
            if not mcp_server:
                raise NonRetryableError(message=f"MCP server with id {input.mcp_server_id} not found")
            
            await db.delete(mcp_server)
            await db.commit()
            return McpServerDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to delete MCP server: {str(e)}")

@function.defn()
async def mcp_servers_get_by_id(input: McpServerIdInput) -> McpServerSingleOutput:
    """Get MCP server by ID"""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(McpServer.id == uuid.UUID(input.mcp_server_id))
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()
            
            if not mcp_server:
                raise NonRetryableError(message=f"MCP server with id {input.mcp_server_id} not found")
            
            output_result = McpServerOutput(
                id=str(mcp_server.id),
                workspace_id=str(mcp_server.workspace_id),
                server_label=mcp_server.server_label,
                server_url=mcp_server.server_url,
                server_description=mcp_server.server_description,
                headers=mcp_server.headers,
                require_approval=McpRequireApproval.model_validate(mcp_server.require_approval),
                created_at=mcp_server.created_at.isoformat() if mcp_server.created_at else None,
                updated_at=mcp_server.updated_at.isoformat() if mcp_server.updated_at else None,
            )
            return McpServerSingleOutput(mcp_server=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get MCP server: {str(e)}") 