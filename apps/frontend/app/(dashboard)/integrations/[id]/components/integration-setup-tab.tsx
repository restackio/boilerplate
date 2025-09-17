"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Switch } from "@workspace/ui/components/ui/switch";
import { NotificationBanner } from "@workspace/ui/components/notification-banner";
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

/** Result of MCP server form validation */
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface IntegrationSetupTabProps {
  server: McpServer;
  onDataChange?: (data: {
    formData: McpServerFormData;
    headerInput: string;
  }) => void;
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

export function IntegrationSetupTab({ server, onDataChange }: IntegrationSetupTabProps) {
  const [formData, setFormData] = useState<McpServerFormData>({
    server_label: server.server_label,
    server_url: server.server_url || "",
    server_description: server.server_description || "",
    local: server.local,
    headers: {},
  });

  const [headerInput, setHeaderInput] = useState("");
  const [connectionTest, setConnectionTest] = useState<{
    isLoading: boolean;
    result: 'success' | 'error' | null;
    message: string;
  }>({
    isLoading: false,
    result: null,
    message: "",
  });

  // Notify parent of data changes
  const notifyParentOfChanges = (newFormData?: McpServerFormData, newHeaderInput?: string) => {
    if (onDataChange) {
      onDataChange({
        formData: newFormData || formData,
        headerInput: newHeaderInput !== undefined ? newHeaderInput : headerInput,
      });
    }
  };

  const testConnection = async () => {
    const validation = validateMcpServerForm(formData, headerInput);
    if (!validation.isValid) {
      setConnectionTest({
        isLoading: false,
        result: 'error',
        message: validation.error || "Invalid configuration",
      });
      return;
    }

    setConnectionTest({
      isLoading: true,
      result: null,
      message: "Testing connection...",
    });

    try {
      // Parse headers
      let parsedHeaders = {};
      if (headerInput.trim()) {
        try {
          parsedHeaders = JSON.parse(headerInput);
        } catch {
          setConnectionTest({
            isLoading: false,
            result: 'error',
            message: "Invalid JSON format for headers",
          });
          return;
        }
      }

      // Test connection by listing tools
      const serverUrl = formData.local ? "placeholder" : formData.server_url.trim();
      const result = await listMcpServerTools(
        serverUrl, 
        parsedHeaders, 
        formData.local,
        server.workspace_id,
        server.id
      );

      if (result && typeof result === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result as any;
        if (data.success) {
          const toolCount = data.tools_list?.length || 0;
          setConnectionTest({
            isLoading: false,
            result: 'success',
            message: `Connection successful! Found ${toolCount} available tools.`,
          });
        } else {
          throw new Error(data.error || "Failed to connect to MCP server");
        }
      } else {
        throw new Error("Invalid response from MCP server");
      }
    } catch (error) {
      setConnectionTest({
        isLoading: false,
        result: 'error',
        message: error instanceof Error ? error.message : "Failed to connect to MCP server",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Configuration */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="server_label">Integration Name</Label>
            <Input
              id="server_label"
              value={formData.server_label}
              onChange={(e) => {
                const newFormData = { ...formData, server_label: e.target.value };
                setFormData(newFormData);
                notifyParentOfChanges(newFormData);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="local">Integration Type</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="local"
                checked={formData.local}
                onCheckedChange={(checked) => {
                  const newFormData = { ...formData, local: checked };
                  setFormData(newFormData);
                  notifyParentOfChanges(newFormData);
                }}
              />
              <Label htmlFor="local">{formData.local ? "Local" : "Remote"}</Label>
            </div>
          </div>
        </div>

        {!formData.local && (
          <div className="space-y-2">
            <Label htmlFor="server_url">Server URL</Label>
            <Input
              id="server_url"
              type="url"
              value={formData.server_url}
              onChange={(e) => {
                const newFormData = { ...formData, server_url: e.target.value };
                setFormData(newFormData);
                notifyParentOfChanges(newFormData);
              }}
              placeholder="https://example.com/mcp"
            />
          </div>
        )}

        {formData.local && (
          <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
            <strong>Local Server:</strong> This server will use environment variables (like MCP_URL) for connection.
            The connection test will attempt to connect to the local server automatically.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="server_description">Description</Label>
          <Textarea
            id="server_description"
            value={formData.server_description}
            onChange={(e) => {
              const newFormData = { ...formData, server_description: e.target.value };
              setFormData(newFormData);
              notifyParentOfChanges(newFormData);
            }}
            placeholder="Describe what this integration does..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="headers">Headers (JSON format)</Label>
          <Textarea
            id="headers"
            value={headerInput}
            onChange={(e) => {
              setHeaderInput(e.target.value);
              notifyParentOfChanges(undefined, e.target.value);
            }}
            placeholder='{"Authorization": "Bearer token"}'
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Optional headers as JSON object for authentication
          </p>
        </div>
      </div>

      {/* Connection Test */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Connection Test</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={connectionTest.isLoading}
          >
            {connectionTest.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Testing...
              </>
            ) : (
              <>
                Test Connection
              </>
            )}
          </Button>
        </div>

        {connectionTest.result && (
              <NotificationBanner
                variant={connectionTest.result === 'success' ? 'success' : 'error'}
                title={connectionTest.result === 'success' ? 'Connection Successful' : 'Connection Failed'}
                description={connectionTest.message}
                dismissible={false}
              />
        )}
      </div>

      {/* Tool Management Notice */}
      <NotificationBanner
        variant="info"
        title="Tool Management"
        description="Tools from this integration can now be configured individually for each agent. Go to an agent's setup page to discover and configure tools with custom descriptions and approval settings."
        dismissible={false}
      />
    </div>
  );
}


