import { Button } from "@workspace/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { X } from "lucide-react";
import { ConversationItem } from "../types";
import { TaskLogsTab } from "./TaskLogsTab";
import { TaskDetailsTab } from "./TaskDetailsTab";
import { Task } from "@/hooks/use-workspace-scoped-actions";

// Helper function to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "success":
      return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    case "error":
      return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    case "pending":
      return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
    default:
      return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
  }
};

interface TaskSplitViewProps {
  showSplitView: boolean;
  selectedCard: ConversationItem | null;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onCloseSplitView: () => void;
  task: Task;
  agentResponses: any[];
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
  agentResponses,
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
            {selectedCard?.type === "tool-call" ? "Tool Call Details" : 
             selectedCard?.type === "tool-list" ? "Available Tools" : 
             "Message Details"}
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
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs" className="space-y-4">
            <TaskLogsTab taskId={task.id} agentResponses={agentResponses} />
            {selectedCard && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border p-4 space-y-4">
                <h4 className="font-medium">Selected Item Details</h4>
                
                {/* Item Type and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-sm">{selectedCard.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedCard.status)}
                      <span className="text-sm">{selectedCard.status || 'unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Content</label>
                  <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1 whitespace-pre-wrap break-words">{selectedCard.content}</div>
                </div>

                {/* Tool-specific information */}
                {selectedCard.toolName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tool Name</label>
                    <p className="text-sm font-mono bg-blue-50 dark:bg-blue-950/20 p-2 rounded mt-1">{selectedCard.toolName}</p>
                  </div>
                )}

                {selectedCard.toolOutput && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tool Output</label>
                    <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
                      {selectedCard.toolOutput}
                    </pre>
                  </div>
                )}

                {selectedCard.details && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Details</label>
                    <div className="text-sm bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded mt-1 whitespace-pre-wrap break-words">{selectedCard.details}</div>
                  </div>
                )}

                {/* Timestamp */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm">{new Date(selectedCard.timestamp).toLocaleString()}</p>
                </div>

                {/* Raw Data (collapsible) */}
                {selectedCard.rawData && (
                  <div>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        Raw Response Data
                      </summary>
                      <pre className="text-xs overflow-auto max-h-64 bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 whitespace-pre-wrap break-words max-w-full">
                        {JSON.stringify(selectedCard.rawData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
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