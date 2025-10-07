"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import { Trash2, Edit3, Check, X, Wrench, Globe, Code, Image, Plug } from "lucide-react";
import { updateAgentTool, deleteAgentTool } from "@/app/actions/workflow";
import { SubagentsInline } from "./subagents-inline";

export type ToolType = 'web_search' | 'mcp' | 'code_interpreter' | 'image_generation';

export interface AgentToolRecord {
  id: string;
  agent_id: string;
  tool_type: ToolType;
  mcp_server_id?: string;
  tool_name?: string;
  custom_description?: string;
  require_approval?: boolean;
  config?: Record<string, unknown>;
  allowed_tools?: string[];
  execution_order?: number;
  enabled?: boolean;
  mcp_server_label?: string; // Enriched from server data
}

interface ToolsListProps {
  tools: AgentToolRecord[];
  onToolsChange: () => Promise<void>;
  isReadOnly?: boolean;
  agentType?: "interactive" | "pipeline";
  agentId?: string;
  workspaceId?: string;
}

const getToolIcon = (type: ToolType) => {
  switch (type) {
    case 'web_search': return <Globe className="h-3 w-3" />;
    case 'mcp': return <Plug className="h-3 w-3" />;
    case 'code_interpreter': return <Code className="h-3 w-3" />;
    case 'image_generation': return <Image className="h-3 w-3" />;
    default: return <Wrench className="h-3 w-3" />;
  }
};


export function ToolsList({ tools, onToolsChange, isReadOnly = false, agentType, agentId, workspaceId }: ToolsListProps) {
  // Description editing state
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  const [isEditingDescription, setIsEditingDescription] = useState<Record<string, boolean>>({});

  // Check if a tool can be deleted
  const canDeleteTool = (tool: AgentToolRecord): boolean => {
    // For pipeline agents, prevent deletion of transform and load tools
    if (agentType === "pipeline" && tool.tool_type === "mcp") {
      const protectedTools = ["transformdata", "loadintodataset"];
      return !protectedTools.includes(tool.tool_name || "");
    }
    return true;
  };

  const handleEditDescription = (toolId: string, currentDescription: string) => {
    setEditingDescriptions(prev => ({ ...prev, [toolId]: currentDescription || '' }));
    setIsEditingDescription(prev => ({ ...prev, [toolId]: true }));
  };

  const handleSaveDescription = async (toolId: string) => {
    try {
      const newDescription = editingDescriptions[toolId];
      await updateAgentTool({
        agent_tool_id: toolId,
        custom_description: newDescription || null,
      });
      setIsEditingDescription(prev => ({ ...prev, [toolId]: false }));
      await onToolsChange();
    } catch (error) {
      console.error("Failed to update tool description:", error);
    }
  };

  const handleCancelEditDescription = (toolId: string) => {
    setIsEditingDescription(prev => ({ ...prev, [toolId]: false }));
    setEditingDescriptions(prev => {
      const newState = { ...prev };
      delete newState[toolId];
      return newState;
    });
  };

  const handleDelete = async (toolId: string) => {
    try {
      await deleteAgentTool({ agent_tool_id: toolId });
      await onToolsChange();
    } catch (e) {
      console.error("Failed to delete tool", e);
    }
  };

  if (tools.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        No tools configured
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tools.map((tool) => {
        const isCreateSubtaskTool = tool.tool_type === 'mcp' && 
                                   tool.tool_name === 'createsubtask' && 
                                   tool.enabled;
        
        return (
          <div key={tool.id}>
            <div className="p-3 border rounded-lg space-y-3 bg-muted/20">
              {/* Tool header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-1 flex-shrink-0"
                  >
                    {getToolIcon(tool.tool_type)}
                  </Badge>
                  {tool.tool_type === 'mcp' && tool.tool_name && (
                    <span className="text-sm font-medium">
                      {tool.tool_name}
                    </span>
                  )}
                  {tool.tool_type === 'mcp' && tool.mcp_server_label && (
                    <span className="text-sm text-muted-foreground truncate">
                      ({tool.mcp_server_label})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Edit description button - only for MCP tools */}
                  {tool.tool_type === 'mcp' && !isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDescription(tool.id, tool.custom_description || '')}
                      disabled={isEditingDescription[tool.id]}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tool.id)}
                    className="text-destructive hover:text-destructive flex-shrink-0 h-8 w-8 p-0"
                    disabled={isReadOnly || !canDeleteTool(tool)}
                    title={
                      !canDeleteTool(tool) 
                        ? "This tool is required for pipeline agents and cannot be removed" 
                        : undefined
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Description section - only for MCP tools */}
              {tool.tool_type === 'mcp' && (
                <div className="space-y-2">
                  {isEditingDescription[tool.id] ? (
                    // Editing mode
                    <div className="space-y-2">
                      <Label htmlFor={`description-${tool.id}`} className="text-sm font-medium">
                        Tool Description
                      </Label>
                      <Textarea
                        id={`description-${tool.id}`}
                        placeholder="Describe what this tool does for your agent..."
                        value={editingDescriptions[tool.id] || ''}
                        onChange={(e) => 
                          setEditingDescriptions(prev => ({ 
                            ...prev, 
                            [tool.id]: e.target.value 
                          }))
                        }
                        className="min-h-[80px] text-sm"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveDescription(tool.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelEditDescription(tool.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">
                        {tool.custom_description || 'No description provided'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Show inline subagents manager right after createsubtask tool */}
            {isCreateSubtaskTool && agentId && workspaceId && (
              <SubagentsInline 
                agentId={agentId}
                workspaceId={workspaceId}
                isReadOnly={isReadOnly}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
