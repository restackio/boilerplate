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
import { DatasetRowsTable, DatasetView } from "../components/dataset-rows-table";
import { UploadCSVDialog } from "../components/upload-csv-dialog";
import { EnrichDialog } from "../components/enrich-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { Table as TableIcon, Activity } from "lucide-react";


export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("table");
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [views, setViews] = useState<DatasetView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [savingView, setSavingView] = useState(false);
  
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
        const datasetData = result.data as Dataset;
        setDataset(datasetData);
        
        // Load views from storage_config
        const storageConfig = datasetData.storage_config || {};
        const viewsData = (storageConfig.views || []) as DatasetView[];
        setViews(viewsData);
        
        // Set current view to default or first view
        const defaultViewId = storageConfig.default_view_id as string | undefined;
        if (defaultViewId) {
          setCurrentViewId(defaultViewId);
        } else if (viewsData.length > 0) {
          const defaultView = viewsData.find((v) => v.is_default);
          if (defaultView) {
            setCurrentViewId(defaultView.id);
          } else {
            setCurrentViewId(viewsData[0].id);
          }
        } else {
          setCurrentViewId(null);
        }
      } else {
        setError(result.error || "Dataset not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dataset");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isReady, datasetId, executeWorkflow]);

  // Fetch events and merge enrichment results
  const fetchEvents = useCallback(async () => {
    if (!currentWorkspaceId || !isReady) {
      return;
    }
    
    try {
      setEventsLoading(true);
      
      // Query all events (context_row and enrichment_result)
      const result = await executeWorkflow("QueryDatasetEventsWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        limit: 1000, // Increased limit to get all rows and enrichments
        offset: 0,
      });
      

      // Extract events from consistent payload structure
      const responseData = result.data as { success?: boolean; events?: PipelineEvent[] };
      const allEvents = responseData?.events || [];
      
      if (result.success && responseData?.success && Array.isArray(allEvents)) {
        // Separate context rows and enrichment results
        const contextRows = allEvents.filter(e => e.event_name === 'context_row');
        const enrichmentResults = allEvents.filter(e => e.event_name === 'enrichment_result');
        
        // Merge enrichment results into context rows
        // Enrichment results have structure: { row_id, run_id, column_name, value }
        const mergedEvents: PipelineEvent[] = contextRows.map(contextRow => {
          // Find enrichment results for this row (by row_id in raw_data)
          const enrichments = enrichmentResults.filter(er => {
            const erData = er.raw_data as { row_id?: string };
            return erData?.row_id === contextRow.id;
          });
          
          // Merge enrichment results into raw_data as columns
          const mergedRawData = { ...contextRow.raw_data };
          enrichments.forEach(er => {
            const erData = er.raw_data as { 
              row_id?: string; 
              run_id?: string; 
              column_name?: string; 
              value?: unknown;
              // Support legacy format for backward compatibility
              result?: Record<string, unknown>;
            };
            
            if (erData?.column_name && erData?.value !== undefined) {
              // New format: add value as a column with column_name as the key
              mergedRawData[erData.column_name] = erData.value;
            } else if (erData?.result) {
              // Legacy format: merge result object into raw_data
              Object.assign(mergedRawData, erData.result);
            }
          });
          
          return {
            ...contextRow,
            raw_data: mergedRawData,
          };
        });
        
        // Sort by timestamp (latest first)
        const sortedEvents = mergedEvents.sort((a: PipelineEvent, b: PipelineEvent) => 
          new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
        );
        
        setEvents(sortedEvents);
        
        // Extract unique column names from all merged raw_data for enrichment
        const allColumnNames = new Set<string>();
        sortedEvents.forEach(event => {
          Object.keys(event.raw_data || {}).forEach(key => allColumnNames.add(key));
        });
        setAvailableColumns(Array.from(allColumnNames).sort());
      } else {
        setEvents([]);
        setAvailableColumns([]);
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
  }, [currentWorkspaceId, isReady, datasetId, fetchDataset]);

  useEffect(() => {
    if (currentWorkspaceId && isReady && datasetId) {
      fetchEvents();
    }
  }, [currentWorkspaceId, isReady, datasetId, fetchEvents]);

  const handleRefresh = () => {
    fetchDataset();
    fetchEvents();
  };

  const handleSaveView = async (name: string, columns: string[], isDefault: boolean) => {
    if (!currentWorkspaceId || !isReady || !datasetId) return;
    
    try {
      setSavingView(true);
      
      // Generate new view ID
      const newViewId = `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare views - if isDefault, unset other defaults
      const updatedViews = views.map((v) => ({
        ...v,
        is_default: isDefault ? false : v.is_default,
      }));
      
      updatedViews.push({
        id: newViewId,
        name,
        columns,
        is_default: isDefault,
      });
      
      const defaultViewId = isDefault ? newViewId : (dataset?.storage_config?.default_view_id || null);
      
      const result = await executeWorkflow("DatasetsUpdateViewsWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        views: updatedViews,
        default_view_id: defaultViewId,
      });
      
      if (result.success && result.data) {
        setViews(updatedViews);
        setCurrentViewId(newViewId);
        // Refresh dataset to get updated storage_config
        await fetchDataset();
      } else {
        throw new Error(result.error || "Failed to save view");
      }
    } catch (err) {
      console.error("Failed to save view:", err);
      throw err;
    } finally {
      setSavingView(false);
    }
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
          <div className="flex items-center gap-2">
            <UploadCSVDialog datasetId={datasetId} onUploadSuccess={handleRefresh} />
            <EnrichDialog 
              datasetId={datasetId} 
              availableColumns={availableColumns}
              onEnrichSuccess={handleRefresh} 
            />
            <Button variant="outline" onClick={handleRefresh} disabled={loading || eventsLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || eventsLoading) ? 'animate-spin' : ''}`} />
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

      {/* Tabs for Table and Events views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <DatasetRowsTable
            events={events}
            loading={eventsLoading}
            views={views}
            currentViewId={currentViewId}
            onViewChange={setCurrentViewId}
            onSaveView={handleSaveView}
            savingView={savingView}
          />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventsTable events={events} loading={eventsLoading} />
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
}