"use client";

import { useState, useEffect } from "react";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Label } from "@workspace/ui/components/ui/label";
import { Card } from "@workspace/ui/components/ui/card";
import { CheckSquare, ListTodo, Database } from "lucide-react";
import { AgentToolRecord } from "./tools-list";

interface QuickToolTogglesProps {
  agentId: string;
  tools: AgentToolRecord[];
  onToggle: (toolGroupId: string, enabled: boolean) => Promise<void>;
  isCreating: boolean;
  isReadOnly?: boolean;
  restackCoreMcpServerId: string;
}

interface ToolGroup {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  toolNames: string[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "subtasks",
    label: "Create subtasks",
    description: "Allow agent to create sub tasks",
    icon: CheckSquare,
    toolNames: ["createsubtask"]
  },
  {
    id: "todos",
    label: "Todo list",
    description: "Allow agent to use todo list to track progress on tasks",
    icon: ListTodo,
    toolNames: ["updatetodos"]
  },
  {
    id: "context-store",
    label: "Context store",
    description: "Allow agent to query dataset for better context",
    icon: Database,
    toolNames: ["clickhouselisttables", "clickhouserunselectquery"]
  }
];

export function QuickToolToggles({
  tools,
  onToggle,
  isCreating,
  isReadOnly = false,
  restackCoreMcpServerId
}: QuickToolTogglesProps) {
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>({});

  // Calculate which tool groups are enabled based on current tools
  useEffect(() => {
    const newStates: Record<string, boolean> = {};
    
    TOOL_GROUPS.forEach(group => {
      // Check if ALL tools in the group are present
      const hasAllTools = group.toolNames.every(toolName =>
        tools.some(
          tool => 
            tool.tool_type === "mcp" && 
            tool.tool_name === toolName &&
            tool.mcp_server_id === restackCoreMcpServerId
        )
      );
      newStates[group.id] = hasAllTools;
    });
    
    setGroupStates(newStates);
  }, [tools, restackCoreMcpServerId]);

  const handleToggle = async (groupId: string, checked: boolean) => {
    if (isReadOnly || isCreating) return;
    
    // Optimistically update UI
    setGroupStates(prev => ({ ...prev, [groupId]: checked }));
    
    try {
      await onToggle(groupId, checked);
    } catch (error) {
      // Revert on error
      setGroupStates(prev => ({ ...prev, [groupId]: !checked }));
      console.error("Failed to toggle tool group:", error);
    }
  };

  if (isReadOnly) {
    return null; // Hide completely for published agents
  }

  return (
    <div className="space-y-3 mb-6 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Add
        </span>
        <div className="flex-1 border-t border-border" />
      </div>
      {TOOL_GROUPS.map(group => {
        const Icon = group.icon;
        const isEnabled = groupStates[group.id] || false;
        
        return (
          <Card 
            key={group.id}
            className="p-3 hover:bg-accent/50 transition-all border-border/50 hover:border-border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-md bg-muted/50">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label 
                    htmlFor={`toggle-${group.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {group.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {group.description}
                  </p>
                </div>
              </div>
              <Switch
                id={`toggle-${group.id}`}
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggle(group.id, checked)}
                disabled={isCreating}
                className="flex-shrink-0"
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

