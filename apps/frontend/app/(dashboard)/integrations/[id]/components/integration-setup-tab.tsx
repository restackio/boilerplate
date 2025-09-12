"use client";

import { useState } from "react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Switch } from "@workspace/ui/components/ui/switch";
import {
  Settings,
  Globe,
  Server,
  Edit,
  Save,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  Wrench,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { McpServer } from "../../../../../hooks/use-workspace-scoped-actions";
import { listMcpServerTools } from "../../../../actions/workflow";

/** Form data for MCP server configuration */
interface McpServerFormData {
  server_label: string;
  server_url: string;
  local: boolean;
  server_description: string;
  headers: Record<string, string>;
}

/** Tool approval settings */
interface ToolApprovalSettings {
  never: string[];
  always: string[];
}

/** State management for MCP tool listing functionality */
interface ToolListState {
  isListing: boolean;
  listedTools: string[];
  error: string | null;
  hasListed: boolean;
  approvalSettings: ToolApprovalSettings;
}

/** Result of MCP server form validation */
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface IntegrationSetupTabProps {
  server: McpServer;
}

// Validation function
function validateMcpServerForm(
  formData: McpServerFormData,
  headerInput: string
): ValidationResult {
  // Validate server label
  if (!formData.server_label.trim()) {
    return { isValid: false, error: "Server label is required" };
  }

  // Validate server URL for non-local servers
  if (!formData.local && !formData.server_url.trim()) {
    return { isValid: false, error: "Server URL is required for remote servers" };
  }

  // Validate headers JSON format
  if (headerInput.trim()) {
    try {
      JSON.parse(headerInput);
    } catch {
      return { isValid: false, error: "Invalid JSON format for headers" };
    }
  }

  return { isValid: true };
}


export function IntegrationSetupTab({ server }: IntegrationSetupTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<McpServerFormData>({
    server_label: server.server_label,
    server_url: server.server_url || "",
    server_description: server.server_description || "",
    local: server.local,
    headers: {},
  });

  const [headerInput, setHeaderInput] = useState("");
  
  const [toolList, setToolList] = useState<ToolListState>({
    isListing: false,
    listedTools: [],
    error: null,
    hasListed: false,
    approvalSettings: {
      never: server.require_approval.never.tool_names || [],
      always: server.require_approval.always.tool_names || [],
    },
  });

  const listTools = async () => {
    // For local servers, we don't need to validate server_url since it uses MCP_URL environment variable
    if (!formData.local && !formData.server_url.trim()) {
      setToolList({
        ...toolList,
        error: "Tool listing requires a valid server URL",
        hasListed: true,
      });
      return;
    }

    setToolList({
      ...toolList,
      isListing: true,
      error: null,
      hasListed: false,
    });

    try {
      // Parse headers
      let parsedHeaders = {};
      if (headerInput.trim()) {
        try {
          parsedHeaders = JSON.parse(headerInput);
        } catch {
          setToolList({
            ...toolList,
            isListing: false,
            error: "Invalid JSON format for headers",
            hasListed: true,
          });
          return;
        }
      }

      // Use backend workflow to list tools
      // For local servers, pass a placeholder URL since the backend will use MCP_URL environment variable
      const serverUrl = formData.local ? "placeholder" : formData.server_url.trim();
      const result = await listMcpServerTools(serverUrl, parsedHeaders, formData.local);

      if (result && typeof result === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result as any;
        if (data.success) {
          const listedTools = data.tools_list || [];
          // Initialize approval settings - new tools start uncategorized
          const currentApproval = toolList.approvalSettings;
          
          setToolList({
            ...toolList,
            isListing: false,
            listedTools,
            error: null,
            hasListed: true,
            approvalSettings: currentApproval,
          });
        } else {
          throw new Error(data.error || "Failed to list tools from MCP server");
        }
      } else {
        throw new Error("Invalid response from tool listing service");
      }
    } catch (error) {
      setToolList({
        ...toolList,
        isListing: false,
        error: error instanceof Error ? error.message : "Failed to list tools",
        hasListed: true,
      });
    }
  };


  const handleSave = async () => {
    const validation = validateMcpServerForm(formData, headerInput);
    if (!validation.isValid) {
      // TODO: Show error message
      console.error("Validation error:", validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement save functionality
      console.log("Saving:", formData, toolList.approvalSettings);
      setIsEditing(false);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      server_label: server.server_label,
      server_url: server.server_url || "",
      server_description: server.server_description || "",
      local: server.local,
      headers: {},
    });
    setHeaderInput("");
    setToolList({
      isListing: false,
      listedTools: [],
      error: null,
      hasListed: false,
      approvalSettings: {
        never: server.require_approval.never.tool_names || [],
        always: server.require_approval.always.tool_names || [],
      },
    });
    setIsEditing(false);
  };

  // Tool Approval Selector Component
  const ToolApprovalSelector = ({ 
    listedTools, 
    currentSettings, 
    onSettingsChange 
  }: {
    listedTools: string[];
    currentSettings: ToolApprovalSettings;
    onSettingsChange: (settings: ToolApprovalSettings) => void;
  }) => {
    const sortedTools = [...listedTools].sort();

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
          {sortedTools.map((tool) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Basic Information
          </CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server_label">Integration Name</Label>
              {isEditing ? (
                <Input
                  id="server_label"
                  value={formData.server_label}
                  onChange={(e) => setFormData({ ...formData, server_label: e.target.value })}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md">{server.server_label}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="local">Integration Type</Label>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Switch
                      id="local"
                      checked={formData.local}
                      onCheckedChange={(checked) => setFormData({ ...formData, local: checked })}
                    />
                    <Label htmlFor="local">{formData.local ? "Local" : "Remote"}</Label>
                  </>
                ) : (
                  <Badge variant={server.local ? "secondary" : "default"}>
                    {server.local ? "Local" : "Remote"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!formData.local && (
            <div className="space-y-2">
              <Label htmlFor="server_url">Server URL</Label>
              {isEditing ? (
                <Input
                  id="server_url"
                  type="url"
                  value={formData.server_url}
                  onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
                  placeholder="https://example.com/mcp"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Globe className="h-4 w-4" />
                  <span className="flex-1">{server.server_url}</span>
                  {server.server_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={server.server_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {formData.local && isEditing && (
            <div className="text-sm text-muted-foreground p-3 rounded-md">
              <strong>Local Server:</strong> This server will use environment variables (like MCP_URL) for connection.
              Tool listing will attempt to connect to the local server automatically.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="server_description">Description</Label>
            {isEditing ? (
              <Textarea
                id="server_description"
                value={formData.server_description}
                onChange={(e) => setFormData({ ...formData, server_description: e.target.value })}
                placeholder="Describe what this integration does..."
                rows={3}
              />
            ) : (
              <div className="p-2 bg-muted rounded-md min-h-[80px]">
                {server.server_description || "No description provided"}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="headers">Headers (JSON format)</Label>
              <Textarea
                id="headers"
                value={headerInput}
                onChange={(e) => setHeaderInput(e.target.value)}
                placeholder='{"Authorization": "Bearer token"}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Optional headers as JSON object
              </p>
            </div>
          )}

          {isEditing && (formData.local || formData.server_url.trim()) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tools</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={listTools}
                  disabled={toolList.isListing || isSubmitting}
                >
                  {toolList.isListing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Listing...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      List Tools
                    </>
                  )}
                </Button>
              </div>

              {toolList.hasListed && (
                <div className="space-y-2">
                  {toolList.error ? (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <strong>Connection failed:</strong>
                        <br />
                        {toolList.error}
                      </div>
                    </div>
                  ) : toolList.listedTools.length > 0 ? (
                    <div className="space-y-3">
                      <ToolApprovalSelector
                        listedTools={toolList.listedTools}
                        currentSettings={toolList.approvalSettings}
                        onSettingsChange={(settings) => 
                          setToolList({
                            ...toolList,
                            approvalSettings: settings,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-700">
                        No tools listed. The server may not expose tool information.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium">Server Connection</div>
                  <div className="text-sm text-muted-foreground">
                    {server.local ? "Local server running" : "Remote server accessible"}
                  </div>
                </div>
              </div>
              <Badge variant="default" className="text-xs">Active</Badge>
            </div>

            {server.created_at && (
              <div className="text-sm text-muted-foreground">
                Created: {new Date(server.created_at).toLocaleDateString()}
              </div>
            )}
            {server.updated_at && (
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(server.updated_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
