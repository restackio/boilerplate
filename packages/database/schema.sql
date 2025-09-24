-- Initialize the database schema for agent orchestration platform

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_workspaces junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workspace_id)
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Building',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mcp_servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    server_label VARCHAR(255) NOT NULL,
    server_url VARCHAR(500),
    local BOOLEAN NOT NULL DEFAULT FALSE,
    server_description TEXT,
    headers JSONB,
    require_approval JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mcp_servers_url_or_local CHECK (
        (local = TRUE AND server_url IS NULL) OR
        (local = FALSE AND server_url IS NOT NULL)
    )
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL CHECK (name ~ '^[a-z0-9_\-]+$'),
    description TEXT,
    instructions TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
    parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    -- New GPT-5 model configuration fields
    model VARCHAR(100) DEFAULT 'gpt-5' CHECK (model IN (
        'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
        'gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07',
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini',
        'o3-deep-research', 'o4-mini-deep-research'
    )),
    reasoning_effort VARCHAR(20) DEFAULT 'medium' CHECK (reasoning_effort IN ('minimal', 'low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Unified agent tools table mirroring Responses API tool types
-- tool_type ∈ ('file_search','web_search','mcp','code_interpreter','image_generation','local_shell')
CREATE TABLE IF NOT EXISTS agent_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_type VARCHAR(32) NOT NULL CHECK (tool_type IN (
        'file_search','web_search','mcp','code_interpreter','image_generation','local_shell'
    )),
    mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    -- MCP-specific fields (merged from agent_mcp_tools)
    tool_name VARCHAR(255),  -- Required for MCP tools
    custom_description TEXT,  -- Agent-specific tool description override
    require_approval BOOLEAN NOT NULL DEFAULT FALSE,  -- Tool approval setting
    -- General fields
    config JSONB,
    allowed_tools JSONB,
    execution_order INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Validation via CHECK constraints (no triggers)
    CONSTRAINT chk_agent_tools_mcp_server
        CHECK (tool_type <> 'mcp' OR mcp_server_id IS NOT NULL),
    CONSTRAINT chk_agent_tools_mcp_tool_name
        CHECK (tool_type <> 'mcp' OR tool_name IS NOT NULL)
);

-- Uniqueness constraints per tool type
CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_tools_mcp
  ON agent_tools(agent_id, mcp_server_id, tool_name)
  WHERE tool_type = 'mcp';

CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_tools_simple
  ON agent_tools(agent_id, tool_type)
  WHERE tool_type NOT IN ('mcp');


-- Create user_oauth_connections table for individual user OAuth tokens
CREATE TABLE IF NOT EXISTS user_oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    -- Authentication type and token data (encrypted in application)
    auth_type VARCHAR(20) NOT NULL DEFAULT 'oauth' CHECK (auth_type IN ('oauth', 'bearer')),
    access_token VARCHAR(2000) NOT NULL,
    refresh_token VARCHAR(2000),
    token_type VARCHAR(50) NOT NULL DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope TEXT[],
    -- OAuth 2.1 specific fields
    resource_server VARCHAR(500), -- RFC8707 resource parameter
    audience VARCHAR(500), -- Token audience for validation
    -- Default token flag for workspace
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    -- Connection metadata
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure one connection per user per MCP server
    CONSTRAINT unique_user_mcp_oauth UNIQUE(user_id, mcp_server_id)
);


-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'waiting', 'closed', 'completed')),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_task_id VARCHAR(255),
    messages JSONB,
    -- Schedule-related columns
    schedule_spec JSONB, -- Store the schedule specification (calendars, intervals, cron)
    schedule_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Reference to the schedule task that created this task
    is_scheduled BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this is a scheduled task
    schedule_status VARCHAR(50) DEFAULT 'inactive' CHECK (schedule_status IN ('active', 'inactive', 'paused')), -- Schedule status
    restack_schedule_id VARCHAR(255), -- Restack schedule ID for managing the schedule
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_teams_workspace_id ON teams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_workspace_id ON mcp_servers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_team_id ON agents(team_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_parent_created ON agents(parent_agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agents_status_created ON agents(status, created_at);

-- Unique constraint for root agent names within workspace (allows versions with same name)
CREATE UNIQUE INDEX IF NOT EXISTS unique_root_agent_name_per_workspace 
ON agents(workspace_id, name) 
WHERE parent_agent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_id ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool_type ON agent_tools(tool_type);
CREATE INDEX IF NOT EXISTS idx_agent_tools_mcp_server_id ON agent_tools(mcp_server_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_task_id ON tasks(agent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_schedule_task_id ON tasks(schedule_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_scheduled ON tasks(is_scheduled);
CREATE INDEX IF NOT EXISTS idx_tasks_schedule_status ON tasks(schedule_status);
CREATE INDEX IF NOT EXISTS idx_tasks_restack_schedule_id ON tasks(restack_schedule_id);

-- OAuth-related indexes
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_user_id ON user_oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_workspace_id ON user_oauth_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_mcp_server_id ON user_oauth_connections(mcp_server_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_expires_at ON user_oauth_connections(expires_at);

-- Performance-critical composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agents_workspace_status_created ON agents(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_workspace_name_parent ON agents(workspace_id, name, parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_created ON tasks(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_status ON tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_role ON user_workspaces(user_id, role);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_type_enabled ON agent_tools(agent_id, tool_type, enabled);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_workspace_label ON mcp_servers(workspace_id, server_label);

-- Partial indexes for published records (more efficient for common queries)
CREATE INDEX IF NOT EXISTS idx_agents_published_workspace ON agents(workspace_id, created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_tasks_open_workspace ON tasks(workspace_id, created_at DESC) WHERE status IN ('open', 'active');
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_workspace ON tasks(workspace_id, is_scheduled, schedule_status, created_at DESC) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_agent_tools_enabled ON agent_tools(agent_id, tool_type) WHERE enabled = true;

-- Covering indexes for read-heavy operations
CREATE INDEX IF NOT EXISTS idx_agents_list_covering ON agents(workspace_id, status) INCLUDE (id, name, description, created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_list_covering ON tasks(workspace_id, status) INCLUDE (id, title, description, agent_id, assigned_to_id, created_at, updated_at);

-- Index for email lookups (very common in auth)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- PostgreSQL 17 JSONB Performance Optimizations
-- GIN indexes for JSONB fields to improve JSON queries
CREATE INDEX IF NOT EXISTS idx_tasks_messages_gin ON tasks USING GIN (messages) WHERE messages IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_schedule_gin ON tasks USING GIN (schedule_spec) WHERE schedule_spec IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mcp_headers_gin ON mcp_servers USING GIN (headers) WHERE headers IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tools_config_gin ON agent_tools USING GIN (config) WHERE config IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tools_allowed_gin ON agent_tools USING GIN (allowed_tools) WHERE allowed_tools IS NOT NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_tools_updated_at BEFORE UPDATE ON agent_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mcp_servers_updated_at BEFORE UPDATE ON mcp_servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_oauth_connections_updated_at BEFORE UPDATE ON user_oauth_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();