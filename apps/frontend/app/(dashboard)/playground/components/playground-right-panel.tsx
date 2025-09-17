"use client";

import { Badge } from "@workspace/ui/components/ui/badge";
import { Card, CardContent } from "@workspace/ui/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { Label } from "@workspace/ui/components/ui/label";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { PlaygroundTaskExecution } from "./playground-task-execution";

interface PlaygroundRightPanelProps {
  agent: Agent | null;
  taskId: string | null;
  availableAgents: Agent[];
  onAgentChange: (agentId: string) => void;
  title: string;
  isLeftPanelCollapsed?: boolean;
}

export function PlaygroundRightPanel({ 
  agent, 
  taskId, 
  availableAgents, 
  onAgentChange, 
  title,
  isLeftPanelCollapsed = false
}: PlaygroundRightPanelProps) {
  return (
    <div className={`${isLeftPanelCollapsed ? 'w-1/2' : 'w-1/3'} flex flex-col transition-all duration-300`}>
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
        </div>
        
        
      </div>

      <div className="p-4 border-b bg-background">
      <div className="space-y-3">
          <div>
            <Label htmlFor="agent-select" className="text-xs">
              Agent
            </Label>
            <Select
              value={agent?.name || ""}
              onValueChange={(name) => {
                const selectedAgent = availableAgents.find(a => a.name === name);
                if (selectedAgent) onAgentChange(selectedAgent.id);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set(availableAgents.map(a => a.name))).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {agent && (
            <div>
              <Label htmlFor="version-select" className="text-xs">
                Version
              </Label>
              <Select
                value={agent.id}
                onValueChange={onAgentChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents
                    .filter(a => a.name === agent.name)
                    .map((availableAgent) => (
                    <SelectItem key={availableAgent.id} value={availableAgent.id}>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={availableAgent.status === "published" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {availableAgent.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {availableAgent.id.slice(-8)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {!agent ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <EmptyState
                title="Select an agent to compare"
                description="Choose from the dropdown above"
              />
            </CardContent>
          </Card>
        ) : !taskId ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <EmptyState
                title="Ready for comparison"
                description="Create a task to start testing"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <PlaygroundTaskExecution
              taskId={taskId}
              agentName={agent.name || "Comparison Agent"}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
