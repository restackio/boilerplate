"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Plus, X, Shield, ShieldCheck, AlertTriangle, Info } from "lucide-react";

interface ToolApprovalFilter {
  tool_names: string[];
}

export interface ToolApprovalSettings {
  never: ToolApprovalFilter;
  always: ToolApprovalFilter;
}

interface ToolApprovalManagerProps {
  /** Current approval settings */
  value: ToolApprovalSettings;
  /** Change handler */
  onChange: (value: ToolApprovalSettings) => void;
  /** Available tools from the server */
  availableTools?: string[];
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Show available tools section */
  showAvailableTools?: boolean;
  /** Custom placeholder text */
  placeholders?: {
    never?: string;
    always?: string;
  };
}

export function ToolApprovalManager({
  value,
  onChange,
  availableTools = [],
  disabled = false,
  title = "Tool Approval Settings",
  description = "Configure which tools require approval before execution. Use \"*\" for all tools.",
  showAvailableTools = true,
  placeholders = {
    never: "Enter tool name or use * for all",
    always: "Enter tool name or use * for all",
  },
}: ToolApprovalManagerProps) {
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

  // Get current behavior summary
  const getBehaviorSummary = () => {
    if (value.always.tool_names.includes("*")) {
      return "All tools require approval";
    }
    if (value.never.tool_names.includes("*")) {
      return "No tools require approval";
    }
    return `${value.always.tool_names.length} tools require approval, ${value.never.tool_names.length} auto-execute`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Never Require Approval Section */}
        <ApprovalSection
          type="never"
          title="Never Require Approval"
          description="These tools will execute automatically without user approval."
          icon={ShieldCheck}
          badgeVariant="secondary"
          badgeLabel="Auto-execute"
          iconColor="text-green-600"
          tools={value.never.tool_names}
          newTool={newNeverTool}
          onNewToolChange={setNewNeverTool}
          onAddTool={addNeverTool}
          onRemoveTool={removeNeverTool}
          placeholder={placeholders.never}
          disabled={disabled}
        />

        <Separator />

        {/* Always Require Approval Section */}
        <ApprovalSection
          type="always"
          title="Always Require Approval"
          description="These tools will always require manual approval before execution."
          icon={AlertTriangle}
          badgeVariant="destructive"
          badgeLabel="Manual approval"
          iconColor="text-amber-600"
          tools={value.always.tool_names}
          newTool={newAlwaysTool}
          onNewToolChange={setNewAlwaysTool}
          onAddTool={addAlwaysTool}
          onRemoveTool={removeAlwaysTool}
          placeholder={placeholders.always}
          disabled={disabled}
        />

        {/* Available Tools Section */}
        {showAvailableTools && availableTools.length > 0 && (
          <>
            <Separator />
            <AvailableToolsSection
              tools={unassignedTools}
              onAddTool={addFromAvailable}
              disabled={disabled}
            />
          </>
        )}

        {/* Summary */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Current behavior:</strong> {getBehaviorSummary()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Individual approval section component
interface ApprovalSectionProps {
  type: "never" | "always";
  title: string;
  description: string;
  icon: typeof ShieldCheck;
  badgeVariant: "secondary" | "destructive";
  badgeLabel: string;
  iconColor: string;
  tools: string[];
  newTool: string;
  onNewToolChange: (value: string) => void;
  onAddTool: () => void;
  onRemoveTool: (tool: string) => void;
  placeholder?: string;
  disabled: boolean;
}

function ApprovalSection({
  title,
  description,
  icon: Icon,
  badgeVariant,
  badgeLabel,
  iconColor,
  tools,
  newTool,
  onNewToolChange,
  onAddTool,
  onRemoveTool,
  placeholder,
  disabled,
}: ApprovalSectionProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAddTool();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <Label className="text-sm font-medium">{title}</Label>
        <Badge variant={badgeVariant} className="text-xs">{badgeLabel}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
      
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newTool}
          onChange={(e) => onNewToolChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="flex-1"
        />
        <Button 
          onClick={onAddTool} 
          size="sm" 
          disabled={disabled || !newTool.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <Badge 
              key={tool} 
              variant={badgeVariant} 
              className="flex items-center gap-1"
            >
              {tool}
              {!disabled && (
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => onRemoveTool(tool)}
                />
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Available tools section
interface AvailableToolsSectionProps {
  tools: string[];
  onAddTool: (tool: string, category: 'never' | 'always') => void;
  disabled: boolean;
}

function AvailableToolsSection({
  tools,
  onAddTool,
  disabled,
}: AvailableToolsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-600" />
        <Label className="text-sm font-medium">Available Tools</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Add tools listed from the server.
      </p>
      
      {tools.length > 0 ? (
        <div className="space-y-2">
          {tools.map((tool) => (
            <div key={tool} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm font-mono">{tool}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddTool(tool, 'never')}
                  disabled={disabled}
                  className="text-xs"
                >
                  Auto-execute
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddTool(tool, 'always')}
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
  );
}

// Hook for managing approval settings
export function useToolApprovalSettings(initialSettings?: ToolApprovalSettings) {
  const [settings, setSettings] = useState<ToolApprovalSettings>(
    initialSettings || {
      never: { tool_names: [] },
      always: { tool_names: [] },
    }
  );

  const addTool = (toolName: string, category: 'never' | 'always') => {
    setSettings(prev => {
      const updated = { ...prev };
      if (!updated[category].tool_names.includes(toolName)) {
        updated[category] = {
          tool_names: [...updated[category].tool_names, toolName]
        };
      }
      return updated;
    });
  };

  const removeTool = (toolName: string, category: 'never' | 'always') => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        tool_names: prev[category].tool_names.filter(name => name !== toolName)
      }
    }));
  };

  const clearCategory = (category: 'never' | 'always') => {
    setSettings(prev => ({
      ...prev,
      [category]: { tool_names: [] }
    }));
  };

  const reset = () => {
    setSettings({
      never: { tool_names: [] },
      always: { tool_names: [] },
    });
  };

  return {
    settings,
    setSettings,
    addTool,
    removeTool,
    clearCategory,
    reset,
  };
}
