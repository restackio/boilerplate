"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Separator } from "@workspace/ui/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "@/hooks/use-workspace-scoped-actions";
import { McpServerForm, McpServerFormData, ToolListState } from "./shared/McpServerForm";
import { validateMcpServerForm, parseHeaders } from "./shared/mcpServerValidation";

interface EditMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServer | null;
  onSuccess?: () => void;
}

export function EditMcpServerDialog({ open, onOpenChange, mcpServer, onSuccess }: EditMcpServerDialogProps) {
  const { updateMcpServer, deleteMcpServer } = useWorkspaceScopedActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<McpServerFormData>({
    server_label: "",
    server_url: "",
    local: false,
    server_description: "",
    headers: {}
  });
  const [headerInput, setHeaderInput] = useState("");
  const [toolList, setToolList] = useState<ToolListState>({
    isListing: false,
    listedTools: [],
    error: null,
    hasListed: false,
    approvalSettings: { never: [], always: [] }
  });

  // Initialize form data when mcpServer changes
  useEffect(() => {
    if (mcpServer) {
      setFormData({
        server_label: mcpServer.server_label,
        server_url: mcpServer.server_url || "",
        local: mcpServer.local,
        server_description: mcpServer.server_description || "",
        headers: mcpServer.headers || {}
      });
      setHeaderInput(mcpServer.headers ? JSON.stringify(mcpServer.headers, null, 2) : "");
      
      // Show existing tools from the server
      const existingTools = [
        ...(mcpServer.require_approval?.never?.tool_names || []),
        ...(mcpServer.require_approval?.always?.tool_names || [])
      ];
      if (existingTools.length > 0) {
        setToolList({
          isListing: false,
          listedTools: existingTools,
          error: null,
          hasListed: true,
          approvalSettings: {
            never: mcpServer.require_approval?.never?.tool_names || [],
            always: mcpServer.require_approval?.always?.tool_names || []
          }
        });
      } else {
        setToolList({
          isListing: false,
          listedTools: [],
          error: null,
          hasListed: false,
          approvalSettings: { never: [], always: [] }
        });
      }
    }
  }, [mcpServer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpServer) return;

    setIsSubmitting(true);

    try {
      // Validate form
      const validation = validateMcpServerForm(formData, headerInput);
      if (!validation.isValid) {
        alert(validation.error);
        setIsSubmitting(false);
        return;
      }

      // Parse headers
      const parsedHeaders = parseHeaders(headerInput);

      // Merge discovered tools with existing approval settings
      // const currentApproval = mcpServer.require_approval || {
      //   never: { tool_names: [] },
      //   always: { tool_names: [] }
      // };
      
      // Use the approval settings from the interactive selector
      const updatedApproval = {
        never: { tool_names: toolList.approvalSettings.never },
        always: { tool_names: toolList.approvalSettings.always }
      };

      const result = await updateMcpServer(mcpServer.id, {
        server_label: formData.server_label,
        server_url: formData.local ? undefined : formData.server_url,
        local: formData.local,
        server_description: formData.server_description || undefined,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
        require_approval: updatedApproval
      });

      if (result?.success) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        alert(result?.error || "Failed to update MCP server");
      }
    } catch (error) {
      console.error("Failed to update MCP server:", error);
      alert("Failed to update MCP server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!mcpServer) return;

    const confirmed = confirm(
      `Are you sure you want to delete the MCP server "${mcpServer.server_label}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteMcpServer(mcpServer.id);

      if (result?.success) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        alert(result?.error || "Failed to delete MCP server");
      }
    } catch (error) {
      console.error("Failed to delete MCP server:", error);
      alert("Failed to delete MCP server");
    } finally {
      setIsDeleting(false);
    }
  };


  if (!mcpServer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <McpServerForm
            formData={formData}
            onFormDataChange={setFormData}
            headerInput={headerInput}
            onHeaderInputChange={setHeaderInput}
            toolList={toolList}
            onToolListChange={setToolList}
            isSubmitting={isSubmitting}
            isDeleting={isDeleting}
          />

          <Separator />

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  Delete
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
