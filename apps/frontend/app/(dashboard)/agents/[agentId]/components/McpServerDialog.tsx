"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { Switch } from "@workspace/ui/components/ui/switch";
// Removed unused imports: Card, CardContent, CardHeader, CardTitle, Separator, Shield, Info, Search, Input
import { Loader2, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { McpServer } from "@/hooks/use-workspace-scoped-actions";
import { listAgentMcpTools } from "@/app/actions/workflow";

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpServers: McpServer[];
  loading: boolean;
  onCreateTool: (data: {
    agent_id: string;
    tool_type: 'mcp';
    mcp_server_id: string;
    allowed_tools?: string[];
  }) => Promise<void>;
  agentId: string;
  isCreating: boolean;
  workspaceId: string;
  editMode?: {
    serverId: string;
    selectedTools: string[];
  };
}

export function McpServerDialog({
  open,
  onOpenChange,
  mcpServers,
  loading,
  onCreateTool,
  agentId,
  isCreating,
  workspaceId,
  editMode
}: McpServerDialogProps) {
  const [selectedMcpServerId, setSelectedMcpServerId] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [toolApprovalSettings, setToolApprovalSettings] = useState<Record<string, boolean>>({}); // true = requires approval, false = auto-approved
  const [listedTools, setListedTools] = useState<string[]>([]);
  const [isListing, setIsListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or initialize edit mode
  useEffect(() => {
    if (!open) {
      setSelectedMcpServerId("");
      setSelectedTools(new Set());
      setToolApprovalSettings({});
      setListedTools([]);
      setIsListing(false);
      setListError(null);
    } else if (editMode) {
      // Initialize edit mode
      setSelectedMcpServerId(editMode.serverId);
      setSelectedTools(new Set(editMode.selectedTools));
      // Initialize approval settings for selected tools
      const approvalSettings: Record<string, boolean> = {};
      editMode.selectedTools.forEach(tool => {
        approvalSettings[tool] = false; // Default to auto-approved, can be adjusted
      });
      setToolApprovalSettings(approvalSettings);
    }
  }, [open, editMode]);

  const selectedServer = useMemo(() => {
    return mcpServers.find(s => s.id === selectedMcpServerId);
  }, [mcpServers, selectedMcpServerId]);

  // List tools when server is selected
  useEffect(() => {
    if (selectedMcpServerId && agentId && workspaceId) {
      handleListTools();
    }
  }, [selectedMcpServerId, agentId, workspaceId]);

  const handleListTools = async () => {
    if (!selectedMcpServerId) return;
    
    setIsListing(true);
    setListError(null);
    setListedTools([]);
    
    try {
      const result = await listAgentMcpTools({
        agent_id: agentId,
        mcp_server_id: selectedMcpServerId,
        workspace_id: workspaceId,
      });
      
      if ((result as any)?.success && (result as any)?.tools) {
        const toolNames = (result as any).tools.map((tool: any) => tool.name || tool);
        setListedTools(toolNames);
      } else {
        setListError((result as any)?.error || "Failed to list tools");
        setListedTools([]);
      }
    } catch (error) {
      console.error("Failed to list tools:", error);
      setListError("Failed to list tools from this integration");
      setListedTools([]);
    } finally {
      setIsListing(false);
    }
  };

  const availableTools = useMemo(() => {
    // Prefer listed tools, fallback to server approval settings
    if (listedTools.length > 0) {
      return listedTools;
    }
    
    if (!selectedServer?.require_approval) return [];
    
    const approval = selectedServer.require_approval;
    const neverTools = approval.never?.tool_names || [];
    const alwaysTools = approval.always?.tool_names || [];
    
    return [...new Set([...neverTools, ...alwaysTools])];
  }, [listedTools, selectedServer]);

  const getToolApprovalStatus = (toolName: string): 'never' | 'always' | 'unknown' => {
    if (!selectedServer?.require_approval) return 'unknown';
    
    const approval = selectedServer.require_approval;
    
    if (approval.never?.tool_names?.includes(toolName)) return 'never';
    if (approval.always?.tool_names?.includes(toolName)) return 'always';
    
    return 'unknown';
  };

  const handleToolToggle = (toolName: string, checked: boolean) => {
    const newSelected = new Set(selectedTools);
    if (checked) {
      newSelected.add(toolName);
      // Set default approval based on server settings
      const defaultApproval = getToolApprovalStatus(toolName) === 'always';
      setToolApprovalSettings(prev => ({ ...prev, [toolName]: defaultApproval }));
    } else {
      newSelected.delete(toolName);
      setToolApprovalSettings(prev => {
        const newSettings = { ...prev };
        delete newSettings[toolName];
        return newSettings;
      });
    }
    setSelectedTools(newSelected);
  };

  const handleApprovalToggle = (toolName: string, requiresApproval: boolean) => {
    setToolApprovalSettings(prev => ({ ...prev, [toolName]: requiresApproval }));
  };

  // Removed unused handleSelectAll and handleSelectNone functions

  const handleCreate = async () => {
    if (!selectedMcpServerId) return;

    const toolsArray = Array.from(selectedTools);
    
    await onCreateTool({
      agent_id: agentId,
      tool_type: 'mcp',
      mcp_server_id: selectedMcpServerId,
      allowed_tools: toolsArray.length > 0 ? toolsArray : undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit tools from integration' : 'Add tools from integration'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* MCP Server Selection */}
          <div className="space-y-2">
            <Label>Integration</Label>
            <Select 
              value={selectedMcpServerId} 
              onValueChange={setSelectedMcpServerId}
              disabled={loading || !!editMode}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Loading integrations..." : "Select an integration"} />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </SelectItem>
                ) : (
                  mcpServers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center gap-2">
                        <span>{server.server_label}</span>
                        {server.server_description && (
                          <span className="text-xs text-muted-foreground max-w-48 truncate">
                            - {server.server_description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tool Selection */}
          {selectedServer && (
            <div className="space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select tools</Label>
                </div>
              </div>

              {isListing ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>Listing available tools...</p>
                </div>
              ) : listError ? (
                <div className="text-center py-8 text-destructive">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">List failed</p>
                  <p className="text-sm mt-1">{listError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleListTools}
                    className="mt-3"
                  >
                    Try again
                  </Button>
                </div>
              ) : availableTools.length > 0 ? (
                  <>


                    {/* Tools List */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      { 
                        availableTools.map((tool) => {
                          const approvalStatus = getToolApprovalStatus(tool);
                          const isSelected = selectedTools.has(tool);
                          const requiresApproval = toolApprovalSettings[tool] ?? (approvalStatus === 'always');
                          
                          return (
                            <div
                              key={tool}
                              className={`p-4 border rounded-lg transition-all cursor-pointer ${
                                isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30'
                              }`}
                              onClick={() => handleToolToggle(tool, !isSelected)}
                            >
                              {/* Main tool selection */}
                              <div className="space-y-3">
                                {/* Top row with checkbox, tool name, and switch */}
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={`tool-${tool}`}
                                    checked={isSelected}
                                    onChange={() => {}} // Controlled by row click
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="font-medium">{tool}</span>
                                  </div>
                                  {/* Approval toggle - only show when selected */}
                                  {isSelected && (
                                    <div 
                                      className="flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      
                                      <Label htmlFor={`approval-${tool}`} className="text-sm flex items-center gap-1">
                                        {requiresApproval ? 
                                          <><ShieldAlert className="h-3 w-3 text-yellow-500" />Requires approval</> : 
                                          <><ShieldCheck className="h-3 w-3 text-green-600" />Auto-approved</>
                                        }
                                      </Label>
                                      <Switch
                                        id={`approval-${tool}`}
                                        checked={requiresApproval}
                                        onCheckedChange={(checked) => 
                                          handleApprovalToggle(tool, checked)
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p>No tool information available for this server</p>
                    <p className="text-xs mt-1">You can still add it - all tools will be available by default</p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleCreate}
            disabled={isCreating || !selectedMcpServerId || selectedTools.size === 0}
          >
            {isCreating ? "Adding..." : "Add"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
