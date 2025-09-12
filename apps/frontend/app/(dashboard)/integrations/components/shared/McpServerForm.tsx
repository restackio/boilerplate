"use client";

import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Button } from "@workspace/ui/components/ui/button";
import { Loader2, AlertCircle, Wrench } from "lucide-react";
import { listMcpServerTools } from "../../../../actions/workflow";
import { ToolApprovalSelector, ToolApprovalSettings } from "./ToolApprovalSelector";

/** Form data for MCP server configuration */
export interface McpServerFormData {
  server_label: string;
  server_url: string;
  local: boolean;
  server_description: string;
  headers: Record<string, string>;
}

/** State management for MCP tool listing functionality */
export interface ToolListState {
  isListing: boolean;
  listedTools: string[];
  error: string | null;
  hasListed: boolean;
  approvalSettings: ToolApprovalSettings;
}

interface McpServerFormProps {
  formData: McpServerFormData;
  onFormDataChange: (data: McpServerFormData) => void;
  headerInput: string;
  onHeaderInputChange: (value: string) => void;
  toolList: ToolListState;
  onToolListChange: (state: ToolListState) => void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}

export function McpServerForm({
  formData,
  onFormDataChange,
  headerInput,
  onHeaderInputChange,
  toolList,
  onToolListChange,
  isSubmitting = false,
  isDeleting = false,
}: McpServerFormProps) {
  const listTools = async () => {
    // For local servers, we don't need to validate server_url since it uses MCP_URL environment variable
    if (!formData.local && !formData.server_url.trim()) {
      onToolListChange({
        ...toolList,
        error: "Tool listing requires a valid server URL",
        hasListed: true,
      });
      return;
    }

    onToolListChange({
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
          onToolListChange({
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
          
          onToolListChange({
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
      onToolListChange({
        ...toolList,
        isListing: false,
        error: error instanceof Error ? error.message : "Failed to list tools",
        hasListed: true,
      });
    }
  };

  const handleLocalToggle = (checked: boolean) => {
    onFormDataChange({
      ...formData,
      local: checked,
    });
    // Reset tool listing when switching server type
    onToolListChange({
      isListing: false,
      listedTools: [],
      error: null,
      hasListed: false,
      approvalSettings: { never: [], always: [] },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="server_label">Name *</Label>
        <Input
          id="server_label"
          value={formData.server_label}
          onChange={(e) =>
            onFormDataChange({ ...formData, server_label: e.target.value })
          }
          placeholder="e.g., github-workflow"
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="local"
          checked={formData.local}
          onCheckedChange={handleLocalToggle}
        />
        <Label htmlFor="local">Local MCP Server</Label>
      </div>

      {!formData.local && (
        <div>
          <Label htmlFor="server_url">Server URL *</Label>
          <Input
            id="server_url"
            value={formData.server_url}
            onChange={(e) =>
              onFormDataChange({ ...formData, server_url: e.target.value })
            }
            placeholder="https://example.com/mcp"
            required
          />
        </div>
      )}

      {formData.local && (
        <div className="text-sm text-muted-foreground p-3 rounded-md">
          <strong>Local Server:</strong> This server will use environment variables (like MCP_URL) for connection.
          Tool listing will attempt to connect to the local server automatically.
        </div>
      )}

      <div>
        <Label htmlFor="server_description">Description</Label>
        <Textarea
          id="server_description"
          value={formData.server_description}
          onChange={(e) =>
            onFormDataChange({ ...formData, server_description: e.target.value })
          }
          placeholder="Optional description of the MCP server"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="headers">Headers (JSON format)</Label>
        <Textarea
          id="headers"
          value={headerInput}
          onChange={(e) => onHeaderInputChange(e.target.value)}
          placeholder='{"Authorization": "Bearer token"}'
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional headers as JSON object
        </p>
      </div>

      {(formData.local || formData.server_url.trim()) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tools</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={listTools}
              disabled={toolList.isListing || isSubmitting || isDeleting}
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
                      onToolListChange({
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
    </div>
  );
}
