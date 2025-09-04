"use client";

import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { CheckCircle, AlertCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

export interface ToolApprovalSettings {
  never: string[];
  always: string[];
}

interface ToolApprovalSelectorProps {
  discoveredTools: string[];
  currentSettings: ToolApprovalSettings;
  onSettingsChange: (settings: ToolApprovalSettings) => void;
}

export function ToolApprovalSelector({
  discoveredTools,
  currentSettings,
  onSettingsChange,
}: ToolApprovalSelectorProps) {
  const sortedTools = useMemo(() => {
    // Get configured tools first (auto-approve and require-approval)
    const configuredTools = [
      ...currentSettings.never.map(tool => ({ name: tool, type: 'auto' as const })),
      ...currentSettings.always.map(tool => ({ name: tool, type: 'required' as const }))
    ];

    // Get unconfigured tools
    const unconfiguredTools = discoveredTools
      .filter(tool => 
        !currentSettings.never.includes(tool) && 
        !currentSettings.always.includes(tool)
      )
      .map(tool => ({ name: tool, type: null }));

    return [...configuredTools, ...unconfiguredTools];
  }, [discoveredTools, currentSettings]);

  const handleToolSettingChange = (toolName: string, setting: 'auto' | 'required') => {
    const isCurrentlyAuto = currentSettings.never.includes(toolName);
    const isCurrentlyRequired = currentSettings.always.includes(toolName);

    let newSettings = { ...currentSettings };

    if (setting === 'auto') {
      if (isCurrentlyAuto) {
        // Clicking auto again - deactivate
        newSettings.never = newSettings.never.filter(t => t !== toolName);
      } else {
        // Set to auto (remove from required if it was there)
        newSettings.never = [...newSettings.never.filter(t => t !== toolName), toolName];
        newSettings.always = newSettings.always.filter(t => t !== toolName);
      }
    } else if (setting === 'required') {
      if (isCurrentlyRequired) {
        // Clicking required again - deactivate
        newSettings.always = newSettings.always.filter(t => t !== toolName);
      } else {
        // Set to required (remove from auto if it was there)
        newSettings.always = [...newSettings.always.filter(t => t !== toolName), toolName];
        newSettings.never = newSettings.never.filter(t => t !== toolName);
      }
    }

    onSettingsChange(newSettings);
  };

  if (discoveredTools.length === 0) {
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
            {sortedTools.map(({ name: tool, type }) => {
              const isAuto = currentSettings.never.includes(tool);
              const isRequired = currentSettings.always.includes(tool);
              const isConfigured = isAuto || isRequired;

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
                      variant={isAuto ? 'secondary' : 'ghost'}
                      onClick={() => handleToolSettingChange(tool, 'auto')}
                      className="h-8 px-3 text-xs"
                    >
                      <ShieldAlert className="h-4 w-4 text-yellow-500" />
                      auto-approved
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isRequired ? 'secondary' : 'ghost'}
                      onClick={() => handleToolSettingChange(tool, 'required')}
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
