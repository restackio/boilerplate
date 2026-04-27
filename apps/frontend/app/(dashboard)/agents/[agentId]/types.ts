// Types for agent version history
export interface AgentVersion {
  id: string;
  name: string;
  description: string;
  status: "published" | "draft" | "archived";
  created_at: string;
  updated_at: string;
  parent_agent_id?: string;
}

// Types for test simulation
export interface TestConversationItem {
  type: "system" | "agent" | "human" | "agent-action";
  message?: string;
  timestamp: string;
  agent: string;
  action?: string;
  status?: string;
  details?: string;
}

export interface TestAgentLog {
  timestamp: string;
  agent: string;
  action: string;
  type: string;
  details: string;
  metadata?: Record<string, unknown>;
}

// Agent data interface
export interface Agent {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  type: "interactive" | "pipeline" | "batch";
  status: "published" | "draft" | "archived" | "testing" | "paused";
  parent_agent_id?: string;
  created_at?: string;
  updated_at?: string;
  version_count?: number;
  model?: string;
  channel?: string;
  integrations?: string[];
}
