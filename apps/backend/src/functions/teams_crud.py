import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import Team


# Pydantic models for input validation
class TeamCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    icon: str | None = Field(None, max_length=50)


class TeamUpdateInput(BaseModel):
    team_id: str = Field(..., min_length=1)
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    icon: str | None = Field(None, max_length=50)


class TeamIdInput(BaseModel):
    team_id: str = Field(..., min_length=1)


class TeamGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


# Pydantic models for output serialization
class TeamOutput(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str | None
    icon: str | None
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class TeamListOutput(BaseModel):
    teams: list[TeamOutput]


class TeamSingleOutput(BaseModel):
    team: TeamOutput


class TeamDeleteOutput(BaseModel):
    success: bool


@function.defn()
async def teams_read(
    function_input: TeamGetByWorkspaceInput,
) -> TeamListOutput:
    """Read all teams from database for a specific workspace."""
    async for db in get_async_db():
        try:
            teams_query = (
                select(Team)
                .where(
                    Team.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .order_by(Team.name.asc())
            )
            result = await db.execute(teams_query)
            teams = result.scalars().all()

            output_result = [
                TeamOutput(
                    id=str(team.id),
                    workspace_id=str(team.workspace_id),
                    name=team.name,
                    description=team.description,
                    icon=team.icon,
                    created_at=team.created_at.isoformat()
                    if team.created_at
                    else None,
                    updated_at=team.updated_at.isoformat()
                    if team.updated_at
                    else None,
                )
                for team in teams
            ]

            return TeamListOutput(teams=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


@function.defn()
async def teams_create(
    team_data: TeamCreateInput,
) -> TeamSingleOutput:
    """Create a new team."""
    async for db in get_async_db():
        try:
            team = Team(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(team_data.workspace_id),
                name=team_data.name,
                description=team_data.description,
                icon=team_data.icon or "Building",
            )
            db.add(team)
            await db.commit()
            await db.refresh(team)

            result = TeamOutput(
                id=str(team.id),
                workspace_id=str(team.workspace_id),
                name=team.name,
                description=team.description,
                icon=team.icon,
                created_at=team.created_at.isoformat()
                if team.created_at
                else None,
                updated_at=team.updated_at.isoformat()
                if team.updated_at
                else None,
            )

            return TeamSingleOutput(team=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create team: {e!s}"
            ) from e
    return None


@function.defn()
async def teams_update(
    function_input: TeamUpdateInput,
) -> TeamSingleOutput:
    """Update an existing team."""
    async for db in get_async_db():
        try:
            team_query = select(Team).where(
                Team.id == uuid.UUID(function_input.team_id)
            )
            result = await db.execute(team_query)
            team = result.scalar_one_or_none()

            if not team:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Team with id {function_input.team_id} not found"
                )
            update_data = function_input.dict(
                exclude_unset=True, exclude={"team_id"}
            )
            for key, value in update_data.items():
                if hasattr(team, key):
                    setattr(team, key, value)
            await db.commit()
            await db.refresh(team)

            result = TeamOutput(
                id=str(team.id),
                workspace_id=str(team.workspace_id),
                name=team.name,
                description=team.description,
                icon=team.icon,
                created_at=team.created_at.isoformat()
                if team.created_at
                else None,
                updated_at=team.updated_at.isoformat()
                if team.updated_at
                else None,
            )

            return TeamSingleOutput(team=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update team: {e!s}"
            ) from e
    return None


@function.defn()
async def teams_delete(
    function_input: TeamIdInput,
) -> TeamDeleteOutput:
    """Delete a team."""
    async for db in get_async_db():
        try:
            team_query = select(Team).where(
                Team.id == uuid.UUID(function_input.team_id)
            )
            result = await db.execute(team_query)
            team = result.scalar_one_or_none()

            if not team:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Team with id {function_input.team_id} not found"
                )
            await db.delete(team)
            await db.commit()

            return TeamDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete team: {e!s}"
            ) from e
    return None


@function.defn()
async def teams_get_by_id(
    function_input: TeamIdInput,
) -> TeamSingleOutput:
    """Get team by ID."""
    async for db in get_async_db():
        try:
            team_query = select(Team).where(
                Team.id == uuid.UUID(function_input.team_id)
            )
            result = await db.execute(team_query)
            team = result.scalar_one_or_none()

            if not team:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Team with id {function_input.team_id} not found"
                )
            output_result = TeamOutput(
                id=str(team.id),
                workspace_id=str(team.workspace_id),
                name=team.name,
                description=team.description,
                icon=team.icon,
                created_at=team.created_at.isoformat()
                if team.created_at
                else None,
                updated_at=team.updated_at.isoformat()
                if team.updated_at
                else None,
            )

            return TeamSingleOutput(team=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get team: {e!s}"
            ) from e
    return None
