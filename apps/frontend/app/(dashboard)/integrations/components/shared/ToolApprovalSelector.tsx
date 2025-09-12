"use client";

import { Button } from "@workspace/ui/components/ui/button";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

export interface ToolApprovalSettings {
  never: string[];
  always: string[];
}

interface ToolApprovalSelectorProps {
  listedTools: string[];
  currentSettings: ToolApprovalSettings;
  onSettingsChange: (settings: ToolApprovalSettings) => void;
}

export function ToolApprovalSelector({
  listedTools,
  currentSettings,
  onSettingsChange,
}: ToolApprovalSelectorProps) {
  const sortedTools = useMemo(() => {
    // Get configured tools first (never and always)
    const configuredTools = [
      ...currentSettings.never.map(tool => ({ name: tool, type: 'never' as const })),
      ...currentSettings.always.map(tool => ({ name: tool, type: 'always' as const }))
    ];

    // Get unconfigured tools
    const unconfiguredTools = listedTools
      .filter(tool => 
        !currentSettings.never.includes(tool) && 
        !currentSettings.always.includes(tool)
      )
      .map(tool => ({ name: tool, type: null }));

    return [...configuredTools, ...unconfiguredTools];
  }, [listedTools, currentSettings]);

  const handleToolSettingChange = (toolName: string, setting: 'never' | 'always') => {
    const isCurrentlyNever = currentSettings.never.includes(toolName);
    const isCurrentlyAlways = currentSettings.always.includes(toolName);

    const newSettings = { ...currentSettings };

    if (setting === 'never') {
      if (isCurrentlyNever) {
        // Clicking never again - deactivate
        newSettings.never = newSettings.never.filter(t => t !== toolName);
      } else {
        // Set to never (remove from always if it was there)
        newSettings.never = [...newSettings.never.filter(t => t !== toolName), toolName];
        newSettings.always = newSettings.always.filter(t => t !== toolName);
      }
    } else if (setting === 'always') {
      if (isCurrentlyAlways) {
        // Clicking always again - deactivate
        newSettings.always = newSettings.always.filter(t => t !== toolName);
      } else {
        // Set to always (remove from never if it was there)
        newSettings.always = [...newSettings.always.filter(t => t !== toolName), toolName];
        newSettings.never = newSettings.never.filter(t => t !== toolName);
      }
    }

    onSettingsChange(newSettings);
  };

  if (listedTools.length === 0) {
    return null;
  }

  const configuredCount = currentSettings.never.length + currentSettings.always.length;

  return (
    <div className="space-y-4">
      {configuredCount > 0 && (
        <div className="text-sm">
          {configuredCount} tool{configuredCount !== 1 ? 's' : ''} selected
        </div>
      )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            {sortedTools.map(({ name: tool }) => {
              const isNever = currentSettings.never.includes(tool);
              const isAlways = currentSettings.always.includes(tool);
              const isConfigured = isNever || isAlways;

              return (
                <div 
                  key={tool} 
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isConfigured ? 'bg-card border-border' : 'bg-muted/30 border-none'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs line-clamp-1 truncate max-w-[150px]">{tool}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isNever ? 'secondary' : 'ghost'}
                      onClick={() => handleToolSettingChange(tool, 'never')}
                      className="h-8 px-3 text-xs"
                    >
                      <ShieldAlert className="h-4 w-4 text-yellow-500" />
                      auto-approved
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isAlways ? 'secondary' : 'ghost'}
                      onClick={() => handleToolSettingChange(tool, 'always')}
                      className="h-8 px-3 text-xs"
                    >
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      requires approval
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
    </div>
  );
}
