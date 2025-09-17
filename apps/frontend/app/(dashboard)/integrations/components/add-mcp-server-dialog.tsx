"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Loader2 } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { ServerConfigForm, useServerConfig, type ServerConfigData } from "@workspace/ui/components/server-config-form";

interface AddMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMcpServerDialog({ open, onOpenChange, onSuccess }: AddMcpServerDialogProps) {
  const { createMcpServer } = useWorkspaceScopedActions();
  const { workspaceId } = useDatabaseWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    config,
    setConfig,
    headerInput,
    setHeaderInput,
    toolList,
    setToolList,
    validateConfig,
    reset,
  } = useServerConfig();

  // Tool listing handler
  const handleListTools = async (serverConfig: ServerConfigData, headers: Record<string, string>) => {
    // Import the tool listing function
    const { listMcpServerTools } = await import("../../../actions/workflow");
    
    const serverUrl = serverConfig.local ? "placeholder" : serverConfig.server_url.trim();
    const result = await listMcpServerTools(
      serverUrl, 
      headers, 
      serverConfig.local,
      workspaceId,
      undefined // mcpServerId for new server
    );

    if (result && typeof result === "object") {
      const data = result as { success?: boolean; tools_list?: string[]; error?: string };
      if (data.success) {
        return { tools: data.tools_list || [] };
      } else {
        throw new Error(data.error || "Failed to list tools from MCP server");
      }
    } else {
      throw new Error("Invalid response from tool listing service");
    }
  };

  const handleSubmit = async () => {
    const validation = validateConfig();
    if (!validation.isValid) {
      console.error("Validation error:", validation.fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = headerInput.trim() ? JSON.parse(headerInput) : {};
      const result = await createMcpServer({
        server_label: config.server_label,
        server_url: config.server_url,
        local: config.local,
        server_description: config.server_description,
        headers,
        require_approval: toolList.approvalSettings,
      });

      if (result.success) {
        onSuccess?.();
        onOpenChange(false);
        reset();
      } else {
        console.error("Failed to create MCP server:", result.error);
      }
    } catch (error) {
      console.error("Error creating MCP server:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Add New Integration
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-6">
          <div className="flex-1 overflow-y-auto px-1">
            <ServerConfigForm
              formData={config}
              onFormDataChange={setConfig}
              headerInput={headerInput}
              onHeaderInputChange={setHeaderInput}
              toolList={toolList}
              onToolListChange={setToolList}
              isSubmitting={isSubmitting}
              onListTools={handleListTools}
              showLocalOption={true}
              localServerDescription="Tool listing will attempt to connect to the local server automatically."
              variant="full"
              onValidate={validateConfig}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Integration"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}