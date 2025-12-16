"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { Save } from "lucide-react";

interface DatasetView {
  id: string;
  name: string;
  columns: string[];
  is_default: boolean;
}

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentColumns: string[];
  existingViews: DatasetView[];
  onSave: (name: string, columns: string[], isDefault: boolean) => Promise<void>;
  saving?: boolean;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  currentColumns,
  existingViews,
  onSave,
  saving = false,
}: SaveViewDialogProps) {
  const [viewName, setViewName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!viewName.trim()) {
      setError("View name is required");
      return;
    }

    // Check if view name already exists
    if (existingViews.some((v) => v.name.toLowerCase() === viewName.toLowerCase().trim())) {
      setError("A view with this name already exists");
      return;
    }

    setError(null);
    await onSave(viewName.trim(), currentColumns, isDefault);
    setViewName("");
    setIsDefault(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setViewName("");
    setIsDefault(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
          <DialogDescription>
            Save your current column selection as a named view. Views can be shared with your team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              placeholder="e.g., Sales Leads View"
              value={viewName}
              onChange={(e) => {
                setViewName(e.target.value);
                setError(null);
              }}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              {currentColumns.length} columns will be saved
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
              disabled={saving}
            />
            <Label
              htmlFor="is-default"
              className="text-sm font-normal cursor-pointer"
            >
              Set as default view
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !viewName.trim()}>
            {saving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save View
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

