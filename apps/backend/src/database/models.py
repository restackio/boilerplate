from datetime import UTC, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Relationships
    user_workspaces = relationship(
        "UserWorkspace", back_populates="workspace"
    )
    teams = relationship("Team", back_populates="workspace")
    mcp_servers = relationship(
        "McpServer", back_populates="workspace"
    )
    user_oauth_connections = relationship(
        "UserOAuthConnection", back_populates="workspace", cascade="all, delete-orphan"
    )


class UserWorkspace(Base):
    __tablename__ = "user_workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(50), nullable=False, default="member")
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            role.in_(["owner", "admin", "member"]),
            name="valid_role",
        ),
    )

    # Relationships
    user = relationship("User", back_populates="workspaces")
    workspace = relationship(
        "Workspace", back_populates="user_workspaces"
    )


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(50), default="Building")
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="teams")
    agents = relationship("Agent", back_populates="team")
    tasks = relationship("Task", back_populates="team")


class McpServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    server_label = Column(String(255), nullable=False)
    server_url = Column(String(500), nullable=True)
    local = Column(Boolean, nullable=False, default=False)
    server_description = Column(Text)
    headers = Column(JSONB)
    require_approval = Column(
        JSONB,
        nullable=False,
        default={
            "never": {"tool_names": []},
            "always": {"tool_names": []},
        },
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Relationships
    workspace = relationship(
        "Workspace", back_populates="mcp_servers"
    )
    user_oauth_connections = relationship(
        "UserOAuthConnection", back_populates="mcp_server", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(Text)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Relationships
    workspaces = relationship(
        "UserWorkspace", back_populates="user"
    )


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(
        String(255), nullable=False
    )  # Must be slug format: lowercase, numbers, hyphens, underscores only
    description = Column(Text)
    instructions = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="draft")
    parent_agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
    )
    # New GPT-5 model configuration fields
    model = Column(String(100), nullable=False, default="gpt-5")
    reasoning_effort = Column(
        String(20), nullable=False, default="medium"
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            status.in_(["published", "draft", "archived"]),
            name="valid_status",
        ),
        CheckConstraint(
            model.in_(
                [
                    "gpt-5",
                    "gpt-5-mini",
                    "gpt-5-nano",
                    "gpt-5-2025-08-07",
                    "gpt-5-mini-2025-08-07",
                    "gpt-5-nano-2025-08-07",
                ]
            ),
            name="valid_model",
        ),
        CheckConstraint(
            reasoning_effort.in_(
                ["minimal", "low", "medium", "high"]
            ),
            name="valid_reasoning_effort",
        ),
        # Note: Unique constraint for root agent names is handled by partial index in schema.sql
    )

    # Relationships
    workspace = relationship("Workspace")
    team = relationship("Team", back_populates="agents")
    tasks = relationship("Task", back_populates="agent")
    parent_agent = relationship(
        "Agent", remote_side=[id], backref="child_agents"
    )


class AgentTool(Base):
    __tablename__ = "agent_tools"

    id = Column(UUID(as_uuid=True), primary_key=True)
    agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    tool_type = Column(
        String(32), nullable=False
    )  # file_search, web_search_preview, mcp, code_interpreter, image_generation, local_shell
    mcp_server_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mcp_servers.id", ondelete="CASCADE"),
    )
    config = Column(JSONB)
    allowed_tools = Column(JSONB)
    execution_order = Column(Integer)
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            tool_type.in_(
                [
                    "file_search",
                    "web_search_preview",
                    "mcp",
                    "code_interpreter",
                    "image_generation",
                    "local_shell",
                ]
            ),
            name="valid_tool_type",
        ),
        CheckConstraint(
            "(tool_type <> 'mcp' OR mcp_server_id IS NOT NULL)",
            name="chk_agent_tools_mcp_server",
        ),
    )

    # Relationships
    agent = relationship("Agent", backref="agent_tools")
    mcp_server = relationship("McpServer", backref="agent_tools")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False, default="open")
    agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_to_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_task_id = Column(
        String(255), nullable=True
    )  # Restack agent task ID for state management
    messages = Column(
        JSONB, nullable=True
    )  # Store conversation history for completed tasks
    # Schedule-related columns
    schedule_spec = Column(
        JSONB, nullable=True
    )  # Store the schedule specification (calendars, intervals, cron)
    schedule_task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )  # Reference to the schedule task that created this task
    is_scheduled = Column(
        Boolean, nullable=False, default=False
    )  # Whether this is a scheduled task
    schedule_status = Column(
        String(50), nullable=True, default="inactive"
    )  # Schedule status: active, inactive, paused
    restack_schedule_id = Column(
        String(255), nullable=True
    )  # Restack schedule ID for managing the schedule
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            status.in_(
                [
                    "open",
                    "active",
                    "waiting",
                    "closed",
                    "completed",
                ]
            ),
            name="valid_task_status",
        ),
        CheckConstraint(
            schedule_status.in_(
                [
                    "active",
                    "inactive",
                    "paused",
                ]
            ),
            name="valid_schedule_status",
        ),
    )

    # Relationships
    workspace = relationship("Workspace")
    team = relationship("Team", back_populates="tasks")
    agent = relationship("Agent", back_populates="tasks")
    assigned_to_user = relationship(
        "User", foreign_keys=[assigned_to_id]
    )
    # Self-referencing relationship for schedule tasks
    schedule_task = relationship(
        "Task", remote_side=[id], foreign_keys=[schedule_task_id]
    )
    scheduled_tasks = relationship(
        "Task",
        back_populates="schedule_task",
        foreign_keys=[schedule_task_id],
    )


class UserOAuthConnection(Base):
    __tablename__ = "user_oauth_connections"

    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    mcp_server_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mcp_servers.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Simple OAuth token storage
    access_token = Column(String(2000), nullable=False)
    refresh_token = Column(String(2000))
    token_type = Column(String(50), nullable=False, default="Bearer")
    expires_at = Column(DateTime)
    scope = Column(ARRAY(String))
    connected_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
        onupdate=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )

    # Relationships
    user = relationship("User")
    workspace = relationship("Workspace", back_populates="user_oauth_connections")
    mcp_server = relationship("McpServer", back_populates="user_oauth_connections")


