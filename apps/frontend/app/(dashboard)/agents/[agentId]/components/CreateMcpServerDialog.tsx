"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Label } from "@workspace/ui/components/ui/label";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Plus, X, Loader2, Shield, AlertTriangle } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface CreateMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMcpServerDialog({
  open,
  onOpenChange,
}: CreateMcpServerDialogProps) {
  const { createMcpServer } = useWorkspaceScopedActions();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    server_label: "",
    server_url: "",
    server_description: "",
  });
  const [toolNames, setToolNames] = useState<string[]>([""]);
  const [approvalType, setApprovalType] = useState<"never" | "always">("never");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToolName = () => {
    setToolNames(prev => [...prev, ""]);
  };

  const removeToolName = (index: number) => {
    setToolNames(prev => prev.filter((_, i) => i !== index));
  };

  const updateToolName = (index: number, value: string) => {
    setToolNames(prev => prev.map((tool, i) => i === index ? value : tool));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.server_label || !formData.server_url) {
      alert("Server label and URL are required");
      return;
    }

    // Filter out empty tool names
    const validToolNames = toolNames.filter(name => name.trim() !== "");
    
    setIsCreating(true);
    try {
      const result = await createMcpServer({
        server_label: formData.server_label,
        server_url: formData.server_url,
        server_description: formData.server_description || undefined,
        require_approval: {
          never: { tool_names: approvalType === "never" ? validToolNames : [] },
          always: { tool_names: approvalType === "always" ? validToolNames : [] }
        }
      });

      if (result.success) {
        // Reset form and close dialog
        setFormData({ server_label: "", server_url: "", server_description: "" });
        setToolNames([""]);
        setApprovalType("never");
        onOpenChange(false);
      } else {
        alert(`Failed to create MCP server: ${result.error}`);
      }
    } catch (error) {
      console.error("Error creating MCP server:", error);
      alert("Failed to create MCP server");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({ server_label: "", server_url: "", server_description: "" });
      setToolNames([""]);
      setApprovalType("never");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New MCP Server</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6">
          {/* Basic Server Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server_label">Server Label *</Label>
              <Input
                id="server_label"
                value={formData.server_label}
                onChange={(e) => handleInputChange("server_label", e.target.value)}
                placeholder="e.g., Zendesk MCP"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="server_url">Server URL *</Label>
              <Input
                id="server_url"
                value={formData.server_url}
                onChange={(e) => handleInputChange("server_url", e.target.value)}
                placeholder="e.g., https://{yourngrokIP}.ngrok-free.app/mcp"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="server_description">Description</Label>
              <Textarea
                id="server_description"
                value={formData.server_description}
                onChange={(e) => handleInputChange("server_description", e.target.value)}
                placeholder="Optional description of what this MCP server provides..."
                rows={3}
              />
            </div>
          </div>

          {/* Tool Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tool Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Approval Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={approvalType === "never" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setApprovalType("never")}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Never Require Approval
                  </Button>
                  <Button
                    type="button"
                    variant={approvalType === "always" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setApprovalType("always")}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Always Require Approval
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {approvalType === "never" 
                    ? "Tools will be available without approval"
                    : "Tools will require approval before use"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tool Names</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addToolName}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tool
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {toolNames.map((toolName, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={toolName}
                        onChange={(e) => updateToolName(index, e.target.value)}
                        placeholder={`Tool ${index + 1} name`}
                      />
                      {toolNames.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeToolName(index)}
                        >
                          <X className="h-4 w-4 mr-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.server_label || !formData.server_url}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create MCP Server"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
