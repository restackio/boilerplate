import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import get_db
from ..database.models import Team

# Pydantic models for input validation
class TeamCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)

class TeamUpdateInput(BaseModel):
    team_id: str = Field(..., min_length=1)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)

class TeamIdInput(BaseModel):
    team_id: str = Field(..., min_length=1)

class TeamGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)

# Pydantic models for output serialization
class TeamOutput(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    icon: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class TeamListOutput(BaseModel):
    teams: List[TeamOutput]

class TeamSingleOutput(BaseModel):
    team: TeamOutput

class TeamDeleteOutput(BaseModel):
    success: bool

@function.defn()
async def teams_read(input: TeamGetByWorkspaceInput) -> TeamListOutput:
    """Read all teams from database for a specific workspace"""
    db = next(get_db())
    try:
        teams = db.query(Team).filter(Team.workspace_id == uuid.UUID(input.workspace_id)).all()
        
        result = []
        for team in teams:
            result.append(TeamOutput(
                id=str(team.id),
                workspace_id=str(team.workspace_id),
                name=team.name,
                description=team.description,
                icon=team.icon,
                created_at=team.created_at.isoformat() if team.created_at else None,
                updated_at=team.updated_at.isoformat() if team.updated_at else None,
            ))
        
        return TeamListOutput(teams=result)
    except Exception as e:
        raise NonRetryableError(message=f"Database error: {str(e)}")
    finally:
        db.close()

@function.defn()
async def teams_create(team_data: TeamCreateInput) -> TeamSingleOutput:
    """Create a new team"""
    db = next(get_db())
    try:
        team = Team(
            id=uuid.uuid4(),
            workspace_id=uuid.UUID(team_data.workspace_id),
            name=team_data.name,
            description=team_data.description,
            icon=team_data.icon or "Building",
        )
        db.add(team)
        db.commit()
        db.refresh(team)
        
        result = TeamOutput(
            id=str(team.id),
            workspace_id=str(team.workspace_id),
            name=team.name,
            description=team.description,
            icon=team.icon,
            created_at=team.created_at.isoformat() if team.created_at else None,
            updated_at=team.updated_at.isoformat() if team.updated_at else None,
        )
        
        return TeamSingleOutput(team=result)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to create team: {str(e)}")
    finally:
        db.close()

@function.defn()
async def teams_update(input: TeamUpdateInput) -> TeamSingleOutput:
    """Update an existing team"""
    db = next(get_db())
    try:
        team = db.query(Team).filter(Team.id == uuid.UUID(input.team_id)).first()
        if not team:
            raise NonRetryableError(message=f"Team with id {input.team_id} not found")
        
        update_data = input.dict(exclude_unset=True, exclude={'team_id'})
        for key, value in update_data.items():
            if hasattr(team, key):
                setattr(team, key, value)
        
        team.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(team)
        
        result = TeamOutput(
            id=str(team.id),
            workspace_id=str(team.workspace_id),
            name=team.name,
            description=team.description,
            icon=team.icon,
            created_at=team.created_at.isoformat() if team.created_at else None,
            updated_at=team.updated_at.isoformat() if team.updated_at else None,
        )
        
        return TeamSingleOutput(team=result)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to update team: {str(e)}")
    finally:
        db.close()

@function.defn()
async def teams_delete(input: TeamIdInput) -> TeamDeleteOutput:
    """Delete a team"""
    db = next(get_db())
    try:
        team = db.query(Team).filter(Team.id == uuid.UUID(input.team_id)).first()
        if not team:
            raise NonRetryableError(message=f"Team with id {input.team_id} not found")
        
        db.delete(team)
        db.commit()
        
        return TeamDeleteOutput(success=True)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to delete team: {str(e)}")
    finally:
        db.close()

@function.defn()
async def teams_get_by_id(input: TeamIdInput) -> TeamSingleOutput:
    """Get team by ID"""
    db = next(get_db())
    try:
        team = db.query(Team).filter(Team.id == uuid.UUID(input.team_id)).first()
        if not team:
            raise NonRetryableError(message=f"Team with id {input.team_id} not found")
        
        result = TeamOutput(
            id=str(team.id),
            workspace_id=str(team.workspace_id),
            name=team.name,
            description=team.description,
            icon=team.icon,
            created_at=team.created_at.isoformat() if team.created_at else None,
            updated_at=team.updated_at.isoformat() if team.updated_at else None,
        )
        
        return TeamSingleOutput(team=result)
    except Exception as e:
        raise NonRetryableError(message=f"Failed to get team: {str(e)}")
    finally:
        db.close() 