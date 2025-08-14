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
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Separator } from "@workspace/ui/components/ui/separator";
import { Loader2, Shield, ShieldCheck, AlertTriangle, Info, Search, ShieldAlert } from "lucide-react";
import { Input } from "@workspace/ui/components/ui/input";
import { McpServer } from "@/hooks/use-workspace-scoped-actions";

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
}

export function McpServerDialog({
  open,
  onOpenChange,
  mcpServers,
  loading,
  onCreateTool,
  agentId,
  isCreating
}: McpServerDialogProps) {
  const [selectedMcpServerId, setSelectedMcpServerId] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [showAllTools, setShowAllTools] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedMcpServerId("");
      setSelectedTools(new Set());
      setShowAllTools(false);
    }
  }, [open]);

  const selectedServer = useMemo(() => {
    return mcpServers.find(s => s.id === selectedMcpServerId);
  }, [mcpServers, selectedMcpServerId]);

  const availableTools = useMemo(() => {
    if (!selectedServer?.require_approval) return [];
    
    const approval = selectedServer.require_approval;
    const neverTools = approval.never?.tool_names || [];
    const alwaysTools = approval.always?.tool_names || [];
    
    return [...new Set([...neverTools, ...alwaysTools])];
  }, [selectedServer]);

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
    } else {
      newSelected.delete(toolName);
    }
    setSelectedTools(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedTools(new Set(availableTools));
  };

  const handleSelectNone = () => {
    setSelectedTools(new Set());
  };

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

  const getApprovalIcon = (status: 'never' | 'always' | 'unknown') => {
    switch (status) {
      case 'never':
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'always':
        return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getApprovalLabel = (status: 'never' | 'always' | 'unknown') => {
    switch (status) {
      case 'never':
        return 'auto-approved';
      case 'always':
        return 'requires approval';
      default:
        return 'unknown';
    }
  };

  const getApprovalBadgeVariant = (status: 'never' | 'always' | 'unknown') => {
    switch (status) {
      case 'never':
        return 'outline' as const;
      case 'always':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add MCP Tool</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* MCP Server Selection */}
          <div className="space-y-2">
            <Label>Server</Label>
            <Select 
              value={selectedMcpServerId} 
              onValueChange={setSelectedMcpServerId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading MCP servers..." : "Select an MCP server"} />
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
              <Label>Select tools</Label>

                {availableTools.length > 0 ? (
                  <>


                    {/* Tools List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      { 
                        availableTools.map((tool) => {
                          const approvalStatus = getToolApprovalStatus(tool);
                          const isSelected = selectedTools.has(tool);
                          
                          return (
                            <div
                              key={tool}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handleToolToggle(tool, !isSelected)}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`tool-${tool}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleToolToggle(tool, checked as boolean)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex items-center gap-2">
                                  {getApprovalIcon(approvalStatus)}
                                  <span className="font-medium">{tool}</span>
                                </div>
                              </div>
                              
                              <Badge variant={getApprovalBadgeVariant(approvalStatus)}>
                                {getApprovalLabel(approvalStatus)}
                              </Badge>
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
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add MCP Tool
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
