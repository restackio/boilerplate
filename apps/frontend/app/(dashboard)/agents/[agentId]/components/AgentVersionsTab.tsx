"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { History } from "lucide-react";

// Types for agent version history
interface AgentVersion {
  id: string;
  name: string;
  version: string;
  description: string;
  status: "active" | "inactive";
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
  version: string;
  description?: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
  parent_agent_id?: string;
}

interface AgentVersionsTabProps {
  agentId: string;
  getAgentVersions: (agentId: string) => Promise<ApiResponse<RawAgent[]>>;
}

export function AgentVersionsTab({ agentId, getAgentVersions }: AgentVersionsTabProps) {
  // Agent versions state
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

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
            version: agent.version,
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
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading versions...</p>
              </div>
            </div>
          ) : agentVersions.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No versions found</p>
                <p className="text-xs text-muted-foreground">Create a new version using the Save button</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Version</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {agentVersions.map((version) => (
                    <tr key={version.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{version.version}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{version.description}</div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={version.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {version.status}
                        </Badge>
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