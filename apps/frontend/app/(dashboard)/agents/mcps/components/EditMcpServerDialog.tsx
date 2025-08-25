"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Separator } from "@workspace/ui/components/ui/separator";
import { Edit, Loader2, Trash2 } from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "@/hooks/use-workspace-scoped-actions";

interface EditMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServer | null;
  onSuccess?: () => void;
}

interface FormData {
  server_label: string;
  server_url: string;
  local: boolean;
  server_description: string;
  headers: Record<string, string>;
}

export function EditMcpServerDialog({ open, onOpenChange, mcpServer, onSuccess }: EditMcpServerDialogProps) {
  const { updateMcpServer, deleteMcpServer } = useWorkspaceScopedActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    server_label: "",
    server_url: "",
    local: false,
    server_description: "",
    headers: {}
  });
  const [headerInput, setHeaderInput] = useState("");

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
    }
  }, [mcpServer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpServer) return;

    setIsSubmitting(true);

    try {
      // Parse headers from JSON string if provided
      let parsedHeaders = {};
      if (headerInput.trim()) {
        try {
          parsedHeaders = JSON.parse(headerInput);
        } catch (error) {
          alert("Invalid JSON format for headers");
          setIsSubmitting(false);
          return;
        }
      }

      // Validate form
      if (!formData.server_label.trim()) {
        alert("Server label is required");
        setIsSubmitting(false);
        return;
      }

      if (!formData.local && !formData.server_url.trim()) {
        alert("Server URL is required for remote servers");
        setIsSubmitting(false);
        return;
      }

      if (formData.local && formData.server_url.trim()) {
        alert("Server URL should be empty for local servers");
        setIsSubmitting(false);
        return;
      }

      const result = await updateMcpServer(mcpServer.id, {
        server_label: formData.server_label,
        server_url: formData.local ? undefined : formData.server_url,
        local: formData.local,
        server_description: formData.server_description || undefined,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
        require_approval: mcpServer.require_approval // Keep existing approval settings
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

  const handleLocalToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      local: checked,
      server_url: checked ? "" : prev.server_url
    }));
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
          <div>
            <Label htmlFor="server_label">Server Label *</Label>
            <Input
              id="server_label"
              value={formData.server_label}
              onChange={(e) => setFormData(prev => ({ ...prev, server_label: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, server_url: e.target.value }))}
                placeholder="https://example.com/mcp"
                required={!formData.local}
              />
            </div>
          )}

          {formData.local && (
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
              <strong>Local Server:</strong> This server will use the MCP_URL environment variable for connection.
            </div>
          )}

          <div>
            <Label htmlFor="server_description">Description</Label>
            <Textarea
              id="server_description"
              value={formData.server_description}
              onChange={(e) => setFormData(prev => ({ ...prev, server_description: e.target.value }))}
              placeholder="Optional description of the MCP server"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="headers">Headers (JSON format)</Label>
            <Textarea
              id="headers"
              value={headerInput}
              onChange={(e) => setHeaderInput(e.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional headers as JSON object
            </p>
          </div>

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
