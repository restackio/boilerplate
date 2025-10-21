"use client";

import { Badge } from "@workspace/ui/components/ui/badge";
import { Card, CardContent } from "@workspace/ui/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
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
      <div className="p-4 border-b bg-background flex items-center justify-between gap-4 h-14">
        <h2 className="font-semibold line-clamp-1">{title}</h2>
        
        <div className="flex items-center gap-2">
          <Select
            value={agent?.name || ""}
            onValueChange={(name) => {
              const selectedAgent = availableAgents.find(a => a.name === name);
              if (selectedAgent) onAgentChange(selectedAgent.id);
            }}
          >
            <SelectTrigger className="w-[180px]">
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

          {agent && (
            <Select
              value={agent.id}
              onValueChange={onAgentChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableAgents
                  .filter(a => a.name === agent.name)
                  .map((availableAgent) => (
                  <SelectItem key={availableAgent.id} value={availableAgent.id}>
                    <div className="flex items-center gap-2">
                      <Badge 
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
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {!agent && (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <EmptyState
                title="Select an agent to compare"
                description="Choose from the dropdown above"
              />
            </CardContent>
          </Card>
        )}
        
        {agent && !taskId && (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <EmptyState
                title="Ready for comparison"
                description="Create a task to start testing"
              />
            </CardContent>
          </Card>
        )}
        
        {agent && (
          <div className={`flex-1 overflow-y-auto ${!taskId ? 'hidden' : ''}`}>
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
