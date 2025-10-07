"use client";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Input } from "@workspace/ui/components/ui/input";
import { Loader2, Plus, X, Search } from "lucide-react";
import {
  addAgentSubagent,
  getAgentSubagents,
  getAvailableAgents,
  removeAgentSubagent,
  type AvailableAgentInfo,
  type SubagentInfo,
} from "@/app/actions/subagents";

interface SubagentsInlineProps {
  agentId: string;
  workspaceId: string;
  isReadOnly?: boolean;
}

export function SubagentsInline({ agentId, workspaceId, isReadOnly = false }: SubagentsInlineProps) {
  const [configuredSubagents, setConfiguredSubagents] = useState<SubagentInfo[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [agentId, workspaceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subagents, available] = await Promise.all([
        getAgentSubagents(agentId),
        getAvailableAgents(workspaceId, agentId),
      ]);
      setConfiguredSubagents(subagents);
      setAvailableAgents(available);
    } catch (error) {
      console.error("Error loading subagents data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubagent = async (subagentId: string) => {
    setIsAdding(subagentId);
    try {
      const result = await addAgentSubagent(agentId, subagentId);
      if (result.success) {
        await loadData();
      }
    } catch (error) {
      console.error("Error adding subagent:", error);
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveSubagent = async (subagentId: string) => {
    setIsRemoving(subagentId);
    try {
      const result = await removeAgentSubagent(agentId, subagentId);
      if (result.success) {
        await loadData();
      }
    } catch (error) {
      console.error("Error removing subagent:", error);
    } finally {
      setIsRemoving(null);
    }
  };

  const unconfiguredAgents = availableAgents.filter((a) => !a.is_configured);
  
  // Filter agents based on search query
  const filteredAgents = unconfiguredAgents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="ml-8 mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading subagents...</span>
      </div>
    );
  }

  return (
    <div className="ml-8 mt-2 space-y-3 border-l-2 border-muted pl-4">
      {/* Title */}
      <div className="text-sm">
        <span className="font-medium">Subagents</span>
        <span className="ml-2 text-muted-foreground">
          ({configuredSubagents.length} configured)
        </span>
      </div>

      {/* Configured Subagents */}
      {configuredSubagents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {configuredSubagents.map((subagent) => (
            <Badge
              key={subagent.id}
              variant="secondary"
              className={isReadOnly ? "" : "gap-1.5 pr-1"}
            >
              <span className="max-w-[200px] truncate">{subagent.name}</span>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveSubagent(subagent.id)}
                  disabled={isRemoving === subagent.id}
                >
                  {isRemoving === subagent.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add New Subagent */}
      {!isReadOnly && unconfiguredAgents.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          
          {searchQuery && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between gap-2 rounded border p-2 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium truncate">{agent.name}</span>
                      <Badge
                        variant={agent.type === "pipeline" ? "secondary" : "default"}
                        className="text-xs flex-shrink-0"
                      >
                        {agent.type}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddSubagent(agent.id)}
                      disabled={isAdding === agent.id}
                      className="h-7 px-2 flex-shrink-0"
                    >
                      {isAdding === agent.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-2 text-center">
                  No agents found matching "{searchQuery}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {configuredSubagents.length === 0 && unconfiguredAgents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No subagents available
        </p>
      )}
    </div>
  );
}
