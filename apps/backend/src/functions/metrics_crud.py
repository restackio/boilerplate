"""Metrics CRUD Operations.

Functions to create, read, update, and delete metric definitions and agent-metric assignments.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel
from restack_ai.function import function, log
from sqlalchemy import select

from src.database.connection import (
    get_async_db,
)
from src.database.models import (
    MetricDefinition,
)

# ===================================
# Pydantic Models
# ===================================


class CreateMetricDefinitionInput(BaseModel):
    workspace_id: str
    name: str
    category: str
    metric_type: str
    config: dict[str, Any]
    description: str | None = None
    is_active: bool = True
    is_default: bool = False
    created_by: str | None = None


class ListMetricDefinitionsInput(BaseModel):
    workspace_id: str
    category: str | None = None
    metric_type: str | None = None
    is_active: bool = True


class UpdateMetricDefinitionInput(BaseModel):
    metric_id: str
    name: str | None = None
    description: str | None = None
    category: str | None = None
    config: dict[str, Any] | None = None
    is_active: bool | None = None


class DeleteMetricDefinitionInput(BaseModel):
    metric_id: str


# ===================================
# Metric Definition CRUD
# ===================================


@function.defn()
async def create_metric_definition(
    input_data: CreateMetricDefinitionInput,
) -> dict[str, Any]:
    """Create a new metric definition.

    Args:
        input_data: Input containing workspace_id, name, category, metric_type, config, etc.

    Returns:
        Created metric definition as dict (returns pass/fail boolean)
    """
    log.info(
        f"Creating metric definition: {input_data.name} in workspace {input_data.workspace_id}"
    )

    async for session in get_async_db():
        # Check if metric already exists (idempotency)
        stmt = select(MetricDefinition).where(
            MetricDefinition.workspace_id == UUID(input_data.workspace_id),
            MetricDefinition.name == input_data.name,
        )
        result = await session.execute(stmt)
        existing_metric = result.scalar_one_or_none()

        if existing_metric:
            log.info(
                f"Metric {input_data.name} already exists in workspace {input_data.workspace_id}, returning existing metric"
            )
            return _metric_to_dict(existing_metric)

        # Create new metric
        metric = MetricDefinition(
            id=uuid4(),  # Generate UUID in Python
            workspace_id=UUID(input_data.workspace_id),
            name=input_data.name,
            description=input_data.description,
            category=input_data.category,
            metric_type=input_data.metric_type,
            config=input_data.config,
            is_active=input_data.is_active,
            is_default=input_data.is_default,
            created_by=UUID(input_data.created_by)
            if input_data.created_by
            else None,
        )

        session.add(metric)
        await session.commit()
        await session.refresh(metric)

        return _metric_to_dict(metric)
    return None


@function.defn()
async def get_metric_definition_by_id(
    input_data: dict[str, Any],
) -> dict[str, Any] | None:
    """Get a single metric definition by ID.

    Args:
        input_data: Dict with metric_id and workspace_id

    Returns:
        Metric definition dict or None if not found
    """
    metric_id = input_data["metric_id"]
    workspace_id = input_data["workspace_id"]

    log.info(f"Fetching metric definition: {metric_id}")

    async for session in get_async_db():
        stmt = select(MetricDefinition).where(
            MetricDefinition.id == UUID(metric_id),
            MetricDefinition.workspace_id == UUID(workspace_id),
        )

        result = await session.execute(stmt)
        metric = result.scalar_one_or_none()

        if not metric:
            log.warning(f"Metric {metric_id} not found")
            return None

        return {"metric": _metric_to_dict(metric)}
    return None


@function.defn()
async def list_metric_definitions(
    input_data: ListMetricDefinitionsInput,
) -> list[dict[str, Any]]:
    """List all metric definitions for a workspace.

    Args:
        input_data: Input containing workspace_id and optional filters

    Returns:
        List of metric definitions
    """
    log.info(
        f"Listing metrics for workspace {input_data.workspace_id}"
    )

    async for session in get_async_db():
        stmt = select(MetricDefinition).where(
            MetricDefinition.workspace_id
            == UUID(input_data.workspace_id)
        )

        if input_data.category:
            stmt = stmt.where(
                MetricDefinition.category == input_data.category
            )
        if input_data.metric_type:
            stmt = stmt.where(
                MetricDefinition.metric_type
                == input_data.metric_type
            )
        if input_data.is_active:
            stmt = stmt.where(MetricDefinition.is_active is True)

        stmt = stmt.order_by(MetricDefinition.created_at.desc())

        result = await session.execute(stmt)
        metrics = result.scalars().all()
        return [_metric_to_dict(m) for m in metrics]
    return None


@function.defn()
async def update_metric_definition(
    input_data: UpdateMetricDefinitionInput,
) -> dict[str, Any] | None:
    """Update a metric definition."""
    log.info(
        f"Updating metric definition: {input_data.metric_id}"
    )

    async for session in get_async_db():
        stmt = select(MetricDefinition).where(
            MetricDefinition.id == UUID(input_data.metric_id)
        )
        result = await session.execute(stmt)
        metric = result.scalar_one_or_none()

        if not metric:
            return None

        # Update fields if provided
        if input_data.name is not None:
            metric.name = input_data.name
        if input_data.description is not None:
            metric.description = input_data.description
        if input_data.category is not None:
            metric.category = input_data.category
        if input_data.config is not None:
            metric.config = input_data.config
        if input_data.is_active is not None:
            metric.is_active = input_data.is_active

        metric.updated_at = datetime.now(tz=UTC).replace(
            tzinfo=None
        )

        await session.commit()
        await session.refresh(metric)

        return _metric_to_dict(metric)
    return None


@function.defn()
async def delete_metric_definition(
    input_data: DeleteMetricDefinitionInput,
) -> bool:
    """Delete a metric definition (soft delete by marking inactive)."""
    log.info(
        f"Deleting metric definition: {input_data.metric_id}"
    )

    async for session in get_async_db():
        stmt = select(MetricDefinition).where(
            MetricDefinition.id == UUID(input_data.metric_id)
        )
        result = await session.execute(stmt)
        metric = result.scalar_one_or_none()

        if not metric:
            return False

        # Soft delete
        metric.is_active = False
        metric.updated_at = datetime.now(tz=UTC).replace(
            tzinfo=None
        )
        await session.commit()

        return True
    return None


# ===================================
# Helper Functions
# ===================================


def _metric_to_dict(metric: MetricDefinition) -> dict[str, Any]:
    """Convert MetricDefinition to dict."""
    return {
        "id": str(metric.id),
        "workspace_id": str(metric.workspace_id),
        "name": metric.name,
        "description": metric.description,
        "category": metric.category,
        "metric_type": metric.metric_type,
        "config": metric.config,
        "is_active": metric.is_active,
        "is_default": metric.is_default,
        "created_by": str(metric.created_by)
        if metric.created_by
        else None,
        "created_at": metric.created_at.isoformat()
        if metric.created_at
        else None,
        "updated_at": metric.updated_at.isoformat()
        if metric.updated_at
        else None,
    }
