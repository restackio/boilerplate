"use client";

import {
  Database,
  Eye,
  HardDrive,
  Calendar,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { DataTableFilter } from "@workspace/ui/components/table";
import { createColumnConfigHelper } from "@workspace/ui/components/table/core/filters";
import { useDataTableFilters } from "@workspace/ui/components/table/hooks/use-data-table-filters";
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

// Dataset data type - matches actual database schema
export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  storage_type: string;
  storage_config: Record<string, unknown>;
  last_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Column configuration helper
const dtf = createColumnConfigHelper<Dataset>();

export const datasetColumnsConfig = [
  dtf
    .option()
    .id("name")
    .accessor((row: Dataset) => row.name)
    .displayName("Dataset")
    .icon(Database)
    .build(),
  dtf
    .option()
    .id("storage_type")
    .accessor((row: Dataset) => row.storage_type)
    .displayName("Storage")
    .icon(HardDrive)
    .build(),
  dtf
    .option()
    .id("last_updated_at")
    .accessor((row: Dataset) => row.last_updated_at)
    .displayName("Last Updated")
    .icon(Calendar)
    .build(),
] as const;

// No filter options needed anymore since we removed status

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleDateString();
}

interface DatasetsTableProps {
  datasets: Dataset[];
  loading?: boolean;
}

export function DatasetsTable({ datasets, loading = false }: DatasetsTableProps) {
  const { columns, filters, actions, strategy, filteredData } = useDataTableFilters({
    strategy: "client",
    data: datasets,
    columnsConfig: datasetColumnsConfig,
    options: {},
  });


  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-muted animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-t bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <DataTableFilter
        filters={filters}
        columns={columns}
        actions={actions}
        strategy={strategy}
      />

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dataset</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <EmptyState
                    icon={<Database className="h-12 w-12" />}
                    title="No datasets found"
                    description="No datasets match your current filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((dataset) => (
                <TableRow key={dataset.id}>
                  {/* Dataset Name & Description */}
                  <TableCell className="font-medium">
                      <div className="space-y-1">
                        <Link
                          href={`/datasets/${dataset.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {dataset.name}
                        </Link>
                        {dataset.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {dataset.description}
                          </p>
                        )}
                      </div>
                  </TableCell>

                  {/* Storage Type */}
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {dataset.storage_type}
                    </Badge>
                  </TableCell>

                  {/* Last Updated */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(dataset.last_updated_at)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link href={`/datasets/${dataset.id}`}>
                          <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                            <span>
                              <Eye className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">View</span>
                            </span>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {filteredData.length} of {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
