"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import {
  Database,
  Columns,
  Eye,
  Calendar,
  Tag,
  Save,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/ui/command";
import { PipelineEvent } from "./events-table";
import { SaveViewDialog } from "./save-view-dialog";

// Dataset Row data type - represents a merged context row with enrichments
export interface DatasetRow {
  id: string;
  row_data: Record<string, unknown>;
  tags: string[];
  created_at: string;
  event_timestamp: string;
}

// Column configuration helper
const drf = createColumnConfigHelper<DatasetRow>();

// Helper function to format cell values
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

// Helper function to check if value is a URL
function isUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export interface DatasetView {
  id: string;
  name: string;
  columns: string[];
  is_default: boolean;
}

interface DatasetRowsTableProps {
  events: PipelineEvent[];
  loading?: boolean;
  onColumnSelect?: (columns: string[]) => void;
  views?: DatasetView[];
  currentViewId?: string | null;
  onViewChange?: (viewId: string | null) => void;
  onSaveView?: (name: string, columns: string[], isDefault: boolean) => Promise<void>;
  savingView?: boolean;
}

export function DatasetRowsTable({
  events,
  loading = false,
  onColumnSelect,
  views = [],
  currentViewId = null,
  onViewChange,
  onSaveView,
  savingView = false,
}: DatasetRowsTableProps) {
  // Transform events into dataset rows (only context_row events)
  const rows: DatasetRow[] = useMemo(() => {
    return events
      .filter((e) => e.event_name === "context_row")
      .map((e) => ({
        id: e.id,
        row_data: e.raw_data || {},
        tags: e.tags || [],
        created_at: e.event_timestamp,
        event_timestamp: e.event_timestamp,
      }));
  }, [events]);

  // Extract all unique column names from all rows
  const allColumns = useMemo(() => {
    const columnSet = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row.row_data).forEach((key) => columnSet.add(key));
    });
    // Always include id, tags, created_at
    columnSet.add("id");
    columnSet.add("tags");
    columnSet.add("created_at");
    return Array.from(columnSet).sort();
  }, [rows]);

  // State for selected columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    // Try to load from current view
    if (currentViewId && views.length > 0) {
      const currentView = views.find((v) => v.id === currentViewId);
      if (currentView && currentView.columns.length > 0) {
        // Filter to only include columns that exist
        return currentView.columns.filter((col) => allColumns.includes(col));
      }
    }
    // Try to load default view
    const defaultView = views.find((v) => v.is_default);
    if (defaultView && defaultView.columns.length > 0) {
      return defaultView.columns.filter((col) => allColumns.includes(col));
    }
    // Default: show first 10 columns + id, tags, created_at
    const defaultColumns = ["id", "tags", "created_at"];
    const dataColumns = allColumns
      .filter((col) => !defaultColumns.includes(col))
      .slice(0, 10);
    return [...defaultColumns, ...dataColumns];
  });

  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Update selected columns when view changes
  useMemo(() => {
    if (currentViewId && views.length > 0) {
      const currentView = views.find((v) => v.id === currentViewId);
      if (currentView && currentView.columns.length > 0) {
        const viewColumns = currentView.columns.filter((col) => allColumns.includes(col));
        if (viewColumns.length > 0 && JSON.stringify(viewColumns) !== JSON.stringify(selectedColumns)) {
          setSelectedColumns(viewColumns);
        }
      }
    } else if (!currentViewId && views.length > 0) {
      // Try default view
      const defaultView = views.find((v) => v.is_default);
      if (defaultView && defaultView.columns.length > 0) {
        const viewColumns = defaultView.columns.filter((col) => allColumns.includes(col));
        if (viewColumns.length > 0 && JSON.stringify(viewColumns) !== JSON.stringify(selectedColumns)) {
          setSelectedColumns(viewColumns);
          if (onViewChange) {
            onViewChange(defaultView.id);
          }
        }
      }
    }
  }, [currentViewId, views, allColumns]);

  // Update selected columns when allColumns changes (but not if we have a view)
  useMemo(() => {
    if (allColumns.length > 0 && selectedColumns.length === 0 && !currentViewId) {
      const defaultColumns = ["id", "tags", "created_at"];
      const dataColumns = allColumns
        .filter((col) => !defaultColumns.includes(col))
        .slice(0, 10);
      setSelectedColumns([...defaultColumns, ...dataColumns]);
    }
  }, [allColumns, selectedColumns.length, currentViewId]);

  // Notify parent of column selection changes
  useMemo(() => {
    if (onColumnSelect) {
      onColumnSelect(selectedColumns);
    }
  }, [selectedColumns, onColumnSelect]);

  // Create dynamic column configurations
  const columnsConfig = useMemo(() => {
    return selectedColumns.map((colName) => {
      if (colName === "id") {
        return drf
          .text()
          .id("id")
          .accessor((row: DatasetRow) => row.id)
          .displayName("ID")
          .icon(Database)
          .build();
      }
      if (colName === "tags") {
        return drf
          .option()
          .id("tags")
          .accessor((row: DatasetRow) => row.tags.join(", "))
          .displayName("Tags")
          .icon(Tag)
          .build();
      }
      if (colName === "created_at") {
        return drf
          .option()
          .id("created_at")
          .accessor((row: DatasetRow) => row.created_at)
          .displayName("Created")
          .icon(Calendar)
          .build();
      }
      // Dynamic column for data fields
      return drf
        .text()
        .id(colName)
        .accessor((row: DatasetRow) => formatCellValue(row.row_data[colName]))
        .displayName(colName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))
        .icon(Columns)
        .build();
    });
  }, [selectedColumns]);

  // Data table filters
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data: rows,
      columnsConfig,
      options: {},
    });

  const toggleColumn = (columnName: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnName)) {
        return prev.filter((col) => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

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

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Database className="h-12 w-12" />}
        title="No data rows yet"
        description="Upload a CSV file or add data to see rows in this table view."
      />
    );
  }

  const handleViewChange = (viewId: string | null) => {
    if (onViewChange) {
      onViewChange(viewId);
    }
    if (viewId && views.length > 0) {
      const view = views.find((v) => v.id === viewId);
      if (view && view.columns.length > 0) {
        setSelectedColumns(view.columns.filter((col) => allColumns.includes(col)));
      }
    } else {
      // Reset to default
      const defaultColumns = ["id", "tags", "created_at"];
      const dataColumns = allColumns
        .filter((col) => !defaultColumns.includes(col))
        .slice(0, 10);
      setSelectedColumns([...defaultColumns, ...dataColumns]);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* View Selector, Column Selector, Save View and Filters - All on same row */}
      <div className="flex items-center gap-3">
        {/* View Selector */}
        {views.length > 0 && (
          <Select
            value={currentViewId || "__none__"}
            onValueChange={(value) => handleViewChange(value === "__none__" ? null : value)}
          >
            <SelectTrigger className="w-[200px]">
              <Bookmark className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Default View</SelectItem>
              {views.map((view) => (
                <SelectItem key={view.id} value={view.id}>
                  {view.name} {view.is_default && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Column Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="h-4 w-4 mr-2" />
              Columns ({selectedColumns.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search columns..." />
              <CommandList>
                <CommandEmpty>No columns found.</CommandEmpty>
                <CommandGroup>
                  {allColumns.map((column) => (
                    <CommandItem
                      key={column}
                      onSelect={() => toggleColumn(column)}
                    >
                      <Checkbox
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => toggleColumn(column)}
                        className="mr-2"
                      />
                      {column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Save View Button */}
        {onSaveView && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={savingView}
          >
            <Save className="h-4 w-4 mr-2" />
            Save View
          </Button>
        )}

        {/* Filters */}
        {filters && columns && actions && (
          <DataTableFilter
            filters={filters}
            columns={columns}
            actions={actions}
            strategy={strategy}
          />
        )}
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden">
        <div className="rounded-md border overflow-x-auto max-w-full">
          <Table className="w-full" style={{ tableLayout: "auto" }}>
            <TableHeader>
              <TableRow>
                {selectedColumns.map((colName) => (
                  <TableHead key={colName} className="min-w-[120px]">
                    {colName === "id"
                      ? "ID"
                      : colName === "tags"
                        ? "Tags"
                        : colName === "created_at"
                          ? "Created"
                          : colName
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedColumns.length}
                    className="h-24 text-center"
                  >
                    <EmptyState
                      icon={<Database className="h-8 w-8" />}
                      title="No rows found"
                      description="No rows match your current filters."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    {selectedColumns.map((colName) => {
                      let cellValue: unknown;
                      let displayValue: React.ReactNode;

                      if (colName === "id") {
                        cellValue = row.id;
                        displayValue = (
                          <span className="font-mono text-xs truncate">
                            {row.id.slice(0, 8)}...
                          </span>
                        );
                      } else if (colName === "tags") {
                        cellValue = row.tags;
                        displayValue = (
                          <div className="flex flex-wrap gap-1">
                            {row.tags.slice(0, 3).map((tag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {row.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{row.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        );
                      } else if (colName === "created_at") {
                        cellValue = row.created_at;
                        displayValue = (
                          <span className="text-sm text-muted-foreground">
                            {new Date(row.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "numeric",
                              }
                            )}
                          </span>
                        );
                      } else {
                        cellValue = row.row_data[colName];
                        const formatted = formatCellValue(cellValue);
                        
                        // Check if it's a URL
                        if (isUrl(cellValue)) {
                          displayValue = (
                            <a
                              href={String(cellValue)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate block"
                            >
                              {formatted}
                            </a>
                          );
                        } else if (formatted.length > 100) {
                          // Truncate long values
                          displayValue = (
                            <span className="truncate" title={formatted}>
                              {formatted.slice(0, 100)}...
                            </span>
                          );
                        } else {
                          displayValue = <span className="truncate">{formatted}</span>;
                        }
                      }

                      return (
                        <TableCell key={colName} className="p-3">
                          {displayValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary */}
      {filteredData.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {rows.length} rows
        </div>
      )}

      {/* Save View Dialog */}
      {onSaveView && (
        <SaveViewDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          currentColumns={selectedColumns}
          existingViews={views}
          onSave={onSaveView}
          saving={savingView}
        />
      )}
    </div>
  );
}

