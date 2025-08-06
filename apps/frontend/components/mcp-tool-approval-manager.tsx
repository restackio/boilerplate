"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Label } from "@workspace/ui/components/ui/label";
import { Separator } from "@workspace/ui/components/ui/separator";
import { Plus, X, Shield, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import { McpRequireApproval } from "@/hooks/use-workspace-scoped-actions";

interface McpToolApprovalManagerProps {
  value: McpRequireApproval;
  onChange: (value: McpRequireApproval) => void;
  availableTools?: string[]; // Optional list of available tools from the server
  disabled?: boolean;
}

export function McpToolApprovalManager({
  value,
  onChange,
  availableTools = [],
  disabled = false
}: McpToolApprovalManagerProps) {
  const [newNeverTool, setNewNeverTool] = useState("");
  const [newAlwaysTool, setNewAlwaysTool] = useState("");

  // Helper functions
  const addNeverTool = () => {
    if (newNeverTool.trim() && !value.never.tool_names.includes(newNeverTool.trim())) {
      const updated = {
        ...value,
        never: {
          tool_names: [...value.never.tool_names, newNeverTool.trim()]
        }
      };
      onChange(updated);
      setNewNeverTool("");
    }
  };

  const removeNeverTool = (toolName: string) => {
    const updated = {
      ...value,
      never: {
        tool_names: value.never.tool_names.filter(name => name !== toolName)
      }
    };
    onChange(updated);
  };

  const addAlwaysTool = () => {
    if (newAlwaysTool.trim() && !value.always.tool_names.includes(newAlwaysTool.trim())) {
      const updated = {
        ...value,
        always: {
          tool_names: [...value.always.tool_names, newAlwaysTool.trim()]
        }
      };
      onChange(updated);
      setNewAlwaysTool("");
    }
  };

  const removeAlwaysTool = (toolName: string) => {
    const updated = {
      ...value,
      always: {
        tool_names: value.always.tool_names.filter(name => name !== toolName)
      }
    };
    onChange(updated);
  };

  const addFromAvailable = (toolName: string, category: 'never' | 'always') => {
    if (category === 'never') {
      if (!value.never.tool_names.includes(toolName)) {
        const updated = {
          ...value,
          never: {
            tool_names: [...value.never.tool_names, toolName]
          }
        };
        onChange(updated);
      }
    } else {
      if (!value.always.tool_names.includes(toolName)) {
        const updated = {
          ...value,
          always: {
            tool_names: [...value.always.tool_names, toolName]
          }
        };
        onChange(updated);
      }
    }
  };

  // Get tools that aren't in either category
  const unassignedTools = availableTools.filter(tool => 
    !value.never.tool_names.includes(tool) && 
    !value.always.tool_names.includes(tool)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Tool Approval Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure which tools require approval before execution. Use "*" for all tools.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Never Require Approval Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <Label className="text-sm font-medium">Never Require Approval</Label>
            <Badge variant="secondary" className="text-xs">Auto-execute</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            These tools will execute automatically without user approval.
          </p>
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter tool name or use * for all"
              value={newNeverTool}
              onChange={(e) => setNewNeverTool(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNeverTool()}
              disabled={disabled}
              className="flex-1"
            />
            <Button 
              onClick={addNeverTool} 
              size="sm" 
              disabled={disabled || !newNeverTool.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {value.never.tool_names.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.never.tool_names.map((tool) => (
                <Badge key={tool} variant="secondary" className="flex items-center gap-1">
                  {tool}
                  {!disabled && (
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeNeverTool(tool)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Always Require Approval Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <Label className="text-sm font-medium">Always Require Approval</Label>
            <Badge variant="destructive" className="text-xs">Manual approval</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            These tools will always require manual approval before execution.
          </p>
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter tool name or use * for all"
              value={newAlwaysTool}
              onChange={(e) => setNewAlwaysTool(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAlwaysTool()}
              disabled={disabled}
              className="flex-1"
            />
            <Button 
              onClick={addAlwaysTool} 
              size="sm"
              disabled={disabled || !newAlwaysTool.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {value.always.tool_names.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.always.tool_names.map((tool) => (
                <Badge key={tool} variant="destructive" className="flex items-center gap-1">
                  {tool}
                  {!disabled && (
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-white" 
                      onClick={() => removeAlwaysTool(tool)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Available Tools Section */}
        {availableTools.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium">Available Tools</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Quick add tools discovered from the server.
              </p>
              
              {unassignedTools.length > 0 ? (
                <div className="space-y-2">
                  {unassignedTools.map((tool) => (
                    <div key={tool} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-mono">{tool}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addFromAvailable(tool, 'never')}
                          disabled={disabled}
                          className="text-xs"
                        >
                          Auto-execute
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addFromAvailable(tool, 'always')}
                          disabled={disabled}
                          className="text-xs"
                        >
                          Require approval
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  All available tools have been assigned approval settings.
                </p>
              )}
            </div>
          </>
        )}

        {/* Summary */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Current behavior:</strong>{" "}
            {value.always.tool_names.includes("*") ? (
              "All tools require approval"
            ) : value.never.tool_names.includes("*") ? (
              "No tools require approval"
            ) : (
              `${value.always.tool_names.length} tools require approval, ${value.never.tool_names.length} auto-execute`
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}