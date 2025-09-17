"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Loader2 } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { McpServerForm, McpServerFormData, ToolListState } from "./shared/McpServerForm";
import { validateMcpServerForm, parseHeaders } from "./shared/mcpServerValidation";

interface AddMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMcpServerDialog({ open, onOpenChange, onSuccess }: AddMcpServerDialogProps) {
  const { createMcpServer } = useWorkspaceScopedActions();
  const { workspaceId } = useDatabaseWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<McpServerFormData>({
    server_label: "",
    server_url: "",
    local: false,
    server_description: "",
    headers: {},
  });
  const [headerInput, setHeaderInput] = useState("");
  const [toolList, setToolList] = useState<ToolListState>({
    isListing: false,
    listedTools: [],
    error: null,
    hasListed: false,
    approvalSettings: { never: [], always: [] },
  });

  const handleSubmit = async () => {
    const validation = validateMcpServerForm(formData, headerInput);
    if (!validation.isValid) {
      console.error("Validation error:", validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = parseHeaders(headerInput);
      const result = await createMcpServer({
        server_label: formData.server_label,
        server_url: formData.server_url,
        local: formData.local,
        server_description: formData.server_description,
        headers,
        require_approval: toolList.approvalSettings,
      });

      if (result.success) {
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setFormData({
          server_label: "",
          server_url: "",
          local: false,
          server_description: "",
          headers: {},
        });
        setHeaderInput("");
        setToolList({
          isListing: false,
          listedTools: [],
          error: null,
          hasListed: false,
          approvalSettings: { never: [], always: [] },
        });
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
    // Reset form
    setFormData({
      server_label: "",
      server_url: "",
      local: false,
      server_description: "",
      headers: {},
    });
    setHeaderInput("");
    setToolList({
      isListing: false,
      listedTools: [],
      error: null,
      hasListed: false,
      approvalSettings: { never: [], always: [] },
    });
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
            <McpServerForm
              formData={formData}
              onFormDataChange={setFormData}
              headerInput={headerInput}
              onHeaderInputChange={setHeaderInput}
              toolList={toolList}
              onToolListChange={setToolList}
              isSubmitting={isSubmitting}
              workspaceId={workspaceId || undefined}
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