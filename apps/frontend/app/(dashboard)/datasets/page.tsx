"use client";

import { useEffect, useState, useCallback } from "react";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { DatasetsTable, Dataset } from "./components/datasets-table";
import { CreateDatasetDialog } from "./components/create-dataset-dialog";
import { DatasetsPageSkeleton } from "./components/datasets-page-skeleton";

export default function DatasetsPage() {
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { executeWorkflow } = useWorkspaceScopedActions();

  // Fetch datasets from ClickHouse
  const fetchDatasets = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the datasets read workflow
      const result = await executeWorkflow("DatasetsReadWorkflow", {
        workspace_id: currentWorkspaceId,
      });
      
 
      if (result.success && result.data) {
        // Transform the data to match our interface
        const transformedDatasets: Dataset[] = (result.data as Dataset[])?.map((dataset: Dataset) => ({
          id: dataset.id,
          workspace_id: dataset.workspace_id,
          name: dataset.name,
          description: dataset.description,
          storage_type: dataset.storage_type,
          storage_config: dataset.storage_config,
          last_updated_at: dataset.last_updated_at,
          created_at: dataset.created_at,
          updated_at: dataset.updated_at,
        })) || [];
        
        setDatasets(transformedDatasets);
      } else {
        setError(result.error || "Failed to load datasets");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, executeWorkflow]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleRefresh = () => {
    fetchDatasets();
  };

  if (!isReady) {
    return <DatasetsPageSkeleton />;
  }

  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={[{ label: "Context" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <CreateDatasetDialog onDatasetCreated={fetchDatasets} />
          </div>
        }
        fixed={true}
      />
      
      <div className="p-4">
        <div className="space-y-6">

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-destructive">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-destructive">Failed to load datasets</h3>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-3"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Datasets Table */}
      <DatasetsTable datasets={datasets} loading={loading} />
        </div>
      </div>
    </div>
  );
}