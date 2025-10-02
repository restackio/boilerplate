"use client";

import { useState } from "react";
import {
  Database,
  Activity,
  Tag,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";

// Pipeline Event data type
export interface PipelineEvent {
  id: string;
  agent_id: string;
  task_id: string | null;
  event_name: string;
  raw_data: Record<string, unknown>;
  transformed_data: Record<string, unknown> | null;
  tags: string[];
  event_timestamp: string;
}

// Column configuration helper
const etf = createColumnConfigHelper<PipelineEvent>();

export const eventsColumnsConfig = [
  etf
    .option()
    .id("event_name")
    .accessor((row: PipelineEvent) => row.event_name)
    .displayName("Event")
    .icon(Activity)
    .build(),
  etf
    .option()
    .id("agent_id")
    .accessor((row: PipelineEvent) => row.agent_id)
    .displayName("Agent ID")
    .icon(Activity)
    .build(),
  etf
    .option()
    .id("tags")
    .accessor((row: PipelineEvent) => row.tags.join(", "))
    .displayName("Tags")
    .icon(Tag)
    .build(),
  etf
    .option()
    .id("event_timestamp")
    .accessor((row: PipelineEvent) => row.event_timestamp)
    .displayName("Timestamp")
    .icon(Calendar)
    .build(),
] as const;

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

interface EventsTableProps {
  events: PipelineEvent[];
  loading?: boolean;
}

export function EventsTable({ events, loading = false }: EventsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});

  // Data table filters for events
  const { columns, filters, actions, strategy, filteredData } = useDataTableFilters({
    strategy: "client",
    data: events,
    columnsConfig: eventsColumnsConfig,
    options: {},
  });

  const toggleRowExpansion = (eventId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
        // Set default tab to properties when expanding
        setActiveTab(prevTabs => ({
          ...prevTabs,
          [eventId]: 'properties'
        }));
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <DataTableFilter
        filters={filters}
        columns={columns}
        actions={actions}
        strategy={strategy}
      />

      {/* Events Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Agent ID</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <EmptyState
                    icon={<Database className="h-8 w-8" />}
                    title="No events found"
                    description="No events match your current filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((event) => {
                const isExpanded = expandedRows.has(event.id);
                return (
                  <>
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpansion(event.id)}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="truncate" title={event.event_name}>
                          {event.event_name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="truncate" title={event.agent_id}>
                          {event.agent_id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {event.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {event.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{event.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(event.event_timestamp)}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${event.id}-expanded`}>
                        <TableCell colSpan={5}>
                          <div className="bg-background p-2">
                            <Tabs 
                              value={activeTab[event.id] || 'properties'} 
                              onValueChange={(value) => setActiveTab(prev => ({ ...prev, [event.id]: value }))}
                              className="w-full"
                            >
                              <TabsList className="grid w-full grid-cols-3 bg-background">
                                <TabsTrigger value="properties">Properties</TabsTrigger>
                                <TabsTrigger value="raw">Raw Data</TabsTrigger>
                                <TabsTrigger value="transformed">Transformed Data</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="properties" className="p-4 space-y-3">
                                <div className="grid gap-3 sm:w-1/2">
                                  {/* Core Event Properties */}
                                  <div className="flex items-center justify-between py-2 border-b">
                                    <span className="font-medium text-sm text-muted-foreground">Event ID</span>
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.id}</code>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(event.id)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 border-b">
                                    <span className="font-medium text-sm text-muted-foreground">Event Name</span>
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.event_name}</code>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(event.event_name)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 border-b">
                                    <span className="font-medium text-sm text-muted-foreground">Agent ID</span>
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.agent_id}</code>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(event.agent_id)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {event.task_id && (
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="font-medium text-sm text-muted-foreground">Task ID</span>
                                      <div className="flex items-center gap-2">
                                        <code className="text-xs bg-muted px-2 py-1 rounded">{event.task_id}</code>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0"
                                          onClick={() => copyToClipboard(event.task_id)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between py-2 border-b">
                                    <span className="font-medium text-sm text-muted-foreground">Timestamp</span>
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.event_timestamp}</code>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(event.event_timestamp)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2">
                                    <span className="font-medium text-sm text-muted-foreground">Tags</span>
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.tags.join(', ')}</code>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(event.tags.join(', '))}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="raw" className="p-4">
                                <div className="relative">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="absolute top-2 right-2 z-10"
                                    onClick={() => copyToClipboard(JSON.stringify(event.raw_data, null, 2))}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                  <div className="bg-card border rounded p-4 text-xs font-mono max-h-96 overflow-auto">
                                    <pre>{JSON.stringify(event.raw_data, null, 2)}</pre>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="transformed" className="p-4">
                                <div className="relative">
                                  {event.transformed_data ? (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="absolute top-2 right-2 z-10"
                                        onClick={() => copyToClipboard(JSON.stringify(event.transformed_data, null, 2))}
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                      <div className="bg-card border rounded p-4 text-xs font-mono max-h-96 overflow-auto">
                                        <pre>{JSON.stringify(event.transformed_data, null, 2)}</pre>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="bg-card border rounded p-4 text-center text-muted-foreground">
                                      No transformed data available
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredData.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {events.length} events
        </div>
      )}
    </div>
  );
}
