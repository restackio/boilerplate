"use client";

import { Button } from "@workspace/ui/components/ui/button";
import { Plus, Globe, Code, Image, Plug } from "lucide-react";
import { ToolType } from "./tools-list";

interface ToolsActionsProps {
  onChooseType: (type: ToolType) => Promise<void>;
  hasType: (type: ToolType) => boolean;
  isCreating: boolean;
  isReadOnly?: boolean;
  availableTypes?: ToolType[];
}

const defaultTypes: ToolType[] = ['web_search', 'code_interpreter', 'image_generation'];

const getToolConfig = (type: ToolType) => {
  switch (type) {
    case 'web_search':
      return { icon: Globe, label: 'Web search' };
    case 'code_interpreter':
      return { icon: Code, label: 'Code interpreter' };
    case 'image_generation':
      return { icon: Image, label: 'Image generation' };
    case 'mcp':
      return { icon: Plug, label: 'Integration tool' };
    default:
      return { icon: Plus, label: type };
  }
};

export function ToolsActions({ 
  onChooseType, 
  hasType, 
  isCreating, 
  isReadOnly = false,
  availableTypes = defaultTypes
}: ToolsActionsProps) {
  if (isReadOnly) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          🔒 Tools cannot be modified for published agents. Create a new draft to make changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Standard tool types */}
      {availableTypes.map((type) => {
        const config = getToolConfig(type);
        const Icon = config.icon;
        
        return (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => onChooseType(type)}
            disabled={hasType(type) || isCreating}
            className="w-full justify-start h-8"
          >
            <Plus className="h-3 w-3 mr-2" />
            <Icon className="h-2 w-2" />
            <span className="ml-2">{config.label}</span>
          </Button>
        );
      })}

      {/* MCP Tools */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChooseType('mcp')}
        disabled={isCreating}
        className="w-full justify-start h-8"
      >
        <Plus className="h-3 w-3 mr-2" />
        <Plug className="h-2 w-2" />
        <span className="ml-2">Integration tool</span>
      </Button>
    </div>
  );
}
