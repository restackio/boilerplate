"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Trash2, Edit3, Check, X, Wrench, Globe, Code, Image, Plug, Plus } from "lucide-react";

export type ToolType = 'web_search' | 'mcp' | 'code_interpreter' | 'image_generation' | 'custom';

export interface GenericTool {
  id: string;
  type: ToolType;
  name?: string;
  description?: string;
  enabled?: boolean;
  metadata?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ToolsManagerProps {
  /** Array of tools to display */
  tools: GenericTool[];
  /** Callback when tool description is updated */
  onUpdateTool?: (toolId: string, updates: Partial<GenericTool>) => Promise<void>;
  /** Callback when tool is deleted */
  onDeleteTool?: (toolId: string) => Promise<void>;
  /** Callback when tools list changes (for refresh) */
  onToolsChange?: () => Promise<void>;
  /** Whether the tools are read-only */
  isReadOnly?: boolean;
  /** Custom tool type configurations */
  toolTypeConfig?: Record<string, { icon: React.ComponentType<any>; label: string }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Whether to show description editing for certain tool types */
  allowDescriptionEdit?: (toolType: ToolType) => boolean;
  /** Custom empty state message */
  emptyStateMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

const defaultToolTypeConfig = {
  web_search: { icon: Globe, label: 'Web Search' },
  mcp: { icon: Plug, label: 'MCP' },
  code_interpreter: { icon: Code, label: 'Code' },
  image_generation: { icon: Image, label: 'Images' },
  custom: { icon: Wrench, label: 'Custom' },
};

export function ToolsManager({
  tools,
  onUpdateTool,
  onDeleteTool,
  onToolsChange,
  isReadOnly = false,
  toolTypeConfig = defaultToolTypeConfig,
  allowDescriptionEdit = (type) => type === 'mcp' || type === 'custom',
  emptyStateMessage = "No tools configured",
  className = ""
}: ToolsManagerProps) {
  // Description editing state
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  const [isEditingDescription, setIsEditingDescription] = useState<Record<string, boolean>>({});

  const getToolIcon = (type: ToolType) => {
    const config = toolTypeConfig[type] || defaultToolTypeConfig.custom;
    const IconComponent = config.icon;
    return <IconComponent className="h-3 w-3" />;
  };

  const getToolLabel = (type: ToolType) => {
    const config = toolTypeConfig[type] || defaultToolTypeConfig.custom;
    return config.label;
  };

  const handleEditDescription = (toolId: string, currentDescription: string) => {
    setEditingDescriptions(prev => ({ ...prev, [toolId]: currentDescription || '' }));
    setIsEditingDescription(prev => ({ ...prev, [toolId]: true }));
  };

  const handleSaveDescription = async (toolId: string) => {
    try {
      const newDescription = editingDescriptions[toolId];
      await onUpdateTool?.(toolId, { description: newDescription || undefined });
      setIsEditingDescription(prev => ({ ...prev, [toolId]: false }));
      await onToolsChange?.();
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
      await onDeleteTool?.(toolId);
      await onToolsChange?.();
    } catch (error) {
      console.error("Failed to delete tool:", error);
    }
  };

  if (tools.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        {emptyStateMessage}
      </p>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {tools.map((tool) => (
        <div 
          key={tool.id} 
          className="p-3 border rounded-lg space-y-3 bg-muted/20"
        >
          {/* Tool header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1 flex-shrink-0"
              >
                {getToolIcon(tool.type)}
                <span className="text-xs">{getToolLabel(tool.type)}</span>
              </Badge>
              {tool.name && (
                <span className="text-sm font-medium truncate">
                  {tool.name}
                </span>
              )}
              {tool.metadata?.serverLabel && (
                <span className="text-sm text-muted-foreground truncate">
                  ({tool.metadata.serverLabel})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Edit description button */}
              {allowDescriptionEdit(tool.type) && !isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditDescription(tool.id, tool.description || '')}
                  disabled={isEditingDescription[tool.id]}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              {onDeleteTool && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tool.id)}
                  className="text-destructive hover:text-destructive flex-shrink-0 h-8 w-8 p-0"
                  disabled={isReadOnly}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Description section */}
          {allowDescriptionEdit(tool.type) && (
            <div className="space-y-2">
              {isEditingDescription[tool.id] ? (
                // Editing mode
                <div className="space-y-2">
                  <Label htmlFor={`description-${tool.id}`} className="text-sm font-medium">
                    Tool Description
                  </Label>
                  <Textarea
                    id={`description-${tool.id}`}
                    placeholder="Describe what this tool does..."
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
                    {tool.description || 'No description provided'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export interface ToolsActionsProps {
  /** Available tool types to choose from */
  availableTypes?: ToolType[];
  /** Callback when a tool type is selected */
  onChooseType?: (type: ToolType) => Promise<void>;
  /** Function to check if a tool type already exists */
  hasType?: (type: ToolType) => boolean;
  /** Whether tool creation is in progress */
  isCreating?: boolean;
  /** Whether the actions are read-only */
  isReadOnly?: boolean;
  /** Custom tool type configurations */
  toolTypeConfig?: Record<string, { icon: React.ComponentType<any>; label: string }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Additional CSS classes */
  className?: string;
}

const defaultAvailableTypes: ToolType[] = ['web_search', 'code_interpreter', 'image_generation'];

export function ToolsActions({
  availableTypes = defaultAvailableTypes,
  onChooseType,
  hasType,
  isCreating = false,
  isReadOnly = false,
  toolTypeConfig = defaultToolTypeConfig,
  className = ""
}: ToolsActionsProps) {
  if (isReadOnly) {
    return (
      <div className={`p-4 bg-muted/50 rounded-lg border border-dashed ${className}`}>
        <p className="text-sm text-muted-foreground text-center">
          🔒 Tools cannot be modified in read-only mode
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {availableTypes.map((type) => {
        const config = toolTypeConfig[type] || defaultToolTypeConfig.custom;
        const IconComponent = config.icon;
        
        return (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => onChooseType?.(type)}
            disabled={hasType?.(type) || isCreating}
            className="w-full justify-start h-8"
          >
            <Plus className="h-3 w-3 mr-2" />
            <IconComponent className="h-3 w-3 mr-2" />
            <span>{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
