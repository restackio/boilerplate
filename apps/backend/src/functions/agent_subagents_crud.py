"""CRUD operations for agent_subagents table."""

import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function, log
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import Agent, AgentSubagent


class AgentSubagentsReadInput(BaseModel):
    """Input model for reading agent subagents."""

    parent_agent_id: str = Field(..., min_length=1)


class AgentSubagentInfo(BaseModel):
    """Information about a subagent."""

    id: str
    name: str
    description: str | None
    type: str
    status: str
    model: str
    team_id: str | None


class AgentSubagentsReadOutput(BaseModel):
    """Output model for reading agent subagents."""

    subagents: list[AgentSubagentInfo]


@function.defn()
async def agent_subagents_read(
    function_input: AgentSubagentsReadInput,
) -> AgentSubagentsReadOutput:
    """Read all subagents configured for a parent agent."""
    async for db in get_async_db():
        try:
            parent_agent_id = uuid.UUID(
                function_input.parent_agent_id
            )

            # Query agent_subagents with joined subagent details
            stmt = (
                select(AgentSubagent)
                .where(
                    AgentSubagent.parent_agent_id
                    == parent_agent_id,
                    AgentSubagent.enabled == True,  # noqa: E712
                )
                .options(selectinload(AgentSubagent.subagent))
            )

            result = await db.execute(stmt)
            agent_subagents = result.scalars().all()

            subagents = []
            for agent_subagent in agent_subagents:
                subagent = agent_subagent.subagent
                subagents.append(
                    AgentSubagentInfo(
                        id=str(subagent.id),
                        name=subagent.name,
                        description=subagent.description,
                        type=subagent.type,
                        status=subagent.status,
                        model=subagent.model,
                        team_id=str(subagent.team_id)
                        if subagent.team_id
                        else None,
                    )
                )

            log.info(
                "agent_subagents_read",
                parent_agent_id=str(parent_agent_id),
                count=len(subagents),
            )

            return AgentSubagentsReadOutput(subagents=subagents)

        except Exception as e:
            log.error("agent_subagents_read_error", error=str(e))
            raise NonRetryableError(
                message=f"Failed to read subagents: {e!s}"
            ) from e
    return None


class AgentSubagentsCreateInput(BaseModel):
    """Input model for creating agent subagent relationship."""

    parent_agent_id: str = Field(..., min_length=1)
    subagent_id: str = Field(..., min_length=1)


class AgentSubagentsCreateOutput(BaseModel):
    """Output model for creating agent subagent relationship."""

    id: str
    parent_agent_id: str
    subagent_id: str
    enabled: bool


@function.defn()
async def agent_subagents_create(
    function_input: AgentSubagentsCreateInput,
) -> AgentSubagentsCreateOutput:
    """Create a new agent subagent relationship."""
    async for db in get_async_db():
        try:
            parent_agent_id = uuid.UUID(
                function_input.parent_agent_id
            )
            subagent_id = uuid.UUID(function_input.subagent_id)

            # Verify both agents exist
            parent_agent = await db.get(Agent, parent_agent_id)
            if not parent_agent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Parent agent with id {function_input.parent_agent_id} not found"
                )

            subagent = await db.get(Agent, subagent_id)
            if not subagent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Subagent with id {function_input.subagent_id} not found"
                )

            # Create the relationship
            agent_subagent = AgentSubagent(
                id=uuid.uuid4(),
                parent_agent_id=parent_agent_id,
                subagent_id=subagent_id,
                enabled=True,
            )

            db.add(agent_subagent)
            await db.commit()
            await db.refresh(agent_subagent)

            log.info(
                "agent_subagents_create",
                id=str(agent_subagent.id),
                parent_agent_id=str(parent_agent_id),
                subagent_id=str(subagent_id),
            )

            return AgentSubagentsCreateOutput(
                id=str(agent_subagent.id),
                parent_agent_id=str(parent_agent_id),
                subagent_id=str(subagent_id),
                enabled=agent_subagent.enabled,
            )

        except IntegrityError as e:
            await db.rollback()
            log.error(
                "agent_subagents_create_integrity_error",
                error=str(e),
            )
            raise NonRetryableError(
                message="Subagent relationship already exists"
            ) from e
        except NonRetryableError:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(
                "agent_subagents_create_error", error=str(e)
            )
            raise NonRetryableError(
                message=f"Failed to create subagent relationship: {e!s}"
            ) from e
    return None


class AgentSubagentsDeleteInput(BaseModel):
    """Input model for deleting agent subagent relationship."""

    parent_agent_id: str = Field(..., min_length=1)
    subagent_id: str = Field(..., min_length=1)


class AgentSubagentsDeleteOutput(BaseModel):
    """Output model for deleting agent subagent relationship."""

    success: bool


@function.defn()
async def agent_subagents_delete(
    function_input: AgentSubagentsDeleteInput,
) -> AgentSubagentsDeleteOutput:
    """Delete an agent subagent relationship."""
    async for db in get_async_db():
        try:
            parent_agent_id = uuid.UUID(
                function_input.parent_agent_id
            )
            subagent_id = uuid.UUID(function_input.subagent_id)

            # Find and delete the relationship
            stmt = select(AgentSubagent).where(
                AgentSubagent.parent_agent_id == parent_agent_id,
                AgentSubagent.subagent_id == subagent_id,
            )

            result = await db.execute(stmt)
            agent_subagent = result.scalar_one_or_none()

            if not agent_subagent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Subagent relationship not found for parent {function_input.parent_agent_id} and subagent {function_input.subagent_id}"
                )

            await db.delete(agent_subagent)
            await db.commit()

            log.info(
                "agent_subagents_delete",
                parent_agent_id=str(parent_agent_id),
                subagent_id=str(subagent_id),
            )

            return AgentSubagentsDeleteOutput(success=True)

        except NonRetryableError:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(
                "agent_subagents_delete_error", error=str(e)
            )
            raise NonRetryableError(
                message=f"Failed to delete subagent relationship: {e!s}"
            ) from e
    return None


class AgentSubagentsToggleInput(BaseModel):
    """Input model for toggling agent subagent relationship."""

    parent_agent_id: str = Field(..., min_length=1)
    subagent_id: str = Field(..., min_length=1)
    enabled: bool


class AgentSubagentsToggleOutput(BaseModel):
    """Output model for toggling agent subagent relationship."""

    success: bool
    enabled: bool


@function.defn()
async def agent_subagents_toggle(
    function_input: AgentSubagentsToggleInput,
) -> AgentSubagentsToggleOutput:
    """Toggle enabled status of an agent subagent relationship."""
    async for db in get_async_db():
        try:
            parent_agent_id = uuid.UUID(
                function_input.parent_agent_id
            )
            subagent_id = uuid.UUID(function_input.subagent_id)

            # Find the relationship
            stmt = select(AgentSubagent).where(
                AgentSubagent.parent_agent_id == parent_agent_id,
                AgentSubagent.subagent_id == subagent_id,
            )

            result = await db.execute(stmt)
            agent_subagent = result.scalar_one_or_none()

            if not agent_subagent:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Subagent relationship not found for parent {function_input.parent_agent_id} and subagent {function_input.subagent_id}"
                )

            # Update enabled status
            agent_subagent.enabled = function_input.enabled
            await db.commit()

            log.info(
                "agent_subagents_toggle",
                parent_agent_id=str(parent_agent_id),
                subagent_id=str(subagent_id),
                enabled=function_input.enabled,
            )

            return AgentSubagentsToggleOutput(
                success=True,
                enabled=function_input.enabled,
            )

        except NonRetryableError:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(
                "agent_subagents_toggle_error", error=str(e)
            )
            raise NonRetryableError(
                message=f"Failed to toggle subagent relationship: {e!s}"
            ) from e
    return None


class AgentSubagentsGetAvailableInput(BaseModel):
    """Input model for getting available subagents."""

    workspace_id: str = Field(..., min_length=1)
    parent_agent_id: str | None = None


class AvailableAgentInfo(BaseModel):
    """Information about an available subagent."""

    id: str
    name: str
    description: str | None
    type: str
    status: str
    model: str
    team_id: str | None
    is_configured: bool


class AgentSubagentsGetAvailableOutput(BaseModel):
    """Output model for getting available agents."""

    agents: list[AvailableAgentInfo]


@function.defn()
async def agent_subagents_get_available(
    function_input: AgentSubagentsGetAvailableInput,
) -> AgentSubagentsGetAvailableOutput:
    """Get all available agents in workspace that can be used as subagents."""
    async for db in get_async_db():
        try:
            workspace_id = uuid.UUID(function_input.workspace_id)
            parent_agent_id = (
                uuid.UUID(function_input.parent_agent_id)
                if function_input.parent_agent_id
                else None
            )

            # Get all published agents in workspace
            stmt = select(Agent).where(
                Agent.workspace_id == workspace_id,
                Agent.status == "published",
            )

            # Exclude parent agent if specified
            if parent_agent_id:
                stmt = stmt.where(Agent.id != parent_agent_id)

            result = await db.execute(stmt)
            agents = result.scalars().all()

            # Get configured subagent IDs if parent specified
            configured_ids = set()
            if parent_agent_id:
                subagents_stmt = select(
                    AgentSubagent.subagent_id
                ).where(
                    AgentSubagent.parent_agent_id
                    == parent_agent_id
                )
                subagents_result = await db.execute(
                    subagents_stmt
                )
                configured_ids = {
                    str(row[0])
                    for row in subagents_result.fetchall()
                }

            # Build response
            available_agents = [
                AvailableAgentInfo(
                    id=str(agent.id),
                    name=agent.name,
                    description=agent.description,
                    type=agent.type,
                    status=agent.status,
                    model=agent.model,
                    team_id=str(agent.team_id)
                    if agent.team_id
                    else None,
                    is_configured=str(agent.id) in configured_ids,
                )
                for agent in agents
            ]

            log.info(
                "agent_subagents_get_available",
                workspace_id=str(workspace_id),
                count=len(available_agents),
            )

            return AgentSubagentsGetAvailableOutput(
                agents=available_agents
            )

        except Exception as e:
            log.error(
                "agent_subagents_get_available_error",
                error=str(e),
            )
            raise NonRetryableError(
                message=f"Failed to get available agents: {e!s}"
            ) from e
    return None
