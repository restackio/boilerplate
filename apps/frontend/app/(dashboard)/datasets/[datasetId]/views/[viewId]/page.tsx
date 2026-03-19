"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface ViewSpec {
  id: string;
  name: string;
  columns: { key: string; label: string }[];
  dataset_id: string;
  entity_id_field?: string;
  activity_filter?: Record<string, unknown>;
}

interface DatasetEvent {
  id: string;
  raw_data?: Record<string, unknown>;
  transformed_data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export default function ViewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.datasetId as string;
  const viewId = params.viewId as string;
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow } = useWorkspaceScopedActions();
  const [view, setView] = useState<ViewSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<DatasetEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const fetchView = useCallback(async () => {
    if (!currentWorkspaceId || !isReady || !datasetId || !viewId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await executeWorkflow<ViewSpec>("GetViewWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        view_id: viewId,
      });
      if (result.success && result.data) {
        setView(result.data);
      } else {
        setView(null);
        setError(result.error ?? "View not found");
      }
    } catch (err) {
      setView(null);
      setError(err instanceof Error ? err.message : "Failed to load view");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, viewId, executeWorkflow]);

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspaceId || !isReady || !datasetId) return;
    setEventsLoading(true);
    try {
      const result = await executeWorkflow("QueryDatasetEventsWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        limit: 500,
        offset: 0,
      });
      const payload = result.data as {
        success?: boolean;
        events?: DatasetEvent[];
      };
      if (result.success && payload?.events && Array.isArray(payload.events)) {
        setEvents(payload.events);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  useEffect(() => {
    fetchView();
  }, [fetchView]);

  useEffect(() => {
    if (view) fetchEvents();
  }, [view, fetchEvents]);

  const columns = useMemo(
    () => (Array.isArray(view?.columns) ? view.columns : []),
    [view?.columns],
  );
  const dataRows = useMemo(() => {
    if (columns.length === 0) return [];
    return events.map((event) => {
      const data = event.raw_data ?? event.transformed_data ?? {};
      const row: Record<string, unknown> = { _id: event.id };
      for (const col of columns) {
        const val = data[col.key];
        row[col.key] = val == null ? "" : String(val);
      }
      return row;
    });
  }, [events, columns]);

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (loading && !view) {
    return (
      <div className="flex flex-1 items-center justify-center h-64">
        <p className="text-muted-foreground">Loading view...</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="flex flex-1 flex-col p-4">
        <Button variant="ghost" onClick={() => router.back()} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium text-foreground">View not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error ??
                "This view may have been removed or the link is invalid."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push(`/datasets/${datasetId}/views`)}
            >
              Back to Views
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <PageHeader
        breadcrumbs={[
          { label: "Context", href: "/datasets" },
          { label: "Dataset", href: `/datasets/${datasetId}` },
          { label: "Views", href: `/datasets/${datasetId}/views` },
          { label: view.name },
        ]}
        fixed
      />
      <div className="p-4 space-y-6">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">{view.name}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              Dataset:{" "}
              <Link
                href={`/datasets/${view.dataset_id}`}
                className="text-primary hover:underline"
              >
                {view.dataset_id}
              </Link>
            </span>
            {view.entity_id_field && (
              <span>Entity ID field: {view.entity_id_field}</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Data</h3>
          <div className="border rounded-lg overflow-x-auto">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length || 1}
                        className="text-center text-muted-foreground py-8"
                      >
                        {columns.length === 0
                          ? "No columns defined for this view."
                          : "No data yet. Data will appear here as events are added to the dataset."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataRows.map((row, i) => (
                      <TableRow key={(row._id as string) ?? i}>
                        {columns.map((col) => (
                          <TableCell
                            key={col.key}
                            className="max-w-[300px] truncate"
                            title={String(row[col.key] ?? "")}
                          >
                            {String(row[col.key] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          {dataRows.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {dataRows.length} row{dataRows.length !== 1 ? "s" : ""}.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/datasets/${datasetId}/views`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Views
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/datasets/${view.dataset_id}`}>Open dataset</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
