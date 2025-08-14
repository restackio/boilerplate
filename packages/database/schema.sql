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
    server_url VARCHAR(500) NOT NULL,
    server_description TEXT,
    headers JSONB,
    require_approval JSONB DEFAULT '{"never": {"tool_names": []}, "always": {"tool_names": []}}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL CHECK (name ~ '^[a-z0-9_\-]+$'),
    version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    description TEXT,
    instructions TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    -- New GPT-5 model configuration fields
    model VARCHAR(100) DEFAULT 'gpt-5' CHECK (model IN (
        'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
        'gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07',
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini'
    )),
    reasoning_effort VARCHAR(20) DEFAULT 'medium' CHECK (reasoning_effort IN ('minimal', 'low', 'medium', 'high')),
    response_format JSONB DEFAULT '{"type": "text"}', -- Store response format configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Unified agent tools table mirroring Responses API tool types
-- tool_type ∈ ('file_search','web_search_preview','mcp','code_interpreter','image_generation','local_shell')
CREATE TABLE IF NOT EXISTS agent_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_type VARCHAR(32) NOT NULL CHECK (tool_type IN (
        'file_search','web_search_preview','mcp','code_interpreter','image_generation','local_shell'
    )),
    mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    config JSONB,
    allowed_tools JSONB,
    execution_order INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Validation via CHECK constraints (no triggers)
    CONSTRAINT chk_agent_tools_mcp_server
        CHECK (tool_type <> 'mcp' OR mcp_server_id IS NOT NULL)
);

-- Uniqueness constraints per tool type
CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_tools_mcp
  ON agent_tools(agent_id, tool_type, mcp_server_id)
  WHERE tool_type = 'mcp';

CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_tools_simple
  ON agent_tools(agent_id, tool_type)
  WHERE tool_type NOT IN ('mcp');

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
    agent_task_id VARCHAR(255), -- Restack agent task ID for state management
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

-- Performance-critical composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agents_workspace_status_created ON agents(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_workspace_name_parent ON agents(workspace_id, name, parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_created ON tasks(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_status ON tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_role ON user_workspaces(user_id, role);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_type_enabled ON agent_tools(agent_id, tool_type, enabled);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_workspace_label ON mcp_servers(workspace_id, server_label);

-- Partial indexes for active records (more efficient for common queries)
CREATE INDEX IF NOT EXISTS idx_agents_active_workspace ON agents(workspace_id, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tasks_open_workspace ON tasks(workspace_id, created_at DESC) WHERE status IN ('open', 'active');
CREATE INDEX IF NOT EXISTS idx_agent_tools_enabled ON agent_tools(agent_id, tool_type) WHERE enabled = true;

-- Covering indexes for read-heavy operations
CREATE INDEX IF NOT EXISTS idx_agents_list_covering ON agents(workspace_id, status) INCLUDE (id, name, version, description, created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_list_covering ON tasks(workspace_id, status) INCLUDE (id, title, description, agent_id, assigned_to_id, created_at, updated_at);

-- Index for email lookups (very common in auth)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

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
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mcp_servers_updated_at BEFORE UPDATE ON mcp_servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();