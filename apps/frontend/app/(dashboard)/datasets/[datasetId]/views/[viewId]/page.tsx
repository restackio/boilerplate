"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
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

  const fetchView = useCallback(async () => {
    if (!currentWorkspaceId || !isReady || !datasetId || !viewId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await executeWorkflow("GetViewWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        view_id: viewId,
      });
      const data = result.data as {
        success?: boolean;
        view?: ViewSpec;
        error?: string;
      };
      if (result.success && data?.success && data?.view) {
        setView(data.view);
      } else {
        setView(null);
        setError(data?.error ?? "View not found");
      }
    } catch (err) {
      setView(null);
      setError(err instanceof Error ? err.message : "Failed to load view");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, viewId, executeWorkflow]);

  useEffect(() => {
    fetchView();
  }, [fetchView]);

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

  const columns = Array.isArray(view.columns) ? view.columns : [];

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
          <h3 className="text-sm font-medium mb-2">Columns</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Key</TableHead>
                  <TableHead>Label</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-muted-foreground py-8"
                    >
                      No columns defined
                    </TableCell>
                  </TableRow>
                ) : (
                  columns.map((col, i) => (
                    <TableRow key={col.key ?? i}>
                      <TableCell className="font-mono text-sm">
                        {col.key}
                      </TableCell>
                      <TableCell>{col.label ?? col.key}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
