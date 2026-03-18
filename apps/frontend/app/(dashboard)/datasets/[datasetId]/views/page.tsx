"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { ViewsTable, type ViewSpecRow } from "../../components/views-table";
import { Dataset } from "../../components/datasets-table";

export default function DatasetViewsPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.datasetId as string;
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow } = useWorkspaceScopedActions();
  const [views, setViews] = useState<ViewSpecRow[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataset = useCallback(async () => {
    if (!currentWorkspaceId || !isReady || !datasetId) return;
    try {
      const result = await executeWorkflow("DatasetsGetByIdWorkflow", {
        dataset_id: datasetId,
        workspace_id: currentWorkspaceId,
      });
      if (result.success && result.data) {
        setDataset(result.data as Dataset);
      } else {
        setDataset(null);
      }
    } catch {
      setDataset(null);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  const fetchViews = useCallback(async () => {
    if (!currentWorkspaceId || !isReady || !datasetId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await executeWorkflow("ListViewsForDatasetWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
      });
      const data = result.data as {
        success?: boolean;
        views?: ViewSpecRow[];
        error?: string;
      };
      if (result.success && data?.success && Array.isArray(data.views)) {
        setViews(data.views);
      } else {
        setViews([]);
        if (data?.error) setError(data.error);
      }
    } catch (err) {
      setViews([]);
      setError(err instanceof Error ? err.message : "Failed to load views");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && views.length === 0 && !loading) {
    return (
      <div className="flex flex-1 flex-col p-4">
        <Button variant="ghost" onClick={() => router.back()} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  const datasetName = dataset?.name ?? "Dataset";

  return (
    <div className="flex-1">
      <PageHeader
        breadcrumbs={[
          { label: "Context", href: "/datasets" },
          { label: datasetName, href: `/datasets/${datasetId}` },
          { label: "Views" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchViews();
              fetchDataset();
            }}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
        fixed
      />
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          <span>
            Views linked to this dataset (created by the Build agent). Open a
            view to see its columns and configuration.
          </span>
        </div>
        <ViewsTable
          views={views}
          datasetId={datasetId}
          loading={loading}
        />
      </div>
    </div>
  );
}
