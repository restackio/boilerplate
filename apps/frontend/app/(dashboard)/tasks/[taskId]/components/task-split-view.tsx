import { SplitViewPanel } from "@workspace/ui/components/split-view-panel";
import { StatusIcon } from "@workspace/ui/components/status-indicators";
import { ConversationItem } from "../types";
import { TaskDetailsTab } from "./task-details-tab";
import { Task } from "@/hooks/use-workspace-scoped-actions";

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
  // Helper function to get title based on selected item
  const getItemTitle = (item: ConversationItem | null) => {
    if (!item) return "No item selected";
    
    switch (item.type) {
      case "mcp_call": return "Tool";
      case "mcp_list_tools": return "List tools";
      case "mcp_approval_request": return "Approval";
      case "web_search_call": return "Web Search";
      case "reasoning": return "Reasoning";
      case "error": return "Error Details";
      default: return "Message";
    }
  };

  // Custom detail renderer for conversation items
  const renderItemDetails = (item: ConversationItem) => (
    <div className="bg-background rounded-lg border p-4 space-y-4">
      {/* Item Type and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Type</label>
          <p className="text-sm">{item.type}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <div className="flex items-center space-x-2">
            <StatusIcon status={(item.openai_output?.status as any) || 'pending'} />
            <span className="text-sm">{item.openai_output?.status || 'unknown'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {item.openai_output?.content && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Content</label>
          <div className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap break-words">
            {Array.isArray(item.openai_output.content) 
              ? item.openai_output.content.map(c => c.text).join('\n')
              : String(item.openai_output.content)}
          </div>
        </div>
      )}

      {/* Tool-specific information */}
      {item.openai_output?.name && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Tool Name</label>
          <p className="text-sm font-mono bg-blue-50 dark:bg-blue-950/20 p-2 rounded mt-1">{item.openai_output.name}</p>
        </div>
      )}

      {item.openai_output?.server_label && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Server</label>
          <p className="text-sm font-mono bg-blue-50 dark:bg-blue-950/20 p-2 rounded mt-1">{item.openai_output.server_label}</p>
        </div>
      )}

      {item.openai_output?.arguments && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Arguments</label>
          <pre className="text-xs bg-purple-50 dark:bg-purple-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
            {JSON.stringify(item.openai_output.arguments, null, 2)}
          </pre>
        </div>
      )}

      {item.openai_output?.output && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Tool Output</label>
          <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
            {typeof item.openai_output.output === 'string' 
              ? item.openai_output.output 
              : JSON.stringify(item.openai_output.output, null, 2)}
          </pre>
        </div>
      )}

      {item.openai_output?.tools && Array.isArray(item.openai_output.tools) && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Available Tools ({item.openai_output.tools.length})</label>
          <div className="space-y-2 mt-1 max-h-32 overflow-auto">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {item.openai_output.tools.slice(0, 5).map((tool: any, index: number) => (
              <div key={index} className="text-xs bg-muted p-2 rounded border">
                <strong>{tool.name}</strong>: {tool.description}
              </div>
            ))}
            {item.openai_output.tools.length > 5 && (
              <p className="text-xs text-muted-foreground">... and {item.openai_output.tools.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {item.openai_output?.action && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Action Details</label>
          <pre className="text-xs bg-orange-50 dark:bg-orange-950/20 p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
            {JSON.stringify(item.openai_output.action, null, 2)}
          </pre>
        </div>
      )}

      {item.openai_output?.summary && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Summary</label>
          <div className="text-sm bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded mt-1 whitespace-pre-wrap break-words">
            {Array.isArray(item.openai_output.summary) 
              ? item.openai_output.summary.map(s => s.text || s).join('\n\n')
              : String(item.openai_output.summary)}
          </div>
        </div>
      )}

      {/* Error Details */}
      {item.error && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Error Type</label>
            <p className="text-sm font-mono bg-red-50 dark:bg-red-950/20 p-2 rounded mt-1">
              {item.error.error_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Error Source</label>
            <p className="text-sm font-mono bg-red-50 dark:bg-red-950/20 p-2 rounded mt-1">
              {item.error.error_source}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Error Message</label>
            <div className="text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded mt-1 whitespace-pre-wrap break-words">
              {item.error.error_message}
            </div>
          </div>
          
          {item.error.error_details && Object.keys(item.error.error_details).length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Technical Details</label>
              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-words max-w-full">
                {JSON.stringify(item.error.error_details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
        <p className="text-sm">{new Date(item.timestamp).toLocaleString()}</p>
      </div>

      {/* Raw Data (collapsible) */}
      <div>
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Debug
          </summary>
          <pre className="text-xs overflow-auto max-h-64 bg-muted p-2 rounded mt-2 whitespace-pre-wrap break-words max-w-full">
            {JSON.stringify(item.openai_output, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );

  // Define tabs for the split view
  const tabs = [
    {
      id: "details",
      label: "Details",
      content: selectedCard ? renderItemDetails(selectedCard) : null,
    },
    {
      id: "task",
      label: "Task",
      content: (
        <TaskDetailsTab
          task={task}
          onUpdateTask={onUpdateTask}
          isLoading={isUpdating}
        />
      ),
    },
  ];

  return (
    <SplitViewPanel
      isOpen={showSplitView}
      onClose={onCloseSplitView}
      title={getItemTitle(selectedCard)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onActiveTabChange}
      width="w-4/5"
      className="bg-muted"
    />
  );
} 