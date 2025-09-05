import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import UserWorkspace, Workspace


# Pydantic models for input validation
class WorkspaceCreateInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class WorkspaceUpdateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str | None = Field(None, min_length=1, max_length=255)


class WorkspaceReadInput(BaseModel):
    user_id: str = Field(
        ...,
        description="User ID to filter workspaces by permissions",
    )


class WorkspaceIdInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


class WorkspaceDeleteOutput(BaseModel):
    success: bool


class WorkspaceOutput(BaseModel):
    id: str
    name: str
    created_at: str | None = None
    updated_at: str | None = None


class WorkspaceSingleOutput(BaseModel):
    workspace: WorkspaceOutput


class WorkspaceListOutput(BaseModel):
    workspaces: list[WorkspaceOutput]


@function.defn()
async def workspaces_read(
    function_input: WorkspaceReadInput,
) -> WorkspaceListOutput:
    """Read workspaces for a specific user based on their permissions."""
    async for db in get_async_db():
        # Filter workspaces by user permissions
        user_workspaces_query = select(UserWorkspace).where(
            UserWorkspace.user_id
            == uuid.UUID(function_input.user_id)
        )
        user_workspaces_result = await db.execute(
            user_workspaces_query
        )
        user_workspaces = user_workspaces_result.scalars().all()

        workspace_ids = [
            uw.workspace_id for uw in user_workspaces
        ]
        workspaces_query = select(Workspace).where(
            Workspace.id.in_(workspace_ids)
        )
        workspaces_result = await db.execute(workspaces_query)
        workspaces = workspaces_result.scalars().all()

        output_result = [
            WorkspaceOutput(
                id=str(workspace.id),
                name=workspace.name,
                created_at=workspace.created_at.isoformat()
                if workspace.created_at
                else None,
                updated_at=workspace.updated_at.isoformat()
                if workspace.updated_at
                else None,
            )
            for workspace in workspaces
        ]
        return WorkspaceListOutput(workspaces=output_result)
    return None


@function.defn()
async def workspaces_create(
    workspace_data: WorkspaceCreateInput,
) -> WorkspaceSingleOutput:
    """Create a new workspace."""
    async for db in get_async_db():
        workspace_id = uuid.uuid4()
        workspace = Workspace(
            id=workspace_id,
            name=workspace_data.name,
        )

        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)

        result = WorkspaceOutput(
            id=str(workspace.id),
            name=workspace.name,
            created_at=workspace.created_at.isoformat()
            if workspace.created_at
            else None,
            updated_at=workspace.updated_at.isoformat()
            if workspace.updated_at
            else None,
        )

        return WorkspaceSingleOutput(workspace=result)
    return None


@function.defn()
async def workspaces_update(
    function_input: WorkspaceUpdateInput,
) -> WorkspaceSingleOutput:
    """Update an existing workspace."""
    async for db in get_async_db():
        workspace_query = select(Workspace).where(
            Workspace.id == uuid.UUID(function_input.workspace_id)
        )
        result = await db.execute(workspace_query)
        workspace = result.scalar_one_or_none()

        if not workspace:
            raise NonRetryableError(
                message=f"Workspace with id {function_input.workspace_id} not found"
            )
        # Update fields (only non-None values)
        update_data = function_input.dict(
            exclude_unset=True, exclude={"workspace_id"}
        )
        for key, value in update_data.items():
            if hasattr(workspace, key):
                setattr(workspace, key, value)
        await db.commit()
        await db.refresh(workspace)

        result = WorkspaceOutput(
            id=str(workspace.id),
            name=workspace.name,
            created_at=workspace.created_at.isoformat()
            if workspace.created_at
            else None,
            updated_at=workspace.updated_at.isoformat()
            if workspace.updated_at
            else None,
        )

        return WorkspaceSingleOutput(workspace=result)
    return None


@function.defn()
async def workspaces_delete(
    function_input: WorkspaceIdInput,
) -> WorkspaceDeleteOutput:
    """Delete a workspace."""
    async for db in get_async_db():
        workspace_query = select(Workspace).where(
            Workspace.id == uuid.UUID(function_input.workspace_id)
        )
        result = await db.execute(workspace_query)
        workspace = result.scalar_one_or_none()

        if not workspace:
            raise NonRetryableError(
                message=f"Workspace with id {function_input.workspace_id} not found"
            )
        await db.delete(workspace)
        await db.commit()

        return WorkspaceDeleteOutput(success=True)
    return None


@function.defn()
async def workspaces_get_by_id(
    function_input: WorkspaceIdInput,
) -> WorkspaceSingleOutput | None:
    """Get a specific workspace by ID."""
    async for db in get_async_db():
        workspace_query = select(Workspace).where(
            Workspace.id == uuid.UUID(function_input.workspace_id)
        )
        result = await db.execute(workspace_query)
        workspace = result.scalar_one_or_none()

        if not workspace:
            return None

        output_result = WorkspaceOutput(
            id=str(workspace.id),
            name=workspace.name,
            created_at=workspace.created_at.isoformat()
            if workspace.created_at
            else None,
            updated_at=workspace.updated_at.isoformat()
            if workspace.updated_at
            else None,
        )

        return WorkspaceSingleOutput(workspace=output_result)
    return None
