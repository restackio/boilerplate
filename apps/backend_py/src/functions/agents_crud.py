import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import and_, func, select
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import Agent


# Pydantic models for input validation
class AgentMcpRelationshipInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)
    allowed_tools: list[str] | None = None


class AgentCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9-_]+$")
    version: str = Field(default="v1.0", max_length=50)
    description: str | None = None
    instructions: str | None = None
    status: str = Field(
        default="inactive", pattern="^(active|inactive)$"
    )
    parent_agent_id: str | None = None
    # New GPT-5 model configuration fields
    model: str = Field(
        default="gpt-5",
        pattern=r"^(gpt-5|gpt-5-mini|gpt-5-nano|gpt-5-2025-08-07|gpt-5-mini-2025-08-07|gpt-5-nano-2025-08-07|gpt-4\.1|gpt-4\.1-mini|gpt-4\.1-nano|gpt-4o|gpt-4o-mini)$"
    )
    reasoning_effort: str = Field(
        default="medium",
        pattern="^(minimal|low|medium|high)$"
    )
    response_format: dict | None = Field(default={"type": "text"})

    mcp_relationships: list[AgentMcpRelationshipInput] | None = (
        Field(
            default=None,
            description="MCP server relationships to create for this agent",
        )
    )


class AgentUpdateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    name: str | None = Field(None, min_length=1, max_length=255, pattern=r"^[a-z0-9-_]+$")
    version: str | None = Field(None, max_length=50)
    description: str | None = None
    instructions: str | None = Field(None, min_length=1)
    status: str | None = Field(
        None, pattern="^(active|inactive)$"
    )
    parent_agent_id: str | None = None
    # New GPT-5 model configuration fields
    model: str | None = Field(
        None,
        pattern=r"^(gpt-5|gpt-5-mini|gpt-5-nano|gpt-5-2025-08-07|gpt-5-mini-2025-08-07|gpt-5-nano-2025-08-07|gpt-4\.1|gpt-4\.1-mini|gpt-4\.1-nano|gpt-4o|gpt-4o-mini)$"
    )
    reasoning_effort: str | None = Field(
        None,
        pattern="^(minimal|low|medium|high)$"
    )
    response_format: dict | None = None



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
    team_id: str | None = None
    team_name: str | None = None
    name: str
    version: str
    description: str | None
    instructions: str | None
    status: str
    parent_agent_id: str | None
    # New GPT-5 model configuration fields
    model: str = "gpt-5"
    reasoning_effort: str = "medium"
    response_format: dict = {"type": "text"}

    created_at: str | None
    updated_at: str | None
    version_count: int = 1  # Number of versions for this agent
    latest_version: str = "v1.0"  # The latest version number

    class Config:
        """Pydantic configuration."""

        """Pydantic configuration."""
        from_attributes = True


class AgentListOutput(BaseModel):
    agents: list[AgentOutput]


class AgentSingleOutput(BaseModel):
    agent: AgentOutput


class AgentDeleteOutput(BaseModel):
    success: bool


def get_latest_agent_versions(
    agents: list[Agent],
) -> list[AgentOutput]:
    """Helper function to get the latest version of each agent from a list of agents."""
    # Group agents by parent_agent_id (or by id if no parent_agent_id)
    agent_groups = {}
    for agent in agents:
        # Use parent_agent_id as key, or the agent's own id if it's a parent
        group_key = (
            str(agent.parent_agent_id)
            if agent.parent_agent_id
            else str(agent.id)
        )

        if group_key not in agent_groups:
            agent_groups[group_key] = []
        agent_groups[group_key].append(agent)

    # For each group, select the latest version (most recent created_at)
    result = []
    for group_agents in agent_groups.values():
        if group_agents:
            # Sort by created_at descending and take the first (latest)
            latest_agent = max(
                group_agents,
                key=lambda x: x.created_at or datetime.min,
            )

            # Calculate version count and latest version
            version_count = len(group_agents)
            latest_version = latest_agent.version

            result.append(
                AgentOutput(
                    id=str(latest_agent.id),
                    workspace_id=str(latest_agent.workspace_id),
                    name=latest_agent.name,
                    version=latest_agent.version,
                    description=latest_agent.description,
                    instructions=latest_agent.instructions,
                    status=latest_agent.status,
                    parent_agent_id=str(
                        latest_agent.parent_agent_id
                    )
                    if latest_agent.parent_agent_id
                    else None,
                    # New GPT-5 model configuration fields
                    model=latest_agent.model or "gpt-5",
                    reasoning_effort=latest_agent.reasoning_effort or "medium",
                    response_format=latest_agent.response_format or {"type": "text"},

                    created_at=latest_agent.created_at.isoformat()
                    if latest_agent.created_at
                    else None,
                    updated_at=latest_agent.updated_at.isoformat()
                    if latest_agent.updated_at
                    else None,
                    version_count=version_count,
                    latest_version=latest_version,
                )
            )

    return result


@function.defn()
async def agents_read(
    function_input: AgentGetByWorkspaceInput,
) -> AgentListOutput:
    """Read all agents from database for a specific workspace, returning only the latest version of each agent."""
    async for db in get_async_db():
        try:
            # Subquery to get the latest created_at for each agent group in the workspace
            latest_versions_subquery = (
                select(
                    func.coalesce(
                        Agent.parent_agent_id, Agent.id
                    ).label("group_key"),
                    func.max(Agent.created_at).label(
                        "latest_created_at"
                    ),
                )
                .where(
                    Agent.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .group_by(
                    func.coalesce(Agent.parent_agent_id, Agent.id)
                )
                .subquery()
            )

            # Main query to get the latest version of each agent in the workspace
            latest_agents_query = (
                select(Agent)
                .options(selectinload(Agent.team))
                .join(
                    latest_versions_subquery,
                    and_(
                        func.coalesce(
                            Agent.parent_agent_id, Agent.id
                        )
                        == latest_versions_subquery.c.group_key,
                        Agent.created_at
                        == latest_versions_subquery.c.latest_created_at,
                    ),
                )
                .where(
                    Agent.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .order_by(Agent.name.asc())
            )

            result = await db.execute(latest_agents_query)
            latest_agents = result.scalars().all()

            # Convert to output format
            output_result = []
            for agent in latest_agents:
                # Count total versions for this agent group
                group_key = (
                    str(agent.parent_agent_id)
                    if agent.parent_agent_id
                    else str(agent.id)
                )
                version_count_query = select(
                    func.count(Agent.id)
                ).where(
                    func.coalesce(Agent.parent_agent_id, Agent.id)
                    == group_key
                )
                version_count_result = await db.execute(
                    version_count_query
                )
                version_count = version_count_result.scalar()

                output_result.append(
                    AgentOutput(
                        id=str(agent.id),
                        workspace_id=str(agent.workspace_id),
                        team_id=str(agent.team_id)
                        if agent.team_id
                        else None,
                        team_name=agent.team.name
                        if agent.team
                        else None,
                        name=agent.name,
                        version=agent.version,
                        description=agent.description,
                        instructions=agent.instructions,
                        status=agent.status,
                        parent_agent_id=str(agent.parent_agent_id)
                        if agent.parent_agent_id
                        else None,
                        # New GPT-5 model configuration fields
                        model=agent.model or "gpt-5",
                        reasoning_effort=agent.reasoning_effort or "medium",
                        response_format=agent.response_format or {"type": "text"},

                        created_at=agent.created_at.isoformat()
                        if agent.created_at
                        else None,
                        updated_at=agent.updated_at.isoformat()
                        if agent.updated_at
                        else None,
                        version_count=version_count or 1,
                        latest_version=agent.version,
                    )
                )

            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_create(
    agent_data: AgentCreateInput,
) -> AgentSingleOutput:
    """Create a new agent."""
    async for db in get_async_db():
        try:
            # Convert parent_agent_id string to UUID if provided
            parent_agent_id = None
            if agent_data.parent_agent_id:
                try:
                    parent_agent_id = uuid.UUID(
                        agent_data.parent_agent_id
                    )
                except ValueError as e:
                    raise NonRetryableError(
                        message="Invalid parent_agent_id format"
                    ) from e

            agent = Agent(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(agent_data.workspace_id),
                name=agent_data.name,
                version=agent_data.version,
                description=agent_data.description,
                instructions=agent_data.instructions,
                status=agent_data.status,
                parent_agent_id=parent_agent_id,
                # New GPT-5 model configuration fields
                model=agent_data.model,
                reasoning_effort=agent_data.reasoning_effort,
                response_format=agent_data.response_format,

            )
            db.add(agent)
            await db.commit()
            await db.refresh(agent)

            # Create MCP server relationships if provided
            if agent_data.mcp_relationships:
                from src.database.models import AgentTool
                for mcp_rel in agent_data.mcp_relationships:
                    agent_tool = AgentTool(
                        id=uuid.uuid4(),
                        agent_id=agent.id,
                        tool_type="mcp",
                        mcp_server_id=uuid.UUID(
                            mcp_rel.mcp_server_id
                        ),
                        allowed_tools=mcp_rel.allowed_tools,
                        enabled=True,
                    )
                    db.add(agent_tool)

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
                parent_agent_id=str(agent.parent_agent_id)
                if agent.parent_agent_id
                else None,
                # New GPT-5 model configuration fields
                model=agent.model or "gpt-5",
                reasoning_effort=agent.reasoning_effort or "medium",
                response_format=agent.response_format or {"type": "text"},
                created_at=agent.created_at.isoformat()
                if agent.created_at
                else None,
                updated_at=agent.updated_at.isoformat()
                if agent.updated_at
                else None,
            )
            return AgentSingleOutput(agent=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create agent: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_update(
    function_input: AgentUpdateInput,
) -> AgentSingleOutput:
    """Update an existing agent."""
    async for db in get_async_db():
        try:
            agent_query = select(Agent).where(
                Agent.id == uuid.UUID(function_input.agent_id)
            )
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()

            if not agent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent with id {function_input.agent_id} not found"
                )
            update_data = function_input.dict(
                exclude_unset=True, exclude={"agent_id"}
            )

            # Handle parent_agent_id conversion
            if update_data.get("parent_agent_id"):
                try:
                    update_data["parent_agent_id"] = uuid.UUID(
                        update_data["parent_agent_id"]
                    )
                except ValueError as e:
                    raise NonRetryableError(
                        message="Invalid parent_agent_id format"
                    ) from e

            for key, value in update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)

            agent.updated_at = datetime.now(tz=timezone.utc).replace(tzinfo=None)
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
                parent_agent_id=str(agent.parent_agent_id)
                if agent.parent_agent_id
                else None,
                # New GPT-5 model configuration fields
                model=agent.model or "gpt-5",
                reasoning_effort=agent.reasoning_effort or "medium",
                response_format=agent.response_format or {"type": "text"},
                created_at=agent.created_at.isoformat()
                if agent.created_at
                else None,
                updated_at=agent.updated_at.isoformat()
                if agent.updated_at
                else None,
            )
            return AgentSingleOutput(agent=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update agent: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_delete(
    function_input: AgentIdInput,
) -> AgentDeleteOutput:
    """Delete an agent and all its versions."""
    async for db in get_async_db():
        try:
            # First, find the agent to determine if it's a parent or child
            agent_query = select(Agent).where(
                Agent.id == uuid.UUID(function_input.agent_id)
            )
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()

            if not agent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent with id {function_input.agent_id} not found"
                )
            # Determine the group key (parent_agent_id or agent's own id if it's a parent)
            (
                str(agent.parent_agent_id)
                if agent.parent_agent_id
                else str(agent.id)
            )

            # Delete all agents in this group (the agent and all its versions)
            if agent.parent_agent_id:
                # This is a child agent, delete it and all its siblings
                agents_to_delete_query = select(Agent).where(
                    Agent.parent_agent_id == agent.parent_agent_id
                )
            else:
                # This is a parent agent, delete it and all its children
                agents_to_delete_query = select(Agent).where(
                    (Agent.id == agent.id)
                    | (Agent.parent_agent_id == agent.id)
                )

            agents_to_delete_result = await db.execute(
                agents_to_delete_query
            )
            agents_to_delete = (
                agents_to_delete_result.scalars().all()
            )

            # Delete all agents in the group
            for agent_to_delete in agents_to_delete:
                await db.delete(agent_to_delete)

            await db.commit()
            return AgentDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete agent: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_get_by_id(
    function_input: AgentIdInput,
) -> AgentSingleOutput:
    """Get agent by ID."""
    async for db in get_async_db():
        try:
            # Get the specific agent by ID
            agent_query = select(Agent).options(selectinload(Agent.team)).where(
                Agent.id == uuid.UUID(function_input.agent_id)
            )
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()

            if not agent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent with id {function_input.agent_id} not found"
                )
            result = AgentOutput(
                id=str(agent.id),
                workspace_id=str(agent.workspace_id),
                team_id=str(agent.team_id)
                if agent.team_id
                else None,
                team_name=agent.team.name
                if agent.team
                else None,
                name=agent.name,
                version=agent.version,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id)
                if agent.parent_agent_id
                else None,
                # New GPT-5 model configuration fields
                model=agent.model or "gpt-5",
                reasoning_effort=agent.reasoning_effort or "medium",
                response_format=agent.response_format or {"type": "text"},
                created_at=agent.created_at.isoformat()
                if agent.created_at
                else None,
                updated_at=agent.updated_at.isoformat()
                if agent.updated_at
                else None,
            )
            return AgentSingleOutput(agent=result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get agent: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_get_by_status(
    function_input: AgentGetByStatusInput,
) -> AgentListOutput:
    """Get agents by status, returning only the latest version of each agent."""
    async for db in get_async_db():
        try:
            # Use a subquery to get the latest version of each agent group with the specified status

            # Subquery to get the latest created_at for each agent group with the specified status
            latest_versions_subquery = (
                select(
                    func.coalesce(
                        Agent.parent_agent_id, Agent.id
                    ).label("group_key"),
                    func.max(Agent.created_at).label(
                        "latest_created_at"
                    ),
                )
                .where(Agent.status == function_input.status)
                .group_by(
                    func.coalesce(Agent.parent_agent_id, Agent.id)
                )
                .subquery()
            )

            # Main query to get the latest version of each agent with the specified status
            latest_agents_query = (
                select(Agent)
                .join(
                    latest_versions_subquery,
                    and_(
                        func.coalesce(
                            Agent.parent_agent_id, Agent.id
                        )
                        == latest_versions_subquery.c.group_key,
                        Agent.created_at
                        == latest_versions_subquery.c.latest_created_at,
                    ),
                )
                .where(Agent.status == function_input.status)
            )

            result = await db.execute(latest_agents_query)
            latest_agents = result.scalars().all()

            # Convert to output format
            output_result = []
            for agent in latest_agents:
                # Count total versions for this agent group
                group_key = (
                    str(agent.parent_agent_id)
                    if agent.parent_agent_id
                    else str(agent.id)
                )
                version_count_query = select(
                    func.count(Agent.id)
                ).where(
                    func.coalesce(Agent.parent_agent_id, Agent.id)
                    == group_key
                )
                version_count_result = await db.execute(
                    version_count_query
                )
                version_count = version_count_result.scalar()

                output_result.append(
                    AgentOutput(
                        id=str(agent.id),
                        workspace_id=str(agent.workspace_id),
                        name=agent.name,
                        version=agent.version,
                        description=agent.description,
                        instructions=agent.instructions,
                        status=agent.status,
                        parent_agent_id=str(agent.parent_agent_id)
                        if agent.parent_agent_id
                        else None,
                        # New GPT-5 model configuration fields
                        model=agent.model or "gpt-5",
                        reasoning_effort=agent.reasoning_effort or "medium",
                        response_format=agent.response_format or {"type": "text"},

                        created_at=agent.created_at.isoformat()
                        if agent.created_at
                        else None,
                        updated_at=agent.updated_at.isoformat()
                        if agent.updated_at
                        else None,
                        version_count=version_count,
                        latest_version=agent.version,
                    )
                )

            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get agents by status: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_get_versions(
    function_input: AgentGetVersionsInput,
) -> AgentListOutput:
    """Get all versions of an agent by parent_agent_id."""
    async for db in get_async_db():
        try:
            # Convert parent_agent_id string to UUID
            try:
                parent_agent_id = uuid.UUID(
                    function_input.parent_agent_id
                )
            except ValueError as e:
                raise NonRetryableError(
                    message="Invalid parent_agent_id format"
                ) from e
            agents_query = select(Agent).where(
                Agent.parent_agent_id == parent_agent_id
            )
            result = await db.execute(agents_query)
            agents = result.scalars().all()

            output_result = []
            for agent in agents:
                output_result.append(  # noqa: PERF401
                    AgentOutput(
                        id=str(agent.id),
                        workspace_id=str(agent.workspace_id),
                        name=agent.name,
                        version=agent.version,
                        description=agent.description,
                        instructions=agent.instructions,
                        status=agent.status,
                        parent_agent_id=str(agent.parent_agent_id)
                        if agent.parent_agent_id
                        else None,
                        # New GPT-5 model configuration fields
                        model=agent.model or "gpt-5",
                        reasoning_effort=agent.reasoning_effort or "medium",
                        response_format=agent.response_format or {"type": "text"},

                        created_at=agent.created_at.isoformat()
                        if agent.created_at
                        else None,
                        updated_at=agent.updated_at.isoformat()
                        if agent.updated_at
                        else None,
                    )
                )
            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get agent versions: {e!s}"
            ) from e
    return None


class AgentResolveInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    agent_name: str = Field(..., min_length=1, pattern=r"^[a-z0-9-_]+$")


class AgentResolveOutput(BaseModel):
    agent_id: str


@function.defn()
async def agents_resolve_by_name(
    function_input: AgentResolveInput,
) -> AgentResolveOutput:
    """Resolve agent name to the latest active agent ID."""
    async for db in get_async_db():
        try:
            # Find the latest active agent by name
            from sqlalchemy import and_, func

            # Subquery to get the latest created_at for each agent group in the workspace
            latest_versions_subquery = (
                select(
                    func.coalesce(
                        Agent.parent_agent_id, Agent.id
                    ).label("group_key"),
                    func.max(Agent.created_at).label(
                        "latest_created_at"
                    ),
                )
                .where(
                    and_(
                        Agent.workspace_id == uuid.UUID(function_input.workspace_id),
                        Agent.name == function_input.agent_name
                    )
                )
                .group_by(
                    func.coalesce(Agent.parent_agent_id, Agent.id)
                )
                .subquery()
            )

            # Main query to get the latest active agent by name
            agent_query = (
                select(Agent)
                .join(
                    latest_versions_subquery,
                    and_(
                        func.coalesce(
                            Agent.parent_agent_id, Agent.id
                        )
                        == latest_versions_subquery.c.group_key,
                        Agent.created_at
                        == latest_versions_subquery.c.latest_created_at,
                    ),
                )
                .where(
                    and_(
                        Agent.workspace_id == uuid.UUID(function_input.workspace_id),
                        Agent.name == function_input.agent_name,
                        Agent.status == "active"
                    )
                )
            )

            result = await db.execute(agent_query)
            agent = result.scalars().first()

            if not agent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent '{function_input.agent_name}' not found or not active in workspace"
                )

            return AgentResolveOutput(agent_id=str(agent.id))

        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to resolve agent by name: {e!s}"
            ) from e
    return None
