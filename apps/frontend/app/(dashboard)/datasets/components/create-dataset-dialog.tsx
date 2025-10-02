"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { QuickActionDialog, useQuickActionDialog } from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Plus, Database } from "lucide-react";
import { createDataset } from "@/app/actions/workflow";

interface CreateDatasetDialogProps {
  onDatasetCreated?: () => void;
}

// Available storage types
const STORAGE_TYPES = [
  {
    id: "clickhouse",
    name: "ClickHouse",
    description: "High-performance columnar database for analytics and real-time queries",
  },
  // Future storage types can be added here
];

export function CreateDatasetDialog({ onDatasetCreated }: CreateDatasetDialogProps) {
  const { currentWorkspaceId } = useWorkspaceScopedActions();
  const { isOpen, open, close, isLoading, handleError, handleSuccess } = useQuickActionDialog();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    storage_type: "clickhouse",
    tags: [] as string[],
  });
  const [nameError, setNameError] = useState("");

  const validateDatasetName = (name: string): boolean => {
    const slugPattern = /^[a-z0-9_-]+$/;
    if (!name) {
      setNameError("Dataset name is required");
      return false;
    }
    if (!slugPattern.test(name)) {
      setNameError("Dataset name must be in slug format (lowercase letters, numbers, hyphens, underscores only)");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleCreateDataset = async () => {
    if (!validateDatasetName(formData.name)) {
      return;
    }

    try {
      const result = await createDataset({
        workspace_id: currentWorkspaceId,
        name: formData.name,
        description: formData.description || undefined,
        storage_type: formData.storage_type,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      });

      if (result && typeof result === 'object' && 'dataset' in result) {
        handleSuccess();
        onDatasetCreated?.();
        // Reset form
        setFormData({
          name: "",
          description: "",
          storage_type: "clickhouse",
          tags: [],
        });
        setNameError("");
      } else {
        throw new Error("Failed to create dataset");
      }
    } catch (error) {
      console.error("Error creating dataset:", error);
      handleError(error instanceof Error ? error.message : "Failed to create dataset");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear name error when user starts typing
    if (field === "name" && nameError) {
      setNameError("");
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleInputChange("name", value);
  };

  const handleTagsChange = (value: string) => {
    // Convert comma-separated string to array
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags,
    }));
  };

  return (
    <>
      <Button size="sm" onClick={open}>
        <Plus className="h-4 w-4 mr-1" />
        New dataset
      </Button>

      <QuickActionDialog
        isOpen={isOpen}
        onClose={close}
        title="New dataset"
        description="Create a new dataset on the context store of your choice."
        onPrimaryAction={handleCreateDataset}
        primaryActionLabel="Create dataset"
        primaryActionIcon={Database}
        isLoading={isLoading}
        closeOnSuccess={true}
        onSuccess={handleSuccess}
        onError={handleError}
        size="lg"
      >
        <div className="space-y-4">
          {/* Storage Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="storage-type">Storage Type</Label>
            <Select
              value={formData.storage_type}
              onValueChange={(value) => handleInputChange("storage_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a storage type" />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{type.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dataset Name Input */}
          <div className="space-y-2">
            <Label htmlFor="dataset-name">Name</Label>
            <Input
              id="dataset-name"
              placeholder="e.g., social-media, weather-data, k8s-logs"
              value={formData.name}
              onChange={handleNameChange}
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && (
              <p className="text-sm text-red-600">{nameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="dataset-description">Description</Label>
            <Textarea
              id="dataset-description"
              placeholder="Describe how you plan to use this dataset..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="dataset-tags">Tags (optional)</Label>
            <Input
              id="dataset-tags"
              placeholder="e.g., social_media, weather, k8s"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated tags for filtering and organization
            </p>
          </div>
        </div>
      </QuickActionDialog>
    </>
  );
}
