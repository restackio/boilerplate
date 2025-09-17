"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { AgentStatusBadge, type AgentStatus } from "@workspace/ui/components/agent-status-badge";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import { EmptyState } from "@workspace/ui/components/empty-state";

// Types for agent version history
interface AgentVersion {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  parent_agent_id?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RawAgent {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  created_at?: string;
  updated_at?: string;
  parent_agent_id?: string;
}

interface AgentVersionsTabProps {
  agentId: string;
  getAgentVersions: (agentId: string) => Promise<ApiResponse<RawAgent[]>>;
}

export function AgentVersionsTab({ agentId, getAgentVersions }: AgentVersionsTabProps) {
  const router = useRouter();
  
  // Agent versions state
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Handle version row click
  const handleVersionClick = (versionId: string) => {
    router.push(`/agents/${versionId}`);
  };

  // Fetch agent versions when component mounts
  useEffect(() => {
    const fetchAgentVersions = async () => {
      if (!agentId) return;
      
      setVersionsLoading(true);
      try {
        const result = await getAgentVersions(agentId);
        if (result.success && result.data) {
          // Convert Agent[] to AgentVersion[] format
          const versions: AgentVersion[] = result.data.map((agent: RawAgent) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description || "",
            status: agent.status,
            created_at: agent.created_at || "",
            updated_at: agent.updated_at || "",
            parent_agent_id: agent.parent_agent_id,
          }));
          setAgentVersions(versions);
        } else {
          console.error("Failed to fetch agent versions:", result.error);
          setAgentVersions([]);
        }
      } catch (error) {
        console.error("Error fetching agent versions:", error);
        setAgentVersions([]);
      } finally {
        setVersionsLoading(false);
      }
    };

    fetchAgentVersions();
  }, [agentId, getAgentVersions]);

  return (

        <div className="space-y-4">
          {versionsLoading ? (
            <CenteredLoading message="Loading versions..." />
          ) : agentVersions.length === 0 ? (
            <EmptyState
              title="No versions found"
              description="Create a new version using the Save button"
            />
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {agentVersions.map((version) => (
                    <tr 
                      key={version.id} 
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleVersionClick(version.id)}
                    >
                      <td className="p-3">
                        <div className="font-medium">{version.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{version.description}</div>
                      </td>
                      <td className="p-3">
                        <AgentStatusBadge status={version.status} size="sm" />
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(version.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(version.updated_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
  );
} 