import { Button } from "@workspace/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { X } from "lucide-react";
import { ConversationItem } from "../types";
import { TaskDetailsTab } from "./TaskDetailsTab";
import { Task } from "@/hooks/use-workspace-scoped-actions";
import { StatusIcon } from "./base/ContentDisplay";

interface TaskSplitViewProps {
  showSplitView: boolean;
  selectedCard: ConversationItem | null;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onCloseSplitView: () => void;
  task: Task;
  onUpdateTask: (updates: Partial<Task>) => Promise<void>;
  isUpdating: boolean;
}

export function TaskSplitView({
  showSplitView,
  selectedCard,
  activeTab,
  onActiveTabChange,
  onCloseSplitView,
  task,
  onUpdateTask,
  isUpdating,
}: TaskSplitViewProps) {
  if (!showSplitView) return null;

  return (
    <div className="w-4/5 bg-neutral-100 dark:bg-neutral-800 min-h-screen">
      <div className="p-4 space-y-4">
        {/* Header with close button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedCard?.type === "mcp_call" ? "Tool" : 
             selectedCard?.type === "mcp_list_tools" ? "List tools" :
             selectedCard?.type === "mcp_approval_request" ? "Approval" :
             selectedCard?.type === "web_search_call" ? "Web Search" :
             selectedCard?.type === "reasoning" ? "Reasoning" :
             "Message"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseSplitView}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={onActiveTabChange}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="task">Task</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            {selectedCard ? (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border p-4 space-y-4">
                
                {/* Item Type and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-sm">{selectedCard.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center space-x-2">
                      <StatusIcon status={selectedCard.openai_output?.status || 'unknown'} />
                      <span className="text-sm">{selectedCard.openai_output?.status || 'unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {selectedCard.openai_output?.content && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Content</label>
                    <div className="text-sm bg-neutral-50 dark:bg-neutral-800 p-2 rounded mt-1 whitespace-pre-wrap break-words">
                      {Array.isArray(selectedCard.openai_output.content) 
                        ? selectedCard.openai_output.content.map(c => c.text).join('\n')
                        : String(selectedCard.openai_output.content)}
                    </div>
                  </div>
                )}

                {/* Tool-specific information */}
                {selectedCard.openai_output?.name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tool Name</label>
                    <p className="text-sm font-mono bg-blue-50 dark:bg-blue-950/20 p-2 rounded mt-1">{selectedCard.openai_output.name}</p>
                  </div>
                )}

                {selectedCard.openai_output?.server_label && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Server</label>
                    <p className="text-sm font-mono bg-blue-50 dark:bg-blue-950/20 p-2 rounded mt-1">{selectedCard.openai_output.server_label}</p>
                  </div>
                )}

                {selectedCard.openai_output?.arguments && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Arguments</label>
                    <pre className="text-xs bg-purple-50 dark:bg-purple-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
                      {JSON.stringify(selectedCard.openai_output.arguments, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedCard.openai_output?.output && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tool Output</label>
                    <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
                      {typeof selectedCard.openai_output.output === 'string' 
                        ? selectedCard.openai_output.output 
                        : JSON.stringify(selectedCard.openai_output.output, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedCard.openai_output?.tools && Array.isArray(selectedCard.openai_output.tools) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Available Tools ({selectedCard.openai_output.tools.length})</label>
                    <div className="space-y-2 mt-1 max-h-32 overflow-auto">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedCard.openai_output.tools.slice(0, 5).map((tool: any, index: number) => (
                        <div key={index} className="text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded border">
                          <strong>{tool.name}</strong>: {tool.description}
                        </div>
                      ))}
                      {selectedCard.openai_output.tools.length > 5 && (
                        <p className="text-xs text-muted-foreground">... and {selectedCard.openai_output.tools.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedCard.openai_output?.action && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Action Details</label>
                    <pre className="text-xs bg-orange-50 dark:bg-orange-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
                      {JSON.stringify(selectedCard.openai_output.action, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedCard.openai_output?.summary && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Summary</label>
                    <div className="text-sm bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded mt-1 whitespace-pre-wrap break-words">
                      {Array.isArray(selectedCard.openai_output.summary) 
                        ? selectedCard.openai_output.summary.map(s => s.text || s).join('\n\n')
                        : String(selectedCard.openai_output.summary)}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm">{new Date(selectedCard.timestamp).toLocaleString()}</p>
                </div>

                {/* Raw Data (collapsible) */}
                <div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      Debug
                    </summary>
                    <pre className="text-xs overflow-auto max-h-64 bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-2 whitespace-pre-wrap break-words max-w-full">
                      {JSON.stringify(selectedCard.openai_output, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border p-8 text-center">
                <div className="text-muted-foreground">
                  <p className="text-lg font-medium mb-2">No item selected</p>
                  <p className="text-sm">Click on any conversation item to view its details</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="task" className="space-y-4">
            <TaskDetailsTab
              task={task}
              onUpdateTask={onUpdateTask}
              isLoading={isUpdating}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 