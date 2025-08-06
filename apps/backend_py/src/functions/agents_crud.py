import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, and_, select
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import get_async_db
from ..database.models import Agent, AgentMcpServer

# Pydantic models for input validation
class AgentMcpRelationshipInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)
    allowed_tools: Optional[List[str]] = None

class AgentCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    version: str = Field(default="v1.0", max_length=50)
    description: Optional[str] = None
    instructions: Optional[str] = None
    status: str = Field(default="inactive", pattern="^(active|inactive)$")
    parent_agent_id: Optional[str] = None
    mcp_relationships: Optional[List[AgentMcpRelationshipInput]] = Field(default=None, description="MCP server relationships to create for this agent")

class AgentUpdateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    version: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    instructions: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")
    parent_agent_id: Optional[str] = None

class AgentIdInput(BaseModel):
    agent_id: str = Field(..., min_length=1)

class AgentGetByStatusInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    status: str = Field(..., pattern="^(active|inactive)$")

class AgentGetVersionsInput(BaseModel):
    parent_agent_id: str = Field(..., min_length=1)

class AgentGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)

# Pydantic models for output serialization
class AgentOutput(BaseModel):
    id: str
    workspace_id: str
    name: str
    version: str
    description: Optional[str]
    instructions: Optional[str]
    status: str
    parent_agent_id: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    version_count: int = 1  # Number of versions for this agent
    latest_version: str = "v1.0"  # The latest version number

    class Config:
        from_attributes = True

class AgentListOutput(BaseModel):
    agents: List[AgentOutput]

class AgentSingleOutput(BaseModel):
    agent: AgentOutput

class AgentDeleteOutput(BaseModel):
    success: bool

def get_latest_agent_versions(agents: List[Agent]) -> List[AgentOutput]:
    """Helper function to get the latest version of each agent from a list of agents"""
    # Group agents by parent_agent_id (or by id if no parent_agent_id)
    agent_groups = {}
    for agent in agents:
        # Use parent_agent_id as key, or the agent's own id if it's a parent
        group_key = str(agent.parent_agent_id) if agent.parent_agent_id else str(agent.id)
        
        if group_key not in agent_groups:
            agent_groups[group_key] = []
        agent_groups[group_key].append(agent)
    
    # For each group, select the latest version (most recent created_at)
    result = []
    for group_key, group_agents in agent_groups.items():
        if group_agents:
            # Sort by created_at descending and take the first (latest)
            latest_agent = max(group_agents, key=lambda x: x.created_at or datetime.min)
            
            # Calculate version count and latest version
            version_count = len(group_agents)
            latest_version = latest_agent.version
            
            result.append(AgentOutput(
                id=str(latest_agent.id),
                workspace_id=str(latest_agent.workspace_id),
                name=latest_agent.name,
                version=latest_agent.version,
                description=latest_agent.description,
                instructions=latest_agent.instructions,
                status=latest_agent.status,
                parent_agent_id=str(latest_agent.parent_agent_id) if latest_agent.parent_agent_id else None,
                created_at=latest_agent.created_at.isoformat() if latest_agent.created_at else None,
                updated_at=latest_agent.updated_at.isoformat() if latest_agent.updated_at else None,
                version_count=version_count,
                latest_version=latest_version,
            ))
    
    return result

@function.defn()
async def agents_read(input: AgentGetByWorkspaceInput) -> AgentListOutput:
    """Read all agents from database for a specific workspace, returning only the latest version of each agent"""
    async for db in get_async_db():
        try:
            # Use a subquery to get the latest version of each agent group for the specific workspace
            # This is much more efficient than loading all agents into memory
            
            # Subquery to get the latest created_at for each agent group in the workspace
            latest_versions_subquery = select(
                func.coalesce(Agent.parent_agent_id, Agent.id).label('group_key'),
                func.max(Agent.created_at).label('latest_created_at')
            ).where(
                Agent.workspace_id == uuid.UUID(input.workspace_id)
            ).group_by(
                func.coalesce(Agent.parent_agent_id, Agent.id)
            ).subquery()
            
            # Main query to get the latest version of each agent in the workspace
            latest_agents_query = select(Agent).join(
                latest_versions_subquery,
                and_(
                    func.coalesce(Agent.parent_agent_id, Agent.id) == latest_versions_subquery.c.group_key,
                    Agent.created_at == latest_versions_subquery.c.latest_created_at
                )
            ).where(
                Agent.workspace_id == uuid.UUID(input.workspace_id)
            )
            
            result = await db.execute(latest_agents_query)
            latest_agents = result.scalars().all()
            
            # Convert to output format
            output_result = []
            for agent in latest_agents:
                # Count total versions for this agent group
                group_key = str(agent.parent_agent_id) if agent.parent_agent_id else str(agent.id)
                version_count_query = select(func.count(Agent.id)).where(
                    func.coalesce(Agent.parent_agent_id, Agent.id) == group_key
                )
                version_count_result = await db.execute(version_count_query)
                version_count = version_count_result.scalar()
                
                output_result.append(AgentOutput(
                    id=str(agent.id),
                    workspace_id=str(agent.workspace_id),
                    name=agent.name,
                    version=agent.version,
                    description=agent.description,
                    instructions=agent.instructions,
                    status=agent.status,
                    parent_agent_id=str(agent.parent_agent_id) if agent.parent_agent_id else None,
                    created_at=agent.created_at.isoformat() if agent.created_at else None,
                    updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
                    version_count=version_count or 1,
                    latest_version=agent.version,
                ))
            
            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Database error: {str(e)}")

@function.defn()
async def agents_create(agent_data: AgentCreateInput) -> AgentSingleOutput:
    """Create a new agent"""
    async for db in get_async_db():
        try:
            # Convert parent_agent_id string to UUID if provided
            parent_agent_id = None
            if agent_data.parent_agent_id:
                try:
                    parent_agent_id = uuid.UUID(agent_data.parent_agent_id)
                except ValueError:
                    raise NonRetryableError(message="Invalid parent_agent_id format")
            
            agent = Agent(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(agent_data.workspace_id),
                name=agent_data.name,
                version=agent_data.version,
                description=agent_data.description,
                instructions=agent_data.instructions,
                status=agent_data.status,
                parent_agent_id=parent_agent_id,
            )
            db.add(agent)
            await db.commit()
            await db.refresh(agent)
            
            # Create MCP server relationships if provided
            if agent_data.mcp_relationships:
                for mcp_rel in agent_data.mcp_relationships:
                    agent_mcp_server = AgentMcpServer(
                        id=uuid.uuid4(),
                        agent_id=agent.id,
                        mcp_server_id=uuid.UUID(mcp_rel.mcp_server_id),
                        allowed_tools=mcp_rel.allowed_tools,
                    )
                    db.add(agent_mcp_server)
                
                # Commit the MCP server relationships
                await db.commit()
            result = AgentOutput(
                id=str(agent.id),
                workspace_id=str(agent.workspace_id),
                name=agent.name,
                version=agent.version,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id) if agent.parent_agent_id else None,
                created_at=agent.created_at.isoformat() if agent.created_at else None,
                updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
            )
            return AgentSingleOutput(agent=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to create agent: {str(e)}")

@function.defn()
async def agents_update(input: AgentUpdateInput) -> AgentSingleOutput:
    """Update an existing agent"""
    async for db in get_async_db():
        try:
            agent_query = select(Agent).where(Agent.id == uuid.UUID(input.agent_id))
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()
            
            if not agent:
                raise NonRetryableError(message=f"Agent with id {input.agent_id} not found")
            
            update_data = input.dict(exclude_unset=True, exclude={'agent_id'})
            
            # Handle parent_agent_id conversion
            if 'parent_agent_id' in update_data and update_data['parent_agent_id']:
                try:
                    update_data['parent_agent_id'] = uuid.UUID(update_data['parent_agent_id'])
                except ValueError:
                    raise NonRetryableError(message="Invalid parent_agent_id format")
            
            for key, value in update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)
            
            agent.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(agent)
            result = AgentOutput(
                id=str(agent.id),
                workspace_id=str(agent.workspace_id),
                name=agent.name,
                version=agent.version,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id) if agent.parent_agent_id else None,
                created_at=agent.created_at.isoformat() if agent.created_at else None,
                updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
            )
            return AgentSingleOutput(agent=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update agent: {str(e)}")

@function.defn()
async def agents_delete(input: AgentIdInput) -> AgentDeleteOutput:
    """Delete an agent and all its versions"""
    async for db in get_async_db():
        try:
            # First, find the agent to determine if it's a parent or child
            agent_query = select(Agent).where(Agent.id == uuid.UUID(input.agent_id))
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()
            
            if not agent:
                raise NonRetryableError(message=f"Agent with id {input.agent_id} not found")
            
            # Determine the group key (parent_agent_id or agent's own id if it's a parent)
            group_key = str(agent.parent_agent_id) if agent.parent_agent_id else str(agent.id)
            
            # Delete all agents in this group (the agent and all its versions)
            if agent.parent_agent_id:
                # This is a child agent, delete it and all its siblings
                agents_to_delete_query = select(Agent).where(
                    Agent.parent_agent_id == agent.parent_agent_id
                )
            else:
                # This is a parent agent, delete it and all its children
                agents_to_delete_query = select(Agent).where(
                    (Agent.id == agent.id) | (Agent.parent_agent_id == agent.id)
                )
            
            agents_to_delete_result = await db.execute(agents_to_delete_query)
            agents_to_delete = agents_to_delete_result.scalars().all()
            
            # Delete all agents in the group
            for agent_to_delete in agents_to_delete:
                await db.delete(agent_to_delete)
            
            await db.commit()
            return AgentDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to delete agent: {str(e)}")

@function.defn()
async def agents_get_by_id(input: AgentIdInput) -> AgentSingleOutput:
    """Get agent by ID"""
    async for db in get_async_db():
        try:
            # Get the specific agent by ID
            agent_query = select(Agent).where(Agent.id == uuid.UUID(input.agent_id))
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()
            
            if not agent:
                raise NonRetryableError(message=f"Agent with id {input.agent_id} not found")
            
            result = AgentOutput(
                id=str(agent.id),
                workspace_id=str(agent.workspace_id),
                name=agent.name,
                version=agent.version,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id) if agent.parent_agent_id else None,
                created_at=agent.created_at.isoformat() if agent.created_at else None,
                updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
            )
            return AgentSingleOutput(agent=result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get agent: {str(e)}")

@function.defn()
async def agents_get_by_status(input: AgentGetByStatusInput) -> AgentListOutput:
    """Get agents by status, returning only the latest version of each agent"""
    async for db in get_async_db():
        try:
            # Use a subquery to get the latest version of each agent group with the specified status
            
            # Subquery to get the latest created_at for each agent group with the specified status
            latest_versions_subquery = select(
                func.coalesce(Agent.parent_agent_id, Agent.id).label('group_key'),
                func.max(Agent.created_at).label('latest_created_at')
            ).where(
                Agent.status == input.status
            ).group_by(
                func.coalesce(Agent.parent_agent_id, Agent.id)
            ).subquery()
            
            # Main query to get the latest version of each agent with the specified status
            latest_agents_query = select(Agent).join(
                latest_versions_subquery,
                and_(
                    func.coalesce(Agent.parent_agent_id, Agent.id) == latest_versions_subquery.c.group_key,
                    Agent.created_at == latest_versions_subquery.c.latest_created_at
                )
            ).where(
                Agent.status == input.status
            )
            
            result = await db.execute(latest_agents_query)
            latest_agents = result.scalars().all()
            
            # Convert to output format
            output_result = []
            for agent in latest_agents:
                # Count total versions for this agent group
                group_key = str(agent.parent_agent_id) if agent.parent_agent_id else str(agent.id)
                version_count_query = select(func.count(Agent.id)).where(
                    func.coalesce(Agent.parent_agent_id, Agent.id) == group_key
                )
                version_count_result = await db.execute(version_count_query)
                version_count = version_count_result.scalar()
                
                output_result.append(AgentOutput(
                    id=str(agent.id),
                    workspace_id=str(agent.workspace_id),
                    name=agent.name,
                    version=agent.version,
                    description=agent.description,
                    instructions=agent.instructions,
                    status=agent.status,
                    parent_agent_id=str(agent.parent_agent_id) if agent.parent_agent_id else None,
                    created_at=agent.created_at.isoformat() if agent.created_at else None,
                    updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
                    version_count=version_count,
                    latest_version=agent.version,
                ))
            
            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get agents by status: {str(e)}")

@function.defn()
async def agents_get_versions(input: AgentGetVersionsInput) -> AgentListOutput:
    """Get all versions of an agent by parent_agent_id"""
    async for db in get_async_db():
        try:
            # Convert parent_agent_id string to UUID
            try:
                parent_agent_id = uuid.UUID(input.parent_agent_id)
            except ValueError:
                raise NonRetryableError(message="Invalid parent_agent_id format")
            
            agents_query = select(Agent).where(Agent.parent_agent_id == parent_agent_id)
            result = await db.execute(agents_query)
            agents = result.scalars().all()
            
            output_result = []
            for agent in agents:
                output_result.append(AgentOutput(
                    id=str(agent.id),
                    workspace_id=str(agent.workspace_id),
                    name=agent.name,
                    version=agent.version,
                    description=agent.description,
                    instructions=agent.instructions,
                    status=agent.status,
                    parent_agent_id=str(agent.parent_agent_id) if agent.parent_agent_id else None,
                    created_at=agent.created_at.isoformat() if agent.created_at else None,
                    updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
                ))
            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get agent versions: {str(e)}") 