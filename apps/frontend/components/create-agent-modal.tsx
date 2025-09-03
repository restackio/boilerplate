"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Plus } from "lucide-react";

interface CreateAgentModalProps {
  onAgentCreated?: () => void;
}

export function CreateAgentModal({ onAgentCreated }: CreateAgentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { createAgent } = useWorkspaceScopedActions();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    version: "v1.0",
    status: "inactive" as "active" | "inactive",
    model: "gpt-5",
    reasoning_effort: "medium",
  });

  const [nameError, setNameError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate agent name before submission
    if (!validateAgentName(formData.name)) {
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await createAgent(formData);
      if (result.success) {
        setIsOpen(false);
        setFormData({
          name: "",
          description: "",
          version: "v1.0",
          status: "inactive" as "active" | "inactive",
          // New GPT-5 model configuration fields
          model: "gpt-5",
          reasoning_effort: "medium",
        });
        setNameError("");
        onAgentCreated?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateAgentName = (name: string): boolean => {
    const slugPattern = /^[a-z0-9-_]+$/;
    if (!name) {
      setNameError("Agent name is required");
      return false;
    }
    if (!slugPattern.test(name)) {
      setNameError("Agent name must be in slug format (lowercase letters, numbers, hyphens, underscores only)");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "name") {
      validateAgentName(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., github-pr-agent, zendesk-support"
              required
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
            <p className="text-xs text-neutral-500">
              Use lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter agent description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) => handleInputChange("version", e.target.value)}
              placeholder="v1.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* GPT-5 Model Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={formData.model} onValueChange={(value) => handleInputChange("model", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5">GPT-5</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reasoning-effort">Reasoning</Label>
              <Select value={formData.reasoning_effort} onValueChange={(value) => handleInputChange("reasoning_effort", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 