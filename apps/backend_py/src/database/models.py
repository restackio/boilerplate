from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID

Base = declarative_base()


class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_workspaces = relationship("UserWorkspace", back_populates="workspace")
    teams = relationship("Team", back_populates="workspace")
    mcp_servers = relationship("McpServer", back_populates="workspace")


class UserWorkspace(Base):
    __tablename__ = "user_workspaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False, default="member")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            role.in_(['owner', 'admin', 'member']),
            name='valid_role'
        ),
    )
    
    # Relationships
    user = relationship("User", back_populates="workspaces")
    workspace = relationship("Workspace", back_populates="user_workspaces")


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(50), default="Building")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="teams")
    agents = relationship("Agent", back_populates="team")
    tasks = relationship("Task", back_populates="team")


class McpServer(Base):
    __tablename__ = "mcp_servers"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    server_label = Column(String(255), nullable=False)
    server_url = Column(String(500), nullable=False)
    server_description = Column(Text)
    headers = Column(JSONB)
    require_approval = Column(String(50), nullable=False, default="never")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            require_approval.in_(['always', 'never']),
            name='valid_require_approval'
        ),
    )
    
    # Relationships
    workspace = relationship("Workspace", back_populates="mcp_servers")
    agent_mcp_servers = relationship("AgentMcpServer", back_populates="mcp_server")


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workspaces = relationship("UserWorkspace", back_populates="user")


class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    version = Column(String(50), nullable=False, default="v1.0")
    description = Column(Text)
    instructions = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="inactive")
    parent_agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            status.in_(['active', 'inactive']),
            name='valid_status'
        ),
    )
    
    # Relationships
    workspace = relationship("Workspace")
    team = relationship("Team", back_populates="agents")
    tasks = relationship("Task", back_populates="agent")
    parent_agent = relationship("Agent", remote_side=[id], backref="child_agents")
    agent_mcp_servers = relationship("AgentMcpServer", back_populates="agent")


class AgentMcpServer(Base):
    __tablename__ = "agent_mcp_servers"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    mcp_server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False)
    allowed_tools = Column(JSONB)  # Array of allowed tool names
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    agent = relationship("Agent", back_populates="agent_mcp_servers")
    mcp_server = relationship("McpServer", back_populates="agent_mcp_servers")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False, default="open")
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    agent_task_id = Column(String(255), nullable=True)  # Restack agent task ID for state management
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            status.in_(['open', 'active', 'waiting', 'closed', 'completed']),
            name='valid_task_status'
        ),
    )
    
    # Relationships
    workspace = relationship("Workspace")
    team = relationship("Team", back_populates="tasks")
    agent = relationship("Agent", back_populates="tasks")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_id]) 