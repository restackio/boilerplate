"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

interface UploadCSVDialogProps {
  datasetId: string;
  onUploadSuccess?: () => void;
}

export function UploadCSVDialog({
  datasetId,
  onUploadSuccess,
}: UploadCSVDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow } = useWorkspaceScopedActions();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !currentWorkspaceId || !isReady) {
      return;
    }

    // Check file size (warn if > 10MB, but allow up to 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB.`);
      return;
    }
    
    if (file.size > WARN_FILE_SIZE) {
      // Warn but allow - large files will be processed in batches
      console.warn(`Large file detected (${(file.size / 1024 / 1024).toFixed(2)}MB). Processing may take longer.`);
    }

    setUploading(true);
    setError(null);

    try {
      // Read file content
      const fileContent = await file.text();

      // Calculate timeout based on file size (estimate: 1 second per 1000 rows)
      const calculatedTimeout = Math.max(60000, Math.min(file.size / 200 * 1000, 1800000)); // 1min to 30min
      console.log(`Uploading CSV: file size=${file.size} bytes, calculated timeout=${calculatedTimeout}ms (${calculatedTimeout/1000}s)`);

      // Call workflow to upload CSV with increased timeout for large files
      const result = await executeWorkflow("ContextRowsUploadCSVWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        csv_content: fileContent,
      }, {
        timeout: calculatedTimeout
      });

      if (result.success && result.data) {
        const data = result.data as { rows_imported: number };
        setOpen(false);
        setFile(null);
        onUploadSuccess?.();
      } else {
        setError(result.error || "Failed to upload CSV");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add rows to this dataset. Each row will be stored as a context_row event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full text-sm"
              disabled={uploading}
            />
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

