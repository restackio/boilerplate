"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { Plus } from "lucide-react";
import { useAgentActions } from "@/hooks/use-workflow-actions";

interface CreateAgentModalProps {
  onAgentCreated?: () => void;
}

export function CreateAgentModal({ onAgentCreated }: CreateAgentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createAgent } = useAgentActions();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    channel: "",
    version: "v1.0",
    status: "inactive" as "active" | "inactive",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createAgent(formData);
      if (result.success) {
        setOpen(false);
        setFormData({
          name: "",
          description: "",
          instructions: "",
          channel: "",
          version: "v1.0",
          status: "inactive" as "active" | "inactive",
        });
        onAgentCreated?.();
      } else {
        alert(`Failed to create agent: ${result.error}`);
      }
    } catch {
      alert("Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter agent name"
              required
            />
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 