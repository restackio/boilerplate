"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Label } from "@workspace/ui/components/ui/label";
import { Input } from "@workspace/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { 
  createAgentTool,
  deleteAgentTool,
  getAgentTools,
  updateAgentTool,
} from "@/app/actions/workflow";

type ToolType = 'web_search'|'computer'|'mcp'|'code_interpreter'|'image_generation';

interface AgentToolRecord {
  id: string;
  agent_id: string;
  tool_type: ToolType;
  mcp_server_id?: string;
  config?: Record<string, unknown>;
  allowed_tools?: string[];
  execution_order?: number;
  enabled?: boolean;
  mcp_server_label?: string;
}

interface Props {
  agentId: string;
}

export function AgentToolsManager({ agentId }: Props) {
  const { mcpServers, fetchMcpServers } = useWorkspaceScopedActions();
  const [tools, setTools] = useState<AgentToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Add dialog state
  const [open, setOpen] = useState(false);
  const [newToolType, setNewToolType] = useState<ToolType | "">("");
  const [selectedMcpServerId, setSelectedMcpServerId] = useState("");
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [customAllowedTool, setCustomAllowedTool] = useState("");

  const hasType = (type: ToolType) => tools.some(t => t.tool_type === type && type !== 'mcp');

  const fetchTools = async () => {
    try {
      const res: any = await getAgentTools(agentId);
      if (res && res.agent_tools) setTools(res.agent_tools);
    } catch (e) {
      console.error("Failed to load tools", e);
    } finally {
      setLoading(false);
    }
  };

  const onChooseType = async (v: ToolType) => {
    setAllowedTools([]);
    setSelectedMcpServerId("");
    setNewToolType(v);
    if (v === "mcp") {
      setOpen(true);
    } else {
      await handleCreate();
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!agentId) return;
      // ensure MCP list is loaded for the selector
      try { await fetchMcpServers(); } catch {}
      await fetchTools();
    };
    void run();
  }, [agentId, fetchMcpServers]);

  const handleAddAllowedTool = () => {
    const v = customAllowedTool.trim();
    if (!v) return;
    if (!allowedTools.includes(v)) setAllowedTools(prev => [...prev, v]);
    setCustomAllowedTool("");
  };

  const handleRemoveAllowedTool = (tool: string) => {
    setAllowedTools(prev => prev.filter(t => t !== tool));
  };

  const mcpOptions = useMemo(() => mcpServers || [], [mcpServers]);

  const handleCreate = async () => {
    if (!newToolType) return;
    if (newToolType === 'mcp' && !selectedMcpServerId) return;

    const payload: any = {
      agent_id: agentId,
      tool_type: newToolType,
    };
    if (newToolType === 'mcp') {
      payload.mcp_server_id = selectedMcpServerId;
      if (allowedTools.length) payload.allowed_tools = allowedTools;
    }

    try {
      setIsCreating(true);
      await createAgentTool(payload);
      await fetchTools();
      setOpen(false);
      setNewToolType("");
      setSelectedMcpServerId("");
      setAllowedTools([]);
    } catch (e) {
      console.error("Failed to create tool", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (toolId: string) => {
    try {
      await deleteAgentTool({ agent_tool_id: toolId });
      await fetchTools();
    } catch (e) {
      console.error("Failed to delete tool", e);
    }
  };

  if (loading) return <div>Loading tools...</div>;

  return (
    <>


        {/* Existing Tools */}
        <div className="space-y-2">
          {tools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tools configured</p>
          ) : (
            tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{tool.tool_type}</Badge>
                  {tool.tool_type === 'mcp' && tool.mcp_server_label && (
                    <span className="text-sm text-muted-foreground">
                      {tool.mcp_server_label}
                    </span>
                  )}
                  {tool.allowed_tools && tool.allowed_tools.length > 0 && (
                    <div className="flex gap-1">
                      {tool.allowed_tools.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tool.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add Tool Section */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(['web_search', 'computer', 'code_interpreter', 'image_generation'] as const).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => onChooseType(type)}
                disabled={hasType(type)}
                className="justify-start"
              >
                <Plus className="h-3 w-3 mr-1" />
                {type.replace('_', ' ')}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChooseType('mcp')}
              className="justify-start"
            >
              <Plus className="h-3 w-3 mr-1" />
              MCP Server
            </Button>
          </div>
        </div>

        {/* MCP Server Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure MCP Server Tool</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>MCP Server</Label>
                <Select value={selectedMcpServerId} onValueChange={setSelectedMcpServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an MCP server" />
                  </SelectTrigger>
                  <SelectContent>
                    {mcpOptions.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.server_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMcpServerId && (
                <div className="space-y-2">
                  <Label>Allowed Tools (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow all tools, or specify specific tools this agent can use.
                  </p>
                  
                  {/* Tool Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter tool name..."
                      value={customAllowedTool}
                      onChange={(e) => setCustomAllowedTool(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddAllowedTool()}
                    />
                    <Button type="button" size="sm" onClick={handleAddAllowedTool}>
                      Add
                    </Button>
                  </div>

                  {/* Selected Tools */}
                  {allowedTools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {allowedTools.map((tool) => (
                        <Badge
                          key={tool}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => handleRemoveAllowedTool(tool)}
                        >
                          {tool} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreate} disabled={isCreating || (newToolType === 'mcp' && !selectedMcpServerId)}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Tool
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
}
