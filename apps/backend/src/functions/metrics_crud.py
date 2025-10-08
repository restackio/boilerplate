"""
Metrics CRUD Operations
Functions to create, read, update, and delete metric definitions and agent-metric assignments
"""
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from restack_ai.function import function, log
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.database.connection import get_session_context_manager
from src.database.models import Agent, AgentMetric, MetricDefinition


# ===================================
# Metric Definition CRUD
# ===================================


@function.defn()
async def create_metric_definition(
    workspace_id: str,
    name: str,
    category: str,
    metric_type: str,
    config: dict[str, Any],
    description: str | None = None,
    output_type: str = "score",
    min_value: float | None = None,
    max_value: float | None = None,
    is_default: bool = False,
    created_by: str | None = None,
) -> dict[str, Any]:
    """
    Create a new metric definition
    
    Args:
        workspace_id: Workspace UUID
        name: Metric name
        category: Category (quality, cost, performance, custom)
        metric_type: Type (llm_judge, python_code, formula)
        config: Type-specific configuration (judge_prompt, code, formula, etc.)
        description: Optional description
        output_type: Output type (score, pass_fail, numeric, boolean)
        min_value: Minimum value for scores
        max_value: Maximum value for scores
        is_default: Suggest for new agents
        created_by: User who created it
    
    Returns:
        Created metric definition as dict
    """
    log.info(f"Creating metric definition: {name} in workspace {workspace_id}")
    
    with get_session_context_manager() as session:
        metric = MetricDefinition(
            workspace_id=UUID(workspace_id),
            name=name,
            description=description,
            category=category,
            metric_type=metric_type,
            config=config,
            output_type=output_type,
            min_value=min_value,
            max_value=max_value,
            is_default=is_default,
            created_by=UUID(created_by) if created_by else None,
        )
        
        session.add(metric)
        session.commit()
        session.refresh(metric)
        
        return _metric_to_dict(metric)


@function.defn()
async def get_metric_definition(metric_id: str) -> dict[str, Any] | None:
    """Get a metric definition by ID"""
    log.info(f"Getting metric definition: {metric_id}")
    
    with get_session_context_manager() as session:
        stmt = select(MetricDefinition).where(MetricDefinition.id == UUID(metric_id))
        metric = session.execute(stmt).scalar_one_or_none()
        
        if not metric:
            return None
        
        return _metric_to_dict(metric)


@function.defn()
async def list_metric_definitions(
    workspace_id: str,
    category: str | None = None,
    metric_type: str | None = None,
    is_active: bool = True,
) -> list[dict[str, Any]]:
    """
    List all metric definitions for a workspace
    
    Args:
        workspace_id: Workspace UUID
        category: Optional filter by category
        metric_type: Optional filter by type
        is_active: Filter active metrics only
    
    Returns:
        List of metric definitions
    """
    log.info(f"Listing metrics for workspace {workspace_id}")
    
    with get_session_context_manager() as session:
        stmt = select(MetricDefinition).where(
            MetricDefinition.workspace_id == UUID(workspace_id)
        )
        
        if category:
            stmt = stmt.where(MetricDefinition.category == category)
        if metric_type:
            stmt = stmt.where(MetricDefinition.metric_type == metric_type)
        if is_active:
            stmt = stmt.where(MetricDefinition.is_active == True)
        
        stmt = stmt.order_by(MetricDefinition.created_at.desc())
        
        metrics = session.execute(stmt).scalars().all()
        return [_metric_to_dict(m) for m in metrics]


@function.defn()
async def update_metric_definition(
    metric_id: str,
    **kwargs: Any,
) -> dict[str, Any] | None:
    """
    Update a metric definition
    
    Updatable fields: name, description, category, config, output_type, 
                      min_value, max_value, is_active, is_default
    """
    log.info(f"Updating metric definition: {metric_id}")
    
    with get_session_context_manager() as session:
        stmt = select(MetricDefinition).where(MetricDefinition.id == UUID(metric_id))
        metric = session.execute(stmt).scalar_one_or_none()
        
        if not metric:
            return None
        
        # Update allowed fields
        updatable_fields = {
            "name", "description", "category", "config", "output_type",
            "min_value", "max_value", "is_active", "is_default"
        }
        
        for key, value in kwargs.items():
            if key in updatable_fields and value is not None:
                setattr(metric, key, value)
        
        metric.updated_at = datetime.now(tz=UTC).replace(tzinfo=None)
        
        session.commit()
        session.refresh(metric)
        
        return _metric_to_dict(metric)


@function.defn()
async def delete_metric_definition(metric_id: str) -> bool:
    """Delete a metric definition (soft delete by marking inactive)"""
    log.info(f"Deleting metric definition: {metric_id}")
    
    with get_session_context_manager() as session:
        stmt = select(MetricDefinition).where(MetricDefinition.id == UUID(metric_id))
        metric = session.execute(stmt).scalar_one_or_none()
        
        if not metric:
            return False
        
        # Soft delete
        metric.is_active = False
        session.commit()
        
        return True


# ===================================
# Agent Metric Assignment CRUD
# ===================================


@function.defn()
async def assign_metric_to_agent(
    agent_id: str,
    metric_definition_id: str,
    enabled: bool = True,
    run_on_completion: bool = True,
    run_on_playground: bool = True,
    alert_threshold: float | None = None,
    alert_condition: str | None = None,
) -> dict[str, Any]:
    """
    Assign a metric to an agent
    
    Args:
        agent_id: Agent UUID
        metric_definition_id: Metric definition UUID
        enabled: Enable this metric
        run_on_completion: Auto-run when task completes
        run_on_playground: Show in playground
        alert_threshold: Optional threshold for alerts
        alert_condition: Condition (below, above, equals)
    
    Returns:
        Created agent metric assignment as dict
    """
    log.info(f"Assigning metric {metric_definition_id} to agent {agent_id}")
    
    with get_session_context_manager() as session:
        # Check if already exists
        stmt = select(AgentMetric).where(
            AgentMetric.agent_id == UUID(agent_id),
            AgentMetric.metric_definition_id == UUID(metric_definition_id),
        )
        existing = session.execute(stmt).scalar_one_or_none()
        
        if existing:
            log.info("Metric already assigned, updating configuration")
            existing.enabled = enabled
            existing.run_on_completion = run_on_completion
            existing.run_on_playground = run_on_playground
            existing.alert_threshold = alert_threshold
            existing.alert_condition = alert_condition
            existing.updated_at = datetime.now(tz=UTC).replace(tzinfo=None)
            
            session.commit()
            session.refresh(existing)
            return _agent_metric_to_dict(existing)
        
        # Create new assignment
        agent_metric = AgentMetric(
            agent_id=UUID(agent_id),
            metric_definition_id=UUID(metric_definition_id),
            enabled=enabled,
            run_on_completion=run_on_completion,
            run_on_playground=run_on_playground,
            alert_threshold=alert_threshold,
            alert_condition=alert_condition,
        )
        
        session.add(agent_metric)
        session.commit()
        session.refresh(agent_metric)
        
        return _agent_metric_to_dict(agent_metric)


@function.defn()
async def get_agent_metrics(
    agent_id: str,
    enabled_only: bool = True,
) -> list[dict[str, Any]]:
    """
    Get all metrics assigned to an agent
    
    Args:
        agent_id: Agent UUID
        enabled_only: Return only enabled metrics
    
    Returns:
        List of agent metric assignments with metric definitions
    """
    log.info(f"Getting metrics for agent {agent_id}")
    
    with get_session_context_manager() as session:
        stmt = (
            select(AgentMetric)
            .options(joinedload(AgentMetric.metric_definition))
            .where(AgentMetric.agent_id == UUID(agent_id))
        )
        
        if enabled_only:
            stmt = stmt.where(AgentMetric.enabled == True)
        
        stmt = stmt.order_by(AgentMetric.created_at.desc())
        
        agent_metrics = session.execute(stmt).scalars().all()
        return [_agent_metric_to_dict(am, include_definition=True) for am in agent_metrics]


@function.defn()
async def get_playground_metrics(agent_id: str) -> list[dict[str, Any]]:
    """Get metrics that should be displayed in playground for an agent"""
    log.info(f"Getting playground metrics for agent {agent_id}")
    
    with get_session_context_manager() as session:
        stmt = (
            select(AgentMetric)
            .options(joinedload(AgentMetric.metric_definition))
            .where(
                AgentMetric.agent_id == UUID(agent_id),
                AgentMetric.enabled == True,
                AgentMetric.run_on_playground == True,
            )
            .join(MetricDefinition)
            .where(MetricDefinition.is_active == True)
        )
        
        agent_metrics = session.execute(stmt).scalars().all()
        return [_agent_metric_to_dict(am, include_definition=True) for am in agent_metrics]


@function.defn()
async def unassign_metric_from_agent(
    agent_id: str,
    metric_definition_id: str,
) -> bool:
    """Unassign a metric from an agent"""
    log.info(f"Unassigning metric {metric_definition_id} from agent {agent_id}")
    
    with get_session_context_manager() as session:
        stmt = select(AgentMetric).where(
            AgentMetric.agent_id == UUID(agent_id),
            AgentMetric.metric_definition_id == UUID(metric_definition_id),
        )
        agent_metric = session.execute(stmt).scalar_one_or_none()
        
        if not agent_metric:
            return False
        
        session.delete(agent_metric)
        session.commit()
        
        return True


# ===================================
# Helper Functions
# ===================================


def _metric_to_dict(metric: MetricDefinition) -> dict[str, Any]:
    """Convert MetricDefinition to dict"""
    return {
        "id": str(metric.id),
        "workspace_id": str(metric.workspace_id),
        "name": metric.name,
        "description": metric.description,
        "category": metric.category,
        "metric_type": metric.metric_type,
        "config": metric.config,
        "output_type": metric.output_type,
        "min_value": metric.min_value,
        "max_value": metric.max_value,
        "is_active": metric.is_active,
        "is_default": metric.is_default,
        "created_by": str(metric.created_by) if metric.created_by else None,
        "created_at": metric.created_at.isoformat() if metric.created_at else None,
        "updated_at": metric.updated_at.isoformat() if metric.updated_at else None,
    }


def _agent_metric_to_dict(
    agent_metric: AgentMetric,
    include_definition: bool = False,
) -> dict[str, Any]:
    """Convert AgentMetric to dict"""
    result = {
        "id": str(agent_metric.id),
        "agent_id": str(agent_metric.agent_id),
        "metric_definition_id": str(agent_metric.metric_definition_id),
        "enabled": agent_metric.enabled,
        "run_on_completion": agent_metric.run_on_completion,
        "run_on_playground": agent_metric.run_on_playground,
        "alert_threshold": agent_metric.alert_threshold,
        "alert_condition": agent_metric.alert_condition,
        "created_at": agent_metric.created_at.isoformat() if agent_metric.created_at else None,
        "updated_at": agent_metric.updated_at.isoformat() if agent_metric.updated_at else None,
    }
    
    if include_definition and agent_metric.metric_definition:
        result["metric_definition"] = _metric_to_dict(agent_metric.metric_definition)
    
    return result
