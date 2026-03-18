"use client";

import { LayoutGrid, Eye } from "lucide-react";
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
import Link from "next/link";

export interface ViewSpecRow {
  id: string;
  name: string;
  columns: { key: string; label: string }[];
  dataset_id: string;
  entity_id_field?: string;
  activity_filter?: Record<string, unknown>;
}

interface ViewsTableProps {
  views: ViewSpecRow[];
  datasetId: string;
  loading?: boolean;
}

export function ViewsTable({
  views,
  datasetId,
  loading = false,
}: ViewsTableProps) {
  if (loading) {
    return (
      <div className="border rounded-lg">
        <div className="h-12 bg-muted animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 border-t bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>View</TableHead>
            <TableHead className="w-[120px]">Columns</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {views.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                <EmptyState
                  icon={<LayoutGrid className="h-8 w-8" />}
                  title="No views"
                  description="Views created in this dataset will appear here."
                />
              </TableCell>
            </TableRow>
          ) : (
            views.map((view) => (
              <TableRow key={view.id}>
                <TableCell className="font-medium">
                  <span className="text-foreground">{view.name}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {Array.isArray(view.columns) ? view.columns.length : 0} column
                  {(Array.isArray(view.columns) ? view.columns.length : 0) !== 1
                    ? "s"
                    : ""}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/datasets/${datasetId}/views/${view.id}`}
                    className="inline-flex"
                  >
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Open</span>
                      </span>
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
