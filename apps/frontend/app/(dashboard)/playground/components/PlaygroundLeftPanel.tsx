"use client";

import { useState } from "react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Brain, Wrench, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { PlaygroundToolsDisplay } from "./PlaygroundToolsDisplay";
import { MODEL_OPTIONS, REASONING_EFFORT_OPTIONS } from "@/components/shared/AgentConfigurationForm";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";

interface PlaygroundLeftPanelProps {
  agent: Agent;
  onAgentChange: (updates: Partial<Agent>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaceId: string;
}

export function PlaygroundLeftPanel({
  agent,
  onAgentChange,
  isCollapsed,
  onToggleCollapse,
  workspaceId,
}: PlaygroundLeftPanelProps) {
  const [activeTab, setActiveTab] = useState("instructions");

  // No need for form change handler since we're using direct onChange

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-1/3'} border-r bg-muted/30 flex flex-col transition-all duration-300`}>
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="font-semibold">Agent Configuration</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="instructions" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Instructions
                </TabsTrigger>
                <TabsTrigger value="model" className="text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  Model
                </TabsTrigger>
                <TabsTrigger value="tools" className="text-xs">
                  <Wrench className="h-3 w-3 mr-1" />
                  Tools
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 px-4 pb-4">
              <TabsContent value="instructions" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">System Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={agent.instructions || ""}
                      onChange={(e) => onAgentChange({ instructions: e.target.value })}
                      placeholder="Enter system instructions for the agent..."
                      className="min-h-[200px] resize-none"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="model" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Model Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="model-select" className="text-xs">Model</Label>
                      <Select
                        value={agent.model || "gpt-5"}
                        onValueChange={(value) => onAgentChange({ model: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reasoning-effort" className="text-xs">Reasoning Effort</Label>
                      <Select
                        value={agent.reasoning_effort || "medium"}
                        onValueChange={(value) => onAgentChange({ reasoning_effort: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REASONING_EFFORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tools" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Available Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlaygroundToolsDisplay agentId={agent.id} workspaceId={workspaceId} />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
