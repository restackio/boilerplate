"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface AddMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  server_label: string;
  server_url: string;
  local: boolean;
  server_description: string;
  headers: Record<string, string>;
}

export function AddMcpServerDialog({ open, onOpenChange, onSuccess }: AddMcpServerDialogProps) {
  const { createMcpServer } = useWorkspaceScopedActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    server_label: "",
    server_url: "",
    local: false,
    server_description: "",
    headers: {}
  });
  const [headerInput, setHeaderInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const result = await createMcpServer({
        server_label: formData.server_label,
        server_url: formData.local ? undefined : formData.server_url,
        local: formData.local,
        server_description: formData.server_description || undefined,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
        require_approval: {
          never: { tool_names: [] },
          always: { tool_names: [] }
        }
      });

      if (result?.success) {
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setFormData({
          server_label: "",
          server_url: "",
          local: false,
          server_description: "",
          headers: {}
        });
        setHeaderInput("");
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

  const handleLocalToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      local: checked,
      server_url: checked ? "" : prev.server_url
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="server_label">Name</Label>
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
              <Label htmlFor="server_url">URL</Label>
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

          <div className="flex justify-end gap-2 pt-4">
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
