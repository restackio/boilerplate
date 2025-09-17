"use client";

import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2, AlertCircle, Wrench, CheckCircle, XCircle } from "lucide-react";
import { ToolApprovalManager, useToolApprovalSettings } from "./tool-approval-manager";
import { cn } from "../lib/utils";

/** Server configuration data */
export interface ServerConfigData {
  server_label: string;
  server_url: string;
  local: boolean;
  server_description: string;
  headers: Record<string, string>;
}

/** Tool listing state */
export interface ToolListState {
  isListing: boolean;
  listedTools: string[];
  error: string | null;
  hasListed: boolean;
  approvalSettings: {
    never: { tool_names: string[] };
    always: { tool_names: string[] };
  };
}

/** Server form validation result */
export interface ServerValidation {
  isValid: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface ServerConfigFormProps {
  /** Form data */
  formData: ServerConfigData;
  /** Form data change handler */
  onFormDataChange: (data: ServerConfigData) => void;
  /** Headers input (JSON string) */
  headerInput: string;
  /** Headers input change handler */
  onHeaderInputChange: (value: string) => void;
  /** Tool list state */
  toolList: ToolListState;
  /** Tool list change handler */
  onToolListChange: (state: ToolListState) => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Whether form is deleting */
  isDeleting?: boolean;
  /** Custom validation function */
  onValidate?: (data: ServerConfigData, headers: string) => ServerValidation;
  /** Tool listing function */
  onListTools?: (data: ServerConfigData, headers: Record<string, string>) => Promise<{ tools: string[] }>;
  /** Show local server option */
  showLocalOption?: boolean;
  /** Local server description */
  localServerDescription?: string;
  /** Form variant */
  variant?: "full" | "compact";
  /** Custom labels */
  labels?: {
    name?: string;
    url?: string;
    description?: string;
    headers?: string;
    localOption?: string;
  };
  /** Custom placeholders */
  placeholders?: {
    name?: string;
    url?: string;
    description?: string;
    headers?: string;
  };
}

export function ServerConfigForm({
  formData,
  onFormDataChange,
  headerInput,
  onHeaderInputChange,
  toolList,
  onToolListChange,
  isSubmitting = false,
  isDeleting = false,
  onValidate,
  onListTools,
  showLocalOption = true,
  localServerDescription = "This server will use environment variables for connection.",
  variant = "full",
  labels = {},
  placeholders = {},
}: ServerConfigFormProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const defaultLabels = {
    name: "Name",
    url: "Server URL",
    description: "Description",
    headers: "Headers (JSON format)",
    localOption: "Local Server",
    ...labels,
  };

  const defaultPlaceholders = {
    name: "e.g., github-workflow",
    url: "https://example.com/server",
    description: "Optional description of the server",
    headers: '{"Authorization": "Bearer token"}',
    ...placeholders,
  };

  // Tool listing logic
  const listTools = async () => {
    if (!onListTools) return;

    // Validate basic requirements
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

      const result = await onListTools(formData, parsedHeaders);
      
      onToolListChange({
        ...toolList,
        isListing: false,
        listedTools: result.tools,
        error: null,
        hasListed: true,
      });
    } catch (error) {
      onToolListChange({
        ...toolList,
        isListing: false,
        error: error instanceof Error ? error.message : "Failed to list tools",
        hasListed: true,
      });
    }
  };

  // Local server toggle handler
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
      approvalSettings: { never: { tool_names: [] }, always: { tool_names: [] } },
    });
    setValidationErrors({});
  };

  // Field change handlers
  const handleFieldChange = (field: keyof ServerConfigData, value: string | boolean) => {
    const newData = { ...formData, [field]: value };
    onFormDataChange(newData);

    // Clear field-specific validation errors
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    }

    // Run validation if provided
    if (onValidate && typeof value === 'string') {
      const validation = onValidate(newData, headerInput);
      if (!validation.isValid && validation.fieldErrors) {
        setValidationErrors(validation.fieldErrors);
      }
    }
  };

  const handleHeaderChange = (value: string) => {
    onHeaderInputChange(value);
    
    // Clear header validation errors
    if (validationErrors.headers) {
      setValidationErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { headers: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Form field wrapper component
  const FormField = ({ 
    children, 
    title, 
    error 
  }: { 
    children: React.ReactNode; 
    title?: string; 
    error?: string;
  }) => {
    if (variant === "compact") {
      return (
        <div className="space-y-2">
          {children}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      );
    }
    
    return (
      <Card>
        {title && (
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          {children}
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Server Name */}
      <FormField title={variant === "full" ? "Server Information" : undefined} error={validationErrors.server_label}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="server_label">{defaultLabels.name} *</Label>
            <Input
              id="server_label"
              value={formData.server_label}
              onChange={(e) => handleFieldChange('server_label', e.target.value)}
              placeholder={defaultPlaceholders.name}
              className={validationErrors.server_label ? "border-destructive" : ""}
              disabled={isSubmitting || isDeleting}
              required
            />
          </div>

          {/* Local Server Toggle */}
          {showLocalOption && (
            <div className="flex items-center space-x-2">
              <Switch
                id="local"
                checked={formData.local}
                onCheckedChange={handleLocalToggle}
                disabled={isSubmitting || isDeleting}
              />
              <Label htmlFor="local">{defaultLabels.localOption}</Label>
            </div>
          )}
        </div>
      </FormField>

      {/* Server URL (only for non-local servers) */}
      {!formData.local && (
        <FormField error={validationErrors.server_url}>
          <div>
            <Label htmlFor="server_url">{defaultLabels.url} *</Label>
            <Input
              id="server_url"
              value={formData.server_url}
              onChange={(e) => handleFieldChange('server_url', e.target.value)}
              placeholder={defaultPlaceholders.url}
              className={validationErrors.server_url ? "border-destructive" : ""}
              disabled={isSubmitting || isDeleting}
              required
            />
          </div>
        </FormField>
      )}

      {/* Local Server Info */}
      {formData.local && localServerDescription && (
        <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted/50 border">
          <strong>Local Server:</strong> {localServerDescription}
        </div>
      )}

      {/* Description */}
      <FormField error={validationErrors.server_description}>
        <div>
          <Label htmlFor="server_description">{defaultLabels.description}</Label>
          <Textarea
            id="server_description"
            value={formData.server_description}
            onChange={(e) => handleFieldChange('server_description', e.target.value)}
            placeholder={defaultPlaceholders.description}
            className={validationErrors.server_description ? "border-destructive" : ""}
            disabled={isSubmitting || isDeleting}
            rows={3}
          />
        </div>
      </FormField>

      {/* Headers */}
      <FormField error={validationErrors.headers}>
        <div>
          <Label htmlFor="headers">{defaultLabels.headers}</Label>
          <Textarea
            id="headers"
            value={headerInput}
            onChange={(e) => handleHeaderChange(e.target.value)}
            placeholder={defaultPlaceholders.headers}
            className={cn(
              "font-mono text-sm",
              validationErrors.headers && "border-destructive"
            )}
            disabled={isSubmitting || isDeleting}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional headers as JSON object
          </p>
        </div>
      </FormField>

      {/* Tools Section */}
      {onListTools && (formData.local || formData.server_url.trim()) && (
        <FormField title={variant === "full" ? "Tools Configuration" : undefined}>
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
              <ToolListDisplay
                toolList={toolList}
                onToolListChange={onToolListChange}
              />
            )}
          </div>
        </FormField>
      )}
    </div>
  );
}

// Tool list display component
interface ToolListDisplayProps {
  toolList: ToolListState;
  onToolListChange: (state: ToolListState) => void;
}

function ToolListDisplay({ toolList, onToolListChange }: ToolListDisplayProps) {
  if (toolList.error) {
    return (
      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
        <div className="text-sm text-destructive">
          <strong>Connection failed:</strong>
          <br />
          {toolList.error}
        </div>
      </div>
    );
  }

  if (toolList.listedTools.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
        <AlertCircle className="h-4 w-4 text-warning" />
        <span className="text-sm text-warning-foreground">
          No tools listed. The server may not expose tool information.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-md">
        <CheckCircle className="h-4 w-4 text-success" />
        <span className="text-sm text-success-foreground">
          Found {toolList.listedTools.length} tools
        </span>
      </div>

      <ToolApprovalManager
        value={toolList.approvalSettings}
        onChange={(settings) => 
          onToolListChange({
            ...toolList,
            approvalSettings: settings,
          })
        }
        availableTools={toolList.listedTools}
        showAvailableTools={true}
        title="Tool Approval Configuration"
        description="Configure which tools require approval before execution."
      />
    </div>
  );
}

// Hook for managing server configuration
export function useServerConfig(initialData?: Partial<ServerConfigData>) {
  const [config, setConfig] = useState<ServerConfigData>({
    server_label: "",
    server_url: "",
    local: false,
    server_description: "",
    headers: {},
    ...initialData,
  });

  const [headerInput, setHeaderInput] = useState(
    JSON.stringify(initialData?.headers || {}, null, 2)
  );

  const [toolList, setToolList] = useState<ToolListState>({
    isListing: false,
    listedTools: [],
    error: null,
    hasListed: false,
    approvalSettings: { never: { tool_names: [] }, always: { tool_names: [] } },
  });

  const { settings: approvalSettings, setSettings: setApprovalSettings } = useToolApprovalSettings();

  const updateConfig = (updates: Partial<ServerConfigData>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const validateConfig = (): ServerValidation => {
    const errors: Record<string, string> = {};

    if (!config.server_label.trim()) {
      errors.server_label = "Server name is required";
    }

    if (!config.local && !config.server_url.trim()) {
      errors.server_url = "Server URL is required for non-local servers";
    }

    if (headerInput.trim()) {
      try {
        JSON.parse(headerInput);
      } catch {
        errors.headers = "Invalid JSON format";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      fieldErrors: errors,
    };
  };

  const reset = () => {
    setConfig({
      server_label: "",
      server_url: "",
      local: false,
      server_description: "",
      headers: {},
    });
    setHeaderInput("{}");
    setToolList({
      isListing: false,
      listedTools: [],
      error: null,
      hasListed: false,
      approvalSettings: { never: { tool_names: [] }, always: { tool_names: [] } },
    });
  };

  return {
    config,
    setConfig,
    updateConfig,
    headerInput,
    setHeaderInput,
    toolList,
    setToolList,
    approvalSettings,
    setApprovalSettings,
    validateConfig,
    reset,
  };
}
