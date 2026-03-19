"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Database, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Dataset } from "../components/datasets-table";
import { EventsTable, PipelineEvent } from "../components/events-table";
import { AddFilesDialog } from "../components/add-files-dialog";
import {
  DatasetFilesTable,
  DatasetFileSummary,
} from "../components/dataset-files-table";
import { ViewsTable, type ViewSpecRow } from "../components/views-table";

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [files, setFiles] = useState<DatasetFileSummary[]>([]);
  const [views, setViews] = useState<ViewSpecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { executeWorkflow } = useWorkspaceScopedActions();

  const datasetId = params.datasetId as string;

  // Fetch dataset details
  const fetchDataset = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) return;

    try {
      setLoading(true);
      setError(null);

      const result = await executeWorkflow("DatasetsGetByIdWorkflow", {
        dataset_id: datasetId,
        workspace_id: currentWorkspaceId,
      });

      if (result.success && result.data) {
        setDataset(result.data as Dataset);
      } else {
        setError(result.error || "Dataset not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dataset");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) {
      return;
    }

    try {
      setEventsLoading(true);

      // Build filters (simplified - we'll filter on frontend)
      const filters: Record<string, unknown> = {};

      const result = await executeWorkflow("QueryDatasetEventsWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        ...filters,
        limit: 100,
        offset: 0,
      });

      // Extract events from consistent payload structure
      const responseData = result.data as {
        success?: boolean;
        events?: PipelineEvent[];
      };
      const events = responseData?.events || [];

      if (result.success && responseData?.success && Array.isArray(events)) {
        // Sort events by timestamp (latest first)
        const sortedEvents = events.sort(
          (a: PipelineEvent, b: PipelineEvent) =>
            new Date(b.event_timestamp).getTime() -
            new Date(a.event_timestamp).getTime(),
        );

        setEvents(sortedEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  // Fetch files (unique sources with chunk counts)
  const fetchFiles = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) return;
    try {
      setFilesLoading(true);
      const result = await executeWorkflow("ListDatasetFilesWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
      });
      const data = result.data as {
        success?: boolean;
        files?: DatasetFileSummary[];
      };
      if (result.success && data?.success && Array.isArray(data.files)) {
        setFiles(data.files);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  const fetchViews = useCallback(async () => {
    if (!currentWorkspaceId || !isReady || !datasetId) return;
    setViewsLoading(true);
    try {
      const result = await executeWorkflow("ListViewsForDatasetWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
      });
      // executeWorkflow unwraps to result.data = views array
      if (result.success && Array.isArray(result.data)) {
        setViews(result.data as ViewSpecRow[]);
      } else {
        setViews([]);
      }
    } catch (err) {
      console.error("Failed to load views:", err);
      setViews([]);
    } finally {
      setViewsLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  const handleDeleteFile = useCallback(
    async (source: string) => {
      if (!currentWorkspaceId || !isReady) return;
      const result = await executeWorkflow(
        "DeleteDatasetEventsBySourceWorkflow",
        {
          workspace_id: currentWorkspaceId,
          dataset_id: datasetId,
          source,
        },
      );
      if (result.success) {
        await Promise.all([fetchFiles(), fetchEvents()]);
      } else {
        throw new Error(result.error ?? "Failed to delete file chunks");
      }
    },
    [
      currentWorkspaceId,
      isReady,
      datasetId,
      executeWorkflow,
      fetchFiles,
      fetchEvents,
    ],
  );

  useEffect(() => {
    fetchDataset();
  }, [currentWorkspaceId, isReady, datasetId, fetchDataset]);

  useEffect(() => {
    if (currentWorkspaceId && isReady && datasetId) {
      fetchEvents();
    }
  }, [currentWorkspaceId, isReady, datasetId, fetchEvents]);

  useEffect(() => {
    if (currentWorkspaceId && isReady && datasetId) {
      fetchFiles();
    }
  }, [currentWorkspaceId, isReady, datasetId, fetchFiles]);

  useEffect(() => {
    if (currentWorkspaceId && isReady && datasetId) {
      fetchViews();
    }
  }, [currentWorkspaceId, isReady, datasetId, fetchViews]);

  const handleRefresh = () => {
    fetchDataset();
    fetchEvents();
    fetchFiles();
    fetchViews();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <Database className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-medium text-destructive mb-2">
            Dataset not found
          </h3>
          <p className="text-sm text-destructive/80 mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.push("/datasets")}>
            Back to Datasets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <PageHeader
        breadcrumbs={[
          { label: "Context", href: "/datasets" },
          { label: dataset.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <AddFilesDialog
              datasetId={dataset.id}
              onSeeded={() => {
                fetchEvents();
                fetchFiles();
              }}
            />
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={
                loading || eventsLoading || filesLoading || viewsLoading
              }
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading || eventsLoading || viewsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
        fixed={true}
      />

      <div className="p-4">
        <div className="space-y-6">
          {/* Dataset Info Card */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">{dataset.name}</h2>
                {dataset.description && (
                  <p className="text-muted-foreground mb-4">
                    {dataset.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Storage:</span>
                    <span className="capitalize">{dataset.storage_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Last Updated:</span>
                    <span>
                      {formatDate(
                        dataset.last_updated_at || dataset.updated_at,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Events, Files, and Views tabs */}
          <Tabs defaultValue="events" className="w-full">
            <TabsList>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="views">Views</TabsTrigger>
            </TabsList>
            <TabsContent value="events" className="mt-4">
              <EventsTable events={events} loading={eventsLoading} />
            </TabsContent>
            <TabsContent value="files" className="mt-4">
              <DatasetFilesTable
                files={files}
                loading={filesLoading}
                onDeleteFile={handleDeleteFile}
              />
            </TabsContent>
            <TabsContent value="views" className="mt-4">
              <ViewsTable
                views={views}
                datasetId={dataset.id}
                loading={viewsLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
