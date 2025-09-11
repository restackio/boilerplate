"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Loader2 } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { McpServerForm, McpServerFormData, ToolListState } from "./shared/McpServerForm";
import { validateMcpServerForm, parseHeaders } from "./shared/mcpServerValidation";

interface AddMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMcpServerDialog({ open, onOpenChange, onSuccess }: AddMcpServerDialogProps) {
  const { createMcpServer } = useWorkspaceScopedActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const result = await createMcpServer({
        server_label: formData.server_label,
        server_url: formData.local ? undefined : formData.server_url,
        local: formData.local,
        server_description: formData.server_description || undefined,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
        require_approval: {
          never: { tool_names: toolList.approvalSettings.never },
          always: { tool_names: toolList.approvalSettings.always }
        }
      });

      if (result?.success) {
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        alert(result?.error || "Failed to create MCP server");
      }
    } catch (error) {
      console.error("Failed to create MCP server:", error);
      alert("Failed to create MCP server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      server_label: "",
      server_url: "",
      local: false,
      server_description: "",
      headers: {}
    });
    setHeaderInput("");
    setToolList({
      isListing: false,
      listedTools: [],
      error: null,
      hasListed: false,
      approvalSettings: { never: [], always: [] }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Add MCP Server
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-1">
            <McpServerForm
              formData={formData}
              onFormDataChange={setFormData}
              headerInput={headerInput}
              onHeaderInputChange={setHeaderInput}
              toolList={toolList}
              onToolListChange={setToolList}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
