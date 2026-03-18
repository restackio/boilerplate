"use client";

import { useState } from "react";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { EmptyState } from "@workspace/ui/components/ui/empty-state";
import { ConfirmationDialog } from "@workspace/ui/components/confirmation-dialog";

export interface DatasetFileSummary {
  source: string;
  chunk_count: number;
}

interface DatasetFilesTableProps {
  files: DatasetFileSummary[];
  loading?: boolean;
  onDeleteFile?: (source: string) => Promise<void>;
}

export function DatasetFilesTable({
  files,
  loading = false,
  onDeleteFile,
}: DatasetFilesTableProps) {
  const [deletingSource, setDeletingSource] = useState<string | null>(null);
  const [confirmSource, setConfirmSource] = useState<string | null>(null);

  const handleDeleteClick = (source: string) => {
    setConfirmSource(source);
  };

  const handleConfirmDelete = async () => {
    if (!confirmSource || !onDeleteFile) return;
    setDeletingSource(confirmSource);
    try {
      await onDeleteFile(confirmSource);
      setConfirmSource(null);
    } finally {
      setDeletingSource(null);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Chunks</TableHead>
              {onDeleteFile && <TableHead className="w-[100px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={onDeleteFile ? 3 : 2}
                  className="h-24 text-center"
                >
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    title="No files"
                    description="Upload files with the Add files button above. Files will appear here once chunks are ingested."
                  />
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.source}>
                  <TableCell className="font-medium">
                    <span
                      className="truncate block max-w-md"
                      title={file.source}
                    >
                      {file.source}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {file.chunk_count}
                  </TableCell>
                  {onDeleteFile && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(file.source)}
                        disabled={deletingSource !== null}
                      >
                        {deletingSource === file.source ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmationDialog
        isOpen={!!confirmSource}
        onClose={() => setConfirmSource(null)}
        onConfirm={handleConfirmDelete}
        title="Delete all chunks for this file?"
        description={
          <>
            This will remove all{" "}
            {files.find((f) => f.source === confirmSource)?.chunk_count ?? 0}{" "}
            chunks for &quot;{confirmSource}&quot; from the dataset. This cannot
            be undone.
          </>
        }
        variant="destructive"
        cancelText="Cancel"
        confirmText="Delete"
        isLoading={deletingSource === confirmSource}
      />
    </>
  );
}
