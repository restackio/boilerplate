"use client";

import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Play, RotateCcw } from "lucide-react";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { PlaygroundTaskExecution } from "./playground-task-execution";

interface PlaygroundMiddlePanelProps {
  agent: Agent;
  taskId: string | null;
  title: string;
  taskDescription: string;
  onTaskDescriptionChange: (description: string) => void;
  onCreateTasks: () => void;
  onResetTasks: () => void;
  isCreatingTasks: boolean;
  canCreateTasks: boolean;
  isLeftPanelCollapsed?: boolean;
}

export function PlaygroundMiddlePanel({ 
  agent, 
  taskId, 
  title, 
  taskDescription, 
  onTaskDescriptionChange, 
  onCreateTasks,
  onResetTasks,
  isCreatingTasks,
  canCreateTasks,
  isLeftPanelCollapsed = false
}: PlaygroundMiddlePanelProps) {
  return (
    <div className={`${isLeftPanelCollapsed ? 'w-1/2' : 'w-1/3'} border-r flex flex-col transition-all duration-300`}>
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          {taskId && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetTasks}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              New Test
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col overflow-hidden">
        {!taskId ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Task</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={taskDescription}
                  onChange={(e) => onTaskDescriptionChange(e.target.value)}
                  placeholder="Describe the task you want both agents to perform for comparison..."
                  className="min-h-[120px] max-h-[200px] resize-none"
                  rows={5}
                />
              </CardContent>
            </Card>

            <Button 
              onClick={onCreateTasks}
              disabled={!canCreateTasks || isCreatingTasks}
              className="w-full"
              size="lg"
            >
              {isCreatingTasks ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Saving & creating tasks...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start comparison
                </>
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Task execution will appear here once started</p>
              <p className="text-[10px] opacity-75">
                All changes (instructions, model, tools) will be saved before testing
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <PlaygroundTaskExecution
              taskId={taskId}
              agentName={agent.name || "Draft Agent"}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
