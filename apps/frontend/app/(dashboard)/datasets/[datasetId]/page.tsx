"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Database, 
  ArrowLeft, 
  RefreshCw
} from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Dataset } from "../components/datasets-table";
import { EventsTable, PipelineEvent } from "../components/events-table";


export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
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
      
      console.log("DatasetsGetByIdWorkflow result:", result);
      
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
    console.log("fetchEvents called with:", { currentWorkspaceId, isReady, datasetId });
    if (!currentWorkspaceId || !isReady) {
      console.log("fetchEvents early return - missing workspace or not ready");
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
      
      console.log("QueryDatasetEventsWorkflow result:", result);
      
      // Extract events from consistent payload structure
      const responseData = result.data as { success?: boolean; events?: PipelineEvent[] };
      const events = responseData?.events || [];
      
      console.log("Extracted events:", events);
      
      if (result.success && responseData?.success && Array.isArray(events)) {
        // Sort events by timestamp (latest first)
        const sortedEvents = events.sort((a: PipelineEvent, b: PipelineEvent) => 
          new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
        );
        
        console.log("Setting events:", sortedEvents);
        setEvents(sortedEvents);
      } else {
        console.log("No events found in result:", result);
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  useEffect(() => {
    if (currentWorkspaceId && isReady && datasetId) {
      fetchEvents();
    }
  }, [currentWorkspaceId, isReady, datasetId, fetchEvents]);

  const handleRefresh = () => {
    fetchDataset();
    fetchEvents();
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
          <h3 className="font-medium text-destructive mb-2">Dataset not found</h3>
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
          { label: dataset.name }
        ]}
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={loading || eventsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || eventsLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
              <p className="text-muted-foreground mb-4">{dataset.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">Storage:</span>
                <span className="capitalize">{dataset.storage_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Last Updated:</span>
                <span>{formatDate(dataset.last_updated_at || dataset.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <EventsTable events={events} loading={eventsLoading} />
        </div>
      </div>
    </div>
  );
}