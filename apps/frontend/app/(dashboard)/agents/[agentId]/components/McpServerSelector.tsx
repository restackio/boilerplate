"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Label } from "@workspace/ui/components/ui/label";
import { Input } from "@workspace/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import {
  Plus,
  Trash2,
  Server,
} from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { 
  createAgentMcpServer, 
  deleteAgentMcpServer, 
  getAgentMcpServers 
} from "@/app/actions/workflow";

interface AgentMcpServer {
  id: string;
  agent_id: string;
  mcp_server_id: string;
  allowed_tools?: string[];
  created_at?: string;
  mcp_server_label?: string;
  mcp_server_url?: string;
}

interface McpServerSelectorProps {
  agentId: string;
  workspaceId: string;
  onMcpServersChange: (mcpServers: AgentMcpServer[]) => void;
}

export function McpServerSelector({ agentId, workspaceId, onMcpServersChange }: McpServerSelectorProps) {
  void workspaceId; // Suppress unused warning
  const { mcpServers, fetchMcpServers } = useWorkspaceScopedActions();
  const [agentMcpServers, setAgentMcpServers] = useState<AgentMcpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMcpServerId, setSelectedMcpServerId] = useState("");
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [customTool, setCustomTool] = useState("");
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [selectedAvailableTool, setSelectedAvailableTool] = useState("");

  // Load available MCP servers
  useEffect(() => {
    const loadMcpServers = async () => {
      try {
        await fetchMcpServers();
      } catch (error) {
        console.error("Error loading MCP servers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMcpServers();
  }, [fetchMcpServers]);

  // Load agent's MCP servers
  useEffect(() => {
    const loadAgentMcpServers = async () => {
      try {
        const result = await getAgentMcpServers(agentId);
        if (result && result.agent_mcp_servers) {
          setAgentMcpServers(result.agent_mcp_servers);
        }
      } catch (error) {
        console.error("Error loading agent MCP servers:", error);
      }
    };

    if (agentId) {
      loadAgentMcpServers();
    }
  }, [agentId]);

  // Load available tools when MCP server is selected
  useEffect(() => {
    if (selectedMcpServerId) {
      const selectedServer = mcpServers.find(s => s.id === selectedMcpServerId);
      if (selectedServer?.require_approval) {
        const approval = selectedServer.require_approval as any;
        const neverTools = approval?.never?.tool_names || [];
        const alwaysTools = approval?.always?.tool_names || [];
        const allTools = [...new Set([...neverTools, ...alwaysTools])];
        setAvailableTools(allTools);
      }
    } else {
      setAvailableTools([]);
    }
  }, [selectedMcpServerId, mcpServers]);

  const handleAddMcpServer = async () => {
    if (!selectedMcpServerId) return;

    try {
      const result = await createAgentMcpServer({
        agent_id: agentId,
        mcp_server_id: selectedMcpServerId,
        allowed_tools: allowedTools.length > 0 ? allowedTools : undefined,
      });

      if (result && (result as any).agent_tool) {
        const newAgentMcpServer = (result as any).agent_tool;
        const updatedAgentMcpServers = [...agentMcpServers, newAgentMcpServer];
        setAgentMcpServers(updatedAgentMcpServers);
        onMcpServersChange(updatedAgentMcpServers);
        
        // Reset form
        setSelectedMcpServerId("");
        setAllowedTools([]);
        setAvailableTools([]);
        setSelectedAvailableTool("");
        setCustomTool("");
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error adding MCP server:", error);
    }
  };

  const handleRemoveMcpServer = async (agentMcpServerId: string) => {
    try {
      await deleteAgentMcpServer(agentMcpServerId);
      const updatedAgentMcpServers = agentMcpServers.filter(
        (ams) => ams.id !== agentMcpServerId
      );
      setAgentMcpServers(updatedAgentMcpServers);
      onMcpServersChange(updatedAgentMcpServers);
    } catch (error) {
      console.error("Error removing MCP server:", error);
    }
  };

  const addCustomTool = () => {
    if (customTool.trim() && !allowedTools.includes(customTool.trim())) {
      setAllowedTools([...allowedTools, customTool.trim()]);
      setCustomTool("");
    }
  };

  const addAvailableTool = () => {
    if (selectedAvailableTool && !allowedTools.includes(selectedAvailableTool)) {
      setAllowedTools([...allowedTools, selectedAvailableTool]);
      setSelectedAvailableTool("");
    }
  };

  const removeTool = (tool: string) => {
    setAllowedTools(allowedTools.filter((t) => t !== tool));
  };

  const getMcpServerById = (mcpServerId: string) => {
    return mcpServers.find((mcp) => mcp.id === mcpServerId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MCP Servers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading MCP servers...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          MCP Servers & Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current MCP Servers */}
        <div className="space-y-3">
          <Label>Connected MCP Servers</Label>
          {agentMcpServers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              No MCP servers connected to this agent.
            </div>
          ) : (
            <div className="space-y-2">
              {agentMcpServers.map((agentMcpServer) => {
                const mcpServer = getMcpServerById(agentMcpServer.mcp_server_id);
                return (
                  <div
                    key={agentMcpServer.id}
                    className="border rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {mcpServer?.server_label || agentMcpServer.mcp_server_label}
                        </h4>
                        <Badge
                          variant={(mcpServer?.require_approval as any)?.always ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {(mcpServer?.require_approval as any)?.always ? "Approval Required" : "Auto"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mcpServer?.server_description || "No description"}
                      </p>
                      {agentMcpServer.allowed_tools && agentMcpServer.allowed_tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agentMcpServer.allowed_tools.map((tool) => (
                            <Badge key={tool} variant="outline" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMcpServer(agentMcpServer.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add MCP Server Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add MCP Server
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select MCP Server</Label>
                <Select value={selectedMcpServerId} onValueChange={setSelectedMcpServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an MCP server..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mcpServers
                      .filter((mcp) => !agentMcpServers.some((ams) => ams.mcp_server_id === mcp.id))
                      .map((mcp) => (
                        <SelectItem key={mcp.id} value={mcp.id}>
                          <div className="flex items-center gap-2">
                            {mcp.server_label}
                            <Badge variant="outline" className="text-xs">
                              {(mcp.require_approval as any)?.always ? "Approval" : "Auto"}
                            </Badge>
                          </div>
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
                  
                  {/* Available Tools Dropdown */}
                  {availableTools.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Select from available tools</Label>
                      <div className="flex gap-2">
                        <Select value={selectedAvailableTool} onValueChange={setSelectedAvailableTool}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Choose a tool..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTools
                              .filter(tool => !allowedTools.includes(tool))
                              .map((tool) => (
                                <SelectItem key={tool} value={tool}>
                                  {tool}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={addAvailableTool}
                          disabled={!selectedAvailableTool}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Custom Tool Input */}
                  <div className="space-y-2">
                    <Label className="text-xs">Or enter custom tool name</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter tool name..."
                        value={customTool}
                        onChange={(e) => setCustomTool(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addCustomTool()}
                      />
                      <Button type="button" size="sm" onClick={addCustomTool}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Selected Tools */}
                  {allowedTools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {allowedTools.map((tool) => (
                        <Badge
                          key={tool}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => removeTool(tool)}
                        >
                          {tool} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMcpServer}
                  disabled={!selectedMcpServerId}
                  className="flex-1"
                >
                  Add Server
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 