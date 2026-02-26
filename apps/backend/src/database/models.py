from datetime import UTC, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
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
        "UserOAuthConnection",
        back_populates="workspace",
        cascade="all, delete-orphan",
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
    require_approval = Column(JSONB)

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
        "UserOAuthConnection",
        back_populates="mcp_server",
        cascade="all, delete-orphan",
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
    # Agent type: interactive (user-facing) or pipeline (data processing)
    type = Column(
        String(20), nullable=False, default="interactive"
    )
    # New GPT-5 model configuration fields
    model = Column(String(100), nullable=False, default="gpt-5.2")
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
            type.in_(["interactive", "pipeline"]),
            name="valid_type",
        ),
        CheckConstraint(
            model.in_(
                [
                    "gpt-5.2", "gpt-5.2-chat-latest", "gpt-5.2-codex", "gpt-5.3-codex",
                    "gpt-5.1", "gpt-5.1-chat-latest", "gpt-5.1-codex", "gpt-5.1-codex-mini", "gpt-5.1-codex-max",
                    "gpt-5", "gpt-5-mini", "gpt-5-nano",
                    "gpt-5-2025-08-07", "gpt-5-mini-2025-08-07", "gpt-5-nano-2025-08-07",
                    "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini",
                    "o3-deep-research", "o4-mini-deep-research",
                ]
            ),
            name="valid_model",
        ),
        CheckConstraint(
            reasoning_effort.in_(
                ["none", "low", "medium", "high"]
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
    agent_tools = relationship(
        "AgentTool",
        back_populates="agent",
        cascade="all, delete-orphan",
    )
    configured_subagents = relationship(
        "AgentSubagent",
        foreign_keys="AgentSubagent.parent_agent_id",
        back_populates="parent_agent",
        cascade="all, delete-orphan",
    )
    parent_agents = relationship(
        "AgentSubagent",
        foreign_keys="AgentSubagent.subagent_id",
        back_populates="subagent",
        cascade="all, delete-orphan",
    )
    metric_agents = relationship(
        "MetricAgent",
        back_populates="parent_agent",
        cascade="all, delete-orphan",
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
    )  # file_search, web_search, mcp, code_interpreter, image_generation, local_shell, transform, load
    mcp_server_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mcp_servers.id", ondelete="CASCADE"),
    )
    # MCP-specific fields (merged from AgentMcpTool)
    tool_name = Column(
        String(255)
    )  # Specific tool name for MCP tools
    custom_description = Column(
        Text
    )  # Agent-specific tool description override
    require_approval = Column(
        Boolean, nullable=False, default=False
    )  # Tool approval setting

    # General tool configuration
    config = Column(JSONB)
    allowed_tools = Column(JSONB)
    execution_order = Column(Integer)
    enabled = Column(Boolean, nullable=False, default=True)

    # Timestamps
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
            tool_type.in_(
                [
                    "file_search",
                    "web_search",
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
        CheckConstraint(
            "(tool_type <> 'mcp' OR tool_name IS NOT NULL)",
            name="chk_agent_tools_mcp_tool_name",
        ),
        # Ensure unique tool per agent per server for MCP tools
        UniqueConstraint(
            "agent_id",
            "mcp_server_id",
            "tool_name",
            name="uq_agent_tool_mcp",
        ),
        # Indexes for performance
        Index("idx_agent_tools_agent_id", "agent_id"),
        Index("idx_agent_tools_mcp_server_id", "mcp_server_id"),
    )

    # Relationships
    agent = relationship("Agent", back_populates="agent_tools")
    mcp_server = relationship("McpServer", backref="agent_tools")


class AgentSubagent(Base):
    __tablename__ = "agent_subagents"

    id = Column(UUID(as_uuid=True), primary_key=True)
    parent_agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    subagent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    enabled = Column(Boolean, nullable=False, default=True)
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
        UniqueConstraint(
            "parent_agent_id",
            "subagent_id",
            name="unique_parent_subagent",
        ),
        Index(
            "idx_agent_subagents_parent_agent_id",
            "parent_agent_id",
        ),
        Index("idx_agent_subagents_subagent_id", "subagent_id"),
    )

    # Relationships
    parent_agent = relationship(
        "Agent",
        foreign_keys=[parent_agent_id],
        back_populates="configured_subagents",
    )
    subagent = relationship(
        "Agent",
        foreign_keys=[subagent_id],
        back_populates="parent_agents",
    )


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
    temporal_agent_id = Column(String(255), nullable=True)
    agent_state = Column(
        JSONB, nullable=True
    )  # Complete agent state (events, todos, subtasks) - populated when task completes
    # Subtask-related columns
    parent_task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
    )  # Reference to parent task if this is a subtask
    temporal_parent_agent_id = Column(
        String(255), nullable=True
    )  # Parent's Temporal workflow ID for event routing (cached for performance)
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
    temporal_schedule_id = Column(String(255), nullable=True)
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
                    "in_progress",
                    "in_review",
                    "closed",
                    "completed",
                    "failed",
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
    # Self-referencing relationship for parent-child tasks (subtasks)
    parent_task = relationship(
        "Task", remote_side=[id], foreign_keys=[parent_task_id]
    )
    subtasks = relationship(
        "Task",
        back_populates="parent_task",
        foreign_keys=[parent_task_id],
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
    # Token storage - supports both OAuth and Bearer tokens
    auth_type = Column(
        String(20), nullable=False, default="oauth"
    )  # "oauth" or "bearer"
    access_token = Column(String(2000), nullable=False)
    refresh_token = Column(String(2000))
    token_type = Column(
        String(50), nullable=False, default="Bearer"
    )
    expires_at = Column(DateTime)
    scope = Column(ARRAY(String))
    # Default token flag for workspace
    is_default = Column(Boolean, nullable=False, default=False)
    last_refreshed_at = Column(DateTime)
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
        onupdate=lambda: datetime.now(tz=UTC).replace(
            tzinfo=None
        ),
    )

    # Relationships
    user = relationship("User")
    workspace = relationship(
        "Workspace", back_populates="user_oauth_connections"
    )
    mcp_server = relationship(
        "McpServer", back_populates="user_oauth_connections"
    )


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Storage configuration (storage-agnostic)
    storage_type = Column(
        String(50), nullable=False, default="clickhouse"
    )
    storage_config = Column(
        JSONB, nullable=False
    )  # Storage-specific configuration
    last_updated_at = Column(DateTime)
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
            storage_type.in_(
                ["clickhouse"]
            ),  # Future: 'postgres', 's3', 'bigquery', etc.
            name="valid_storage_type",
        ),
        UniqueConstraint(
            "workspace_id",
            "name",
            name="unique_dataset_name_per_workspace",
        ),
    )

    # Relationships
    workspace = relationship("Workspace")


class MetricDefinition(Base):
    __tablename__ = "metric_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Metric details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(
        String(50), nullable=False
    )  # quality, cost, performance, custom
    metric_type = Column(
        String(50), nullable=False
    )  # llm_judge, python_code, formula

    # Type-specific configuration (judge_prompt for llm_judge, code for python_code, formula for formula)
    config = Column(JSONB, nullable=False)

    # Metadata
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
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
            metric_type.in_(
                ["llm_judge", "python_code", "formula"]
            ),
            name="valid_metric_type",
        ),
        UniqueConstraint(
            "workspace_id",
            "name",
            name="unique_metric_per_workspace",
        ),
    )

    # Relationships
    workspace = relationship("Workspace")
    metric_agents = relationship(
        "MetricAgent",
        back_populates="metric_definition",
        cascade="all, delete-orphan",
    )


class MetricAgent(Base):
    __tablename__ = "metric_agents"

    id = Column(UUID(as_uuid=True), primary_key=True)
    metric_definition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("metric_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(tz=UTC).replace(tzinfo=None),
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "metric_definition_id",
            "parent_agent_id",
            name="unique_metric_agent",
        ),
    )

    # Relationships
    metric_definition = relationship(
        "MetricDefinition", back_populates="metric_agents"
    )
    parent_agent = relationship("Agent", back_populates="metric_agents")
