import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import Agent, AgentSubagent, AgentTool


def _raise_source_agent_not_found_error(
    source_agent_id: str,
) -> None:
    """Raise error when source agent is not found for cloning."""
    raise NonRetryableError(
        message=f"Source agent with ID {source_agent_id} not found"
    )


# Pydantic models for input validation
class AgentCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9-_]+$",
    )
    description: str | None = None
    instructions: str | None = None
    status: str = Field(
        default="draft", pattern="^(published|draft|archived)$"
    )
    parent_agent_id: str | None = None
    # Agent type: interactive (user-facing) or pipeline (data processing)
    type: str = Field(
        default="interactive", pattern="^(interactive|pipeline)$"
    )
    # New GPT-5 model configuration fields
    model: str = Field(
        default="gpt-5",
        pattern=r"^(gpt-5|gpt-5-mini|gpt-5-nano|gpt-5-2025-08-07|gpt-5-mini-2025-08-07|gpt-5-nano-2025-08-07|gpt-4\.1|gpt-4\.1-mini|gpt-4\.1-nano|gpt-4o|gpt-4o-mini|o3-deep-research|o4-mini-deep-research)$",
    )
    reasoning_effort: str = Field(
        default="medium", pattern="^(minimal|low|medium|high)$"
    )
    
    # Optional: For pipeline agents, specify extraction tool (MCP server + tool name)
    # If not provided, defaults to generatemock for backward compatibility
    extraction_mcp_server_id: str | None = None
    extraction_tool_name: str | None = None

    # Note: MCP relationships are now created through the agent tools workflow
    # which requires specific tool names, not through agent creation


class AgentCloneInput(BaseModel):
    source_agent_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9-_]+$",
    )
    description: str | None = None
    instructions: str | None = None
    status: str = Field(
        default="draft", pattern="^(published|draft|archived)$"
    )
    # Agent type: interactive (user-facing) or pipeline (data processing)
    type: str = Field(
        default="interactive", pattern="^(interactive|pipeline)$"
    )
    # New GPT-5 model configuration fields
    model: str = Field(
        default="gpt-5",
        pattern=r"^(gpt-5|gpt-5-mini|gpt-5-nano|gpt-5-2025-08-07|gpt-5-mini-2025-08-07|gpt-5-nano-2025-08-07|gpt-4\.1|gpt-4\.1-mini|gpt-4\.1-nano|gpt-4o|gpt-4o-mini|o3-deep-research|o4-mini-deep-research)$",
    )
    reasoning_effort: str = Field(
        default="medium", pattern="^(minimal|low|medium|high)$"
    )


class AgentUpdateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    name: str | None = Field(
        None,
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9-_]+$",
    )
    description: str | None = None
    instructions: str | None = Field(None, min_length=1)
    status: str | None = Field(
        None, pattern="^(published|draft|archived)$"
    )
    parent_agent_id: str | None = None
    # Agent type: interactive (user-facing) or pipeline (data processing)
    type: str | None = Field(
        None, pattern="^(interactive|pipeline)$"
    )
    # New GPT-5 model configuration fields
    model: str | None = Field(
        None,
        pattern=r"^(gpt-5|gpt-5-mini|gpt-5-nano|gpt-5-2025-08-07|gpt-5-mini-2025-08-07|gpt-5-nano-2025-08-07|gpt-4\.1|gpt-4\.1-mini|gpt-4\.1-nano|gpt-4o|gpt-4o-mini|o3-deep-research|o4-mini-deep-research)$",
    )
    reasoning_effort: str | None = Field(
        None, pattern="^(minimal|low|medium|high)$"
    )


class AgentIdInput(BaseModel):
    agent_id: str = Field(..., min_length=1)


class AgentGetByStatusInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    status: str = Field(
        ..., pattern="^(published|draft|archived)$"
    )


class AgentGetVersionsInput(BaseModel):
    parent_agent_id: str = Field(..., min_length=1)


class AgentGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    published_only: bool = Field(
        default=False,
        description="If true, return only published agents",
    )
    parent_only: bool = Field(
        default=False,
        description="If true, return only parent agents",
    )


# Pydantic models for output serialization
class AgentOutput(BaseModel):
    id: str
    workspace_id: str
    team_id: str | None = None
    team_name: str | None = None
    name: str
    description: str | None
    instructions: str | None
    status: str
    parent_agent_id: str | None
    # Agent type: interactive (user-facing) or pipeline (data processing)
    type: str = "interactive"
    # New GPT-5 model configuration fields
    model: str = "gpt-5"
    reasoning_effort: str = "medium"

    created_at: str | None
    updated_at: str | None
    version_count: int = 1  # Number of versions for this agent

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

    # For each group, select the latest version (most recent updated_at)
    result = []
    for group_agents in agent_groups.values():
        if group_agents:
            # Sort by updated_at descending and take the first (latest)
            latest_agent = max(
                group_agents,
                key=lambda x: x.updated_at
                or datetime.min.replace(tzinfo=UTC),
            )

            # Calculate version count
            version_count = len(group_agents)

            result.append(
                AgentOutput(
                    id=str(latest_agent.id),
                    workspace_id=str(latest_agent.workspace_id),
                    name=latest_agent.name,
                    description=latest_agent.description,
                    instructions=latest_agent.instructions,
                    status=latest_agent.status,
                    is_draft=latest_agent.is_draft,
                    parent_agent_id=str(
                        latest_agent.parent_agent_id
                    )
                    if latest_agent.parent_agent_id
                    else None,
                    # New GPT-5 model configuration fields
                    model=latest_agent.model or "gpt-5",
                    reasoning_effort=latest_agent.reasoning_effort
                    or "medium",
                    created_at=latest_agent.created_at.isoformat()
                    if latest_agent.created_at
                    else None,
                    updated_at=latest_agent.updated_at.isoformat()
                    if latest_agent.updated_at
                    else None,
                    version_count=version_count,
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
            # Subquery to get the latest updated_at for each agent group in the workspace
            subquery_conditions = [
                Agent.workspace_id
                == uuid.UUID(function_input.workspace_id)
            ]
            if function_input.published_only:
                subquery_conditions.append(
                    Agent.status == "published"
                )
            latest_versions_subquery = (
                select(
                    func.coalesce(
                        Agent.parent_agent_id, Agent.id
                    ).label("group_key"),
                    func.max(Agent.updated_at).label(
                        "latest_updated_at"
                    ),
                )
                .where(and_(*subquery_conditions))
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
                        Agent.updated_at
                        == latest_versions_subquery.c.latest_updated_at,
                    ),
                )
                .where(
                    Agent.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .order_by(Agent.name.asc())
            )
            # Add published status filter if requested
            if function_input.published_only:
                latest_agents_query = latest_agents_query.where(
                    Agent.status == "published"
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
                        description=agent.description,
                        instructions=agent.instructions,
                        status=agent.status,
                        parent_agent_id=str(agent.parent_agent_id)
                        if agent.parent_agent_id
                        else None,
                        # New GPT-5 model configuration fields
                        model=agent.model or "gpt-5",
                        reasoning_effort=agent.reasoning_effort
                        or "medium",
                        created_at=agent.created_at.isoformat()
                        if agent.created_at
                        else None,
                        updated_at=agent.updated_at.isoformat()
                        if agent.updated_at
                        else None,
                        version_count=version_count or 1,
                    )
                )

            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


class AgentTableOutput(BaseModel):
    """Enhanced agent data for table display with versioning info."""

    id: str
    workspace_id: str
    team_id: str | None = None
    team_name: str | None = None
    name: str
    description: str | None = None
    instructions: str | None = None
    type: str | None = None
    status: str
    parent_agent_id: str | None = None
    model: str | None = "gpt-5"
    reasoning_effort: str | None = "medium"
    created_at: str | None = None
    updated_at: str | None = None
    version_count: int = 1
    published_version_id: str | None = None
    published_version_short: str | None = None
    draft_count: int = 0
    latest_draft_version_id: str | None = None
    latest_draft_version_short: str | None = None


class AgentTableListOutput(BaseModel):
    agents: list[AgentTableOutput]


def _process_agent_group(
    group_agents: list[Agent],
) -> AgentTableOutput:
    """Process a group of agent versions into table output."""
    # Find all published and draft versions
    published_agents = []
    draft_agents = []

    for agent in group_agents:
        if agent.status == "published":
            published_agents.append(agent)
        elif agent.status == "draft":
            draft_agents.append(agent)

    # Find the latest published version (most recent updated_at)
    published_agent = None
    if published_agents:
        published_agent = max(
            published_agents,
            key=lambda x: x.updated_at
            or datetime.min.replace(tzinfo=UTC),
        )

    # Determine which agent to show in the table
    # Priority: latest published version, fallback to latest overall if no published version
    display_agent = (
        published_agent
        if published_agent
        else max(
            group_agents,
            key=lambda x: x.updated_at
            or datetime.min.replace(tzinfo=UTC),
        )
    )

    # Create short UUID for published version
    published_version_short = None
    if published_agent:
        published_version_short = str(published_agent.id)[-5:]

    # Find latest draft version
    latest_draft_agent = None
    latest_draft_version_short = None
    if draft_agents:
        latest_draft_agent = max(
            draft_agents,
            key=lambda x: x.updated_at
            or datetime.min.replace(tzinfo=UTC),
        )
        latest_draft_version_short = str(latest_draft_agent.id)[
            -5:
        ]

    return AgentTableOutput(
        id=str(display_agent.id),
        workspace_id=str(display_agent.workspace_id),
        team_id=str(display_agent.team_id)
        if display_agent.team_id
        else None,
        team_name=display_agent.team.name
        if display_agent.team
        else None,
        name=display_agent.name,
        description=display_agent.description,
        instructions=display_agent.instructions,
        type=display_agent.type,
        status=display_agent.status,
        parent_agent_id=str(display_agent.parent_agent_id)
        if display_agent.parent_agent_id
        else None,
        model=display_agent.model or "gpt-5",
        reasoning_effort=display_agent.reasoning_effort
        or "medium",
        created_at=display_agent.created_at.isoformat()
        if display_agent.created_at
        else None,
        updated_at=display_agent.updated_at.isoformat()
        if display_agent.updated_at
        else None,
        version_count=len(group_agents),
        published_version_id=str(published_agent.id)
        if published_agent
        else None,
        published_version_short=published_version_short,
        draft_count=len(draft_agents),
        latest_draft_version_id=str(latest_draft_agent.id)
        if latest_draft_agent
        else None,
        latest_draft_version_short=latest_draft_version_short,
    )


@function.defn()
async def agents_read_all(
    function_input: AgentGetByWorkspaceInput,
) -> AgentListOutput:
    """Read ALL agents from database without grouping (for publish history)."""
    async for db in get_async_db():
        try:
            # Build query to get all agents
            query = select(Agent).where(
                Agent.workspace_id
                == uuid.UUID(function_input.workspace_id)
            )

            # Apply published_only filter if requested
            if function_input.published_only:
                query = query.where(Agent.status == "published")

            query = query.order_by(Agent.created_at.asc())

            result = await db.execute(query)
            agents = result.scalars().all()

            output_result = [
                AgentOutput(
                    id=str(agent.id),
                    workspace_id=str(agent.workspace_id),
                    name=agent.name,
                    description=agent.description,
                    instructions=agent.instructions,
                    status=agent.status,
                    parent_agent_id=str(agent.parent_agent_id)
                    if agent.parent_agent_id
                    else None,
                    model=agent.model or "gpt-5",
                    reasoning_effort=agent.reasoning_effort
                    or "medium",
                    created_at=agent.created_at.isoformat()
                    if agent.created_at
                    else None,
                    updated_at=agent.updated_at.isoformat()
                    if agent.updated_at
                    else None,
                )
                for agent in agents
            ]

            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_read_table(
    function_input: AgentGetByWorkspaceInput,
) -> AgentTableListOutput:
    """Read all agents from database for table display with enhanced versioning info."""
    async for db in get_async_db():
        try:
            # Build base query
            all_agents_query = (
                select(Agent)
                .options(selectinload(Agent.team))
                .where(
                    Agent.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
            )

            # Apply published_only filter if requested
            if function_input.published_only:
                all_agents_query = all_agents_query.where(
                    Agent.status == "published"
                )

            # Apply parent_only filter if requested
            if function_input.parent_only:
                all_agents_query = all_agents_query.where(
                    Agent.parent_agent_id.is_(None)
                )

            all_agents_query = all_agents_query.order_by(
                Agent.name.asc(), Agent.updated_at.desc()
            )

            result = await db.execute(all_agents_query)
            all_agents = result.scalars().all()

            # Group agents by parent_agent_id (or by id if no parent_agent_id)
            agent_groups = {}
            for agent in all_agents:
                group_key = (
                    str(agent.parent_agent_id)
                    if agent.parent_agent_id
                    else str(agent.id)
                )
                if group_key not in agent_groups:
                    agent_groups[group_key] = []
                agent_groups[group_key].append(agent)

            # For each group, create the enhanced output
            output_result = [
                _process_agent_group(group_agents)
                for group_agents in agent_groups.values()
                if group_agents
            ]

            return AgentTableListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


# Version-related utility functions removed - no longer needed with simplified versioning


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
                description=agent_data.description,
                instructions=agent_data.instructions,
                status=agent_data.status,
                parent_agent_id=parent_agent_id,
                # Agent type
                type=agent_data.type,
                # New GPT-5 model configuration fields
                model=agent_data.model,
                reasoning_effort=agent_data.reasoning_effort,
            )
            db.add(agent)
            await db.commit()
            await db.refresh(agent)

            # Note: MCP server relationships are now created through the proper
            # agent tools workflow which requires specific tool names.
            # Generic MCP server relationships without tool names are not supported
            # due to database constraints requiring tool_name for MCP tools.
            result = AgentOutput(
                id=str(agent.id),
                workspace_id=str(agent.workspace_id),
                name=agent.name,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id)
                if agent.parent_agent_id
                else None,
                # Agent type
                type=agent.type or "interactive",
                # New GPT-5 model configuration fields
                model=agent.model or "gpt-5",
                reasoning_effort=agent.reasoning_effort
                or "medium",
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

            # Filter out None values to avoid null constraint violations
            filtered_update_data = {
                key: value
                for key, value in update_data.items()
                if value is not None
            }

            # Handle parent_agent_id conversion
            if filtered_update_data.get("parent_agent_id"):
                try:
                    filtered_update_data["parent_agent_id"] = (
                        uuid.UUID(
                            filtered_update_data[
                                "parent_agent_id"
                            ]
                        )
                    )
                except ValueError as e:
                    raise NonRetryableError(
                        message="Invalid parent_agent_id format"
                    ) from e

            for key, value in filtered_update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)
            await db.commit()
            await db.refresh(agent)
            result = AgentOutput(
                id=str(agent.id),
                workspace_id=str(agent.workspace_id),
                name=agent.name,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id)
                if agent.parent_agent_id
                else None,
                # Agent type
                type=agent.type or "interactive",
                # New GPT-5 model configuration fields
                model=agent.model or "gpt-5",
                reasoning_effort=agent.reasoning_effort
                or "medium",
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
            agent_query = (
                select(Agent)
                .options(selectinload(Agent.team))
                .where(
                    Agent.id == uuid.UUID(function_input.agent_id)
                )
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
                team_name=agent.team.name if agent.team else None,
                name=agent.name,
                description=agent.description,
                instructions=agent.instructions,
                status=agent.status,
                parent_agent_id=str(agent.parent_agent_id)
                if agent.parent_agent_id
                else None,
                # Agent type
                type=agent.type or "interactive",
                # New GPT-5 model configuration fields
                model=agent.model or "gpt-5",
                reasoning_effort=agent.reasoning_effort
                or "medium",
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

            # Subquery to get the latest updated_at for each agent group with the specified status
            latest_versions_subquery = (
                select(
                    func.coalesce(
                        Agent.parent_agent_id, Agent.id
                    ).label("group_key"),
                    func.max(Agent.updated_at).label(
                        "latest_updated_at"
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
                        Agent.updated_at
                        == latest_versions_subquery.c.latest_updated_at,
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
                        description=agent.description,
                        instructions=agent.instructions,
                        status=agent.status,
                        parent_agent_id=str(agent.parent_agent_id)
                        if agent.parent_agent_id
                        else None,
                        # New GPT-5 model configuration fields
                        model=agent.model or "gpt-5",
                        reasoning_effort=agent.reasoning_effort
                        or "medium",
                        created_at=agent.created_at.isoformat()
                        if agent.created_at
                        else None,
                        updated_at=agent.updated_at.isoformat()
                        if agent.updated_at
                        else None,
                        version_count=version_count,
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
    """Get all versions of an agent by parent_agent_id or agent_id."""
    async for db in get_async_db():
        try:
            # Convert parent_agent_id string to UUID
            try:
                agent_id = uuid.UUID(
                    function_input.parent_agent_id
                )
            except ValueError as e:
                raise NonRetryableError(
                    message="Invalid agent_id format"
                ) from e

            # First, check if this agent is a child (has a parent_agent_id)
            check_query = select(Agent).where(
                Agent.id == agent_id
            )
            check_result = await db.execute(check_query)
            current_agent = check_result.scalar_one_or_none()

            if not current_agent:
                return AgentListOutput(agents=[])

            # Determine the root parent ID
            root_parent_id = (
                current_agent.parent_agent_id or agent_id
            )

            # Get all versions: the parent + all children with that parent_agent_id
            agents_query = (
                select(Agent)
                .where(
                    or_(
                        Agent.id == root_parent_id,
                        Agent.parent_agent_id == root_parent_id,
                    )
                )
                .order_by(Agent.updated_at.desc())
            )

            result = await db.execute(agents_query)
            agents = result.scalars().all()

            output_result = [
                AgentOutput(
                    id=str(agent.id),
                    workspace_id=str(agent.workspace_id),
                    name=agent.name,
                    description=agent.description,
                    instructions=agent.instructions,
                    status=agent.status,
                    parent_agent_id=str(agent.parent_agent_id)
                    if agent.parent_agent_id
                    else None,
                    # New GPT-5 model configuration fields
                    model=agent.model or "gpt-5",
                    reasoning_effort=agent.reasoning_effort
                    or "medium",
                    created_at=agent.created_at.isoformat()
                    if agent.created_at
                    else None,
                    updated_at=agent.updated_at.isoformat()
                    if agent.updated_at
                    else None,
                )
                for agent in agents
            ]
            return AgentListOutput(agents=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get agent versions: {e!s}"
            ) from e
    return None


class AgentUpdateStatusInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    status: str = Field(
        ..., pattern="^(published|draft|archived)$"
    )


class AgentUpdateStatusOutput(BaseModel):
    agent: AgentOutput
    archived_agent_id: str | None = (
        None  # For publish workflow compatibility
    )


@function.defn()
async def agents_update_status(
    function_input: AgentUpdateStatusInput,
) -> AgentUpdateStatusOutput:
    """Update agent status - handles publish, archive, and draft transitions."""
    async for db in get_async_db():
        try:
            # Convert agent_id string to UUID
            try:
                agent_id = uuid.UUID(function_input.agent_id)
            except ValueError as e:
                raise NonRetryableError(
                    message="Invalid agent_id format"
                ) from e

            # Get the agent to update
            agent_query = select(Agent).where(
                Agent.id == agent_id
            )
            result = await db.execute(agent_query)
            agent = result.scalar_one_or_none()

            if not agent:
                raise NonRetryableError(  # noqa: TRY301
                    message="Agent not found"
                )

            archived_agent_id = None

            # Handle publish workflow - archive any currently published version
            if function_input.status == "published":
                # Find the root agent ID (parent or self)
                root_agent_id = agent.parent_agent_id or agent.id

                # Find any currently published agent in this group
                published_query = select(Agent).where(
                    and_(
                        func.coalesce(
                            Agent.parent_agent_id, Agent.id
                        )
                        == root_agent_id,
                        Agent.status == "published",
                    )
                )
                published_result = await db.execute(
                    published_query
                )
                currently_published = (
                    published_result.scalar_one_or_none()
                )

                if (
                    currently_published
                    and currently_published.id != agent.id
                ):
                    currently_published.status = "archived"
                    currently_published.updated_at = datetime.now(
                        UTC
                    )
                    archived_agent_id = str(
                        currently_published.id
                    )

            # Update the target agent status
            agent.status = function_input.status
            agent.updated_at = datetime.now(UTC)

            await db.commit()
            await db.refresh(agent)

            return AgentUpdateStatusOutput(
                agent=AgentOutput(
                    id=str(agent.id),
                    workspace_id=str(agent.workspace_id),
                    team_id=str(agent.team_id)
                    if agent.team_id
                    else None,
                    team_name=agent.team.name
                    if agent.team
                    else None,
                    name=agent.name,
                    description=agent.description,
                    instructions=agent.instructions,
                    status=agent.status,
                    parent_agent_id=str(agent.parent_agent_id)
                    if agent.parent_agent_id
                    else None,
                    model=agent.model or "gpt-5",
                    reasoning_effort=agent.reasoning_effort
                    or "medium",
                    created_at=agent.created_at.isoformat()
                    if agent.created_at
                    else None,
                    updated_at=agent.updated_at.isoformat()
                    if agent.updated_at
                    else None,
                ),
                archived_agent_id=archived_agent_id,
            )

        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


# Legacy functions for backward compatibility
class AgentArchiveInput(BaseModel):
    agent_id: str = Field(..., min_length=1)


class AgentArchiveOutput(BaseModel):
    agent: AgentOutput


@function.defn()
async def agents_archive(
    function_input: AgentArchiveInput,
) -> AgentArchiveOutput:
    """Archive an agent - legacy wrapper for agents_update_status."""
    result = await agents_update_status(
        AgentUpdateStatusInput(
            agent_id=function_input.agent_id, status="archived"
        )
    )
    return AgentArchiveOutput(agent=result.agent)


class AgentResolveInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    agent_name: str = Field(
        ..., min_length=1, pattern=r"^[a-z0-9-_]+$"
    )


class AgentResolveOutput(BaseModel):
    agent_id: str


@function.defn()
async def agents_resolve_by_name(
    function_input: AgentResolveInput,
) -> AgentResolveOutput:
    """Resolve agent name to the latest published agent ID."""
    async for db in get_async_db():
        try:
            # Find the latest published agent by name
            # Subquery to get the latest updated_at for each agent group in the workspace
            latest_versions_subquery = (
                select(
                    func.coalesce(
                        Agent.parent_agent_id, Agent.id
                    ).label("group_key"),
                    func.max(Agent.updated_at).label(
                        "latest_updated_at"
                    ),
                )
                .where(
                    and_(
                        Agent.workspace_id
                        == uuid.UUID(function_input.workspace_id),
                        Agent.name == function_input.agent_name,
                    )
                )
                .group_by(
                    func.coalesce(Agent.parent_agent_id, Agent.id)
                )
                .subquery()
            )

            # Main query to get the latest published agent by name
            agent_query = (
                select(Agent)
                .join(
                    latest_versions_subquery,
                    and_(
                        func.coalesce(
                            Agent.parent_agent_id, Agent.id
                        )
                        == latest_versions_subquery.c.group_key,
                        Agent.updated_at
                        == latest_versions_subquery.c.latest_updated_at,
                    ),
                )
                .where(
                    and_(
                        Agent.workspace_id
                        == uuid.UUID(function_input.workspace_id),
                        Agent.name == function_input.agent_name,
                        Agent.status == "published",
                    )
                )
            )

            result = await db.execute(agent_query)
            agent = result.scalars().first()

            if not agent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent '{function_input.agent_name}' not found or not published in workspace"
                )

            return AgentResolveOutput(agent_id=str(agent.id))

        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to resolve agent by name: {e!s}"
            ) from e
    return None


@function.defn()
async def agents_clone(
    clone_data: AgentCloneInput,
) -> AgentSingleOutput:
    """Clone an agent with all its tools."""
    async for db in get_async_db():
        try:
            # Get the source agent
            source_agent_id = uuid.UUID(
                clone_data.source_agent_id
            )
            source_agent_query = select(Agent).where(
                Agent.id == source_agent_id
            )
            result = await db.execute(source_agent_query)
            source_agent = result.scalars().first()

            if not source_agent:
                _raise_source_agent_not_found_error(
                    clone_data.source_agent_id
                )

            # Create the new agent
            new_agent = Agent(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(clone_data.workspace_id),
                name=clone_data.name,
                description=clone_data.description
                or source_agent.description,
                instructions=clone_data.instructions
                or source_agent.instructions,
                status=clone_data.status,
                parent_agent_id=source_agent_id,  # Set the source as parent
                # Agent type inherited from source agent
                type=clone_data.type,
                model=clone_data.model,
                reasoning_effort=clone_data.reasoning_effort,
            )
            db.add(new_agent)
            await db.flush()  # Get the ID without committing

            # Get all tools from the source agent
            tools_query = select(AgentTool).where(
                AgentTool.agent_id == source_agent_id
            )
            tools_result = await db.execute(tools_query)
            source_tools = tools_result.scalars().all()

            # Clone each tool
            for source_tool in source_tools:
                new_tool = AgentTool(
                    id=uuid.uuid4(),
                    agent_id=new_agent.id,
                    tool_type=source_tool.tool_type,
                    mcp_server_id=source_tool.mcp_server_id,
                    tool_name=source_tool.tool_name,
                    custom_description=source_tool.custom_description,
                    require_approval=source_tool.require_approval,
                    config=source_tool.config,
                    allowed_tools=source_tool.allowed_tools,
                    execution_order=source_tool.execution_order,
                    enabled=source_tool.enabled,
                )
                db.add(new_tool)

            # Get all subagents from the source agent
            subagents_query = select(AgentSubagent).where(
                AgentSubagent.parent_agent_id == source_agent_id
            )
            subagents_result = await db.execute(subagents_query)
            source_subagents = subagents_result.scalars().all()

            # Clone each subagent relationship
            for source_subagent in source_subagents:
                new_subagent = AgentSubagent(
                    id=uuid.uuid4(),
                    parent_agent_id=new_agent.id,
                    subagent_id=source_subagent.subagent_id,
                    enabled=source_subagent.enabled,
                )
                db.add(new_subagent)

            await db.commit()
            await db.refresh(new_agent)

            # Return the new agent
            result = AgentOutput(
                id=str(new_agent.id),
                workspace_id=str(new_agent.workspace_id),
                name=new_agent.name,
                description=new_agent.description,
                instructions=new_agent.instructions,
                status=new_agent.status,
                parent_agent_id=str(new_agent.parent_agent_id)
                if new_agent.parent_agent_id
                else None,
                # Agent type
                type=new_agent.type or "interactive",
                model=new_agent.model or "gpt-5",
                reasoning_effort=new_agent.reasoning_effort
                or "medium",
                created_at=new_agent.created_at.isoformat()
                if new_agent.created_at
                else None,
                updated_at=new_agent.updated_at.isoformat()
                if new_agent.updated_at
                else None,
            )
            return AgentSingleOutput(agent=result)

        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to clone agent: {e!s}"
            ) from e
    return None
