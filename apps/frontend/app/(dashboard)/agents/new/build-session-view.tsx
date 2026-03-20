"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Task } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { AgentStreamProvider } from "@/app/(dashboard)/agents/[agentId]/providers/agent-stream-provider";
import { useAgentState } from "@/app/(dashboard)/agents/[agentId]/hooks/use-agent-state";
import { useRxjsConversation } from "@/app/(dashboard)/tasks/[taskId]/hooks/use-rxjs-conversation";
import type { OpenAIEvent } from "@/app/(dashboard)/tasks/[taskId]/types";
import {
  TaskChatInterface,
  TaskHeader,
} from "@/app/(dashboard)/tasks/[taskId]/components";
import { getBuildCreatedDatasetId } from "@/app/(dashboard)/tasks/[taskId]/components/task-created-list";
import { DeployAgentDialog } from "@/app/(dashboard)/agents/[agentId]/components/deploy-agent-dialog";
import { BuildCanvas, type BuildSummary } from "./components/build-canvas";

function BuildChatInner({
  task,
  onFilesAdded,
  filesRefreshTrigger,
  onRefreshTask,
  hideCreatedList = false,
  onBuildClickRef,
}: {
  task: Task;
  onFilesAdded?: () => void;
  filesRefreshTrigger?: number;
  onRefreshTask?: () => void | Promise<void>;
  hideCreatedList?: boolean;
  onBuildClickRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [chatMessage, setChatMessage] = useState("");
  const { currentWorkspaceId } = useDatabaseWorkspace();
  const taskId = task.id;
  const agentTaskId = task.temporal_agent_id;

  const {
    responseState,
    agentResponses,
    loading: agentLoading,
    sendMessageToAgent,
  } = useAgentState({
    taskId,
    agentTaskId: agentTaskId ?? undefined,
    taskStatus: task.status,
  });

  const agentResponsesList = Array.isArray(agentResponses)
    ? (agentResponses as { events?: OpenAIEvent[]; [key: string]: unknown }[])
    : agentResponses
      ? [agentResponses as { events?: OpenAIEvent[]; [key: string]: unknown }]
      : [];

  const { conversation } = useRxjsConversation({
    responseState: responseState as
      | { events: OpenAIEvent[]; [key: string]: unknown }
      | false,
    agentResponses: agentResponsesList,
    persistedState: task.agent_state as
      | {
          events?: OpenAIEvent[];
          todos?: unknown[];
          subtasks?: unknown[];
          messages?: unknown[];
          metadata?: Record<string, unknown>;
        }
      | undefined,
    storeKey: taskId,
  });

  const handleSend = useCallback(async () => {
    if (!chatMessage.trim()) return;
    try {
      setChatMessage("");
      await sendMessageToAgent(chatMessage);
    } catch (err) {
      console.error("Send failed:", err);
    }
  }, [chatMessage, sendMessageToAgent]);

  const preferredDatasetId = getBuildCreatedDatasetId(task);

  const handleBuildClick = useCallback(async () => {
    try {
      await sendMessageToAgent("Build");
    } catch (err) {
      console.error("Build send failed:", err);
    }
  }, [sendMessageToAgent]);

  useEffect(() => {
    if (onBuildClickRef) onBuildClickRef.current = handleBuildClick;
    return () => {
      if (onBuildClickRef) onBuildClickRef.current = null;
    };
  }, [onBuildClickRef, handleBuildClick]);

  return (
    <TaskChatInterface
      conversation={conversation}
      chatMessage={chatMessage}
      onChatMessageChange={setChatMessage}
      onSendMessage={handleSend}
      agentLoading={agentLoading}
      showSplitView={false}
      fillContainer
      responseState={responseState}
      task={task}
      taskId={taskId}
      agentId={task.agent_id}
      workspaceId={currentWorkspaceId ?? undefined}
      onFilesAdded={onFilesAdded}
      filesRefreshTrigger={filesRefreshTrigger}
      onRefreshTask={onRefreshTask}
      preferredDatasetId={preferredDatasetId}
      temporalAgentId={agentTaskId ?? undefined}
      onBuildClick={handleBuildClick}
      hideCreatedList={hideCreatedList}
      hideFilesList={hideCreatedList}
    />
  );
}

function BuildPageContent({
  task,
  onRefetch,
  onFilesAdded,
  filesRefreshTrigger,
  hideCreatedList = false,
  onBuildClickRef,
}: {
  task: Task;
  onRefetch: () => void;
  onFilesAdded?: () => void;
  filesRefreshTrigger?: number;
  hideCreatedList?: boolean;
  onBuildClickRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const agentTaskId = task.temporal_agent_id;
  if (!agentTaskId) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Unable to load conversation.
      </div>
    );
  }
  return (
    <AgentStreamProvider
      agentTaskId={agentTaskId}
      taskStatus={task.status}
      initialState={task.agent_state}
      onResponseComplete={onRefetch}
      onAgentStateUpdated={onRefetch}
    >
      <BuildChatInner
        task={task}
        onFilesAdded={onFilesAdded}
        filesRefreshTrigger={filesRefreshTrigger}
        onRefreshTask={onRefetch}
        hideCreatedList={hideCreatedList}
        onBuildClickRef={onBuildClickRef}
      />
    </AgentStreamProvider>
  );
}

export interface BuildSessionViewProps {
  task: Task;
  /** Called when task should be refetched (e.g. after agent response). Parent updates task state. */
  onTaskRefetch?: () => void | Promise<void>;
  /** Optional: called when user publishes from Deploy dialog (e.g. create/publish agent from build). */
  onPublish?: () => void | Promise<void>;
  isPublishing?: boolean;
  /** Called when user clicks Delete (e.g. open delete confirmation dialog). */
  onDelete?: () => void;
  /** Called when user updates task (e.g. archive = status "closed", mark completed/failed). */
  onUpdateTask?: (updates: Partial<Task>) => Promise<void>;
  /** Build summary (agents, datasets, tasks, view_specs) for the left canvas. Fetched by parent. */
  buildSummary?: BuildSummary | null;
  buildSummaryLoading?: boolean;
  buildSummaryError?: string | null;
  /** Refetch build summary (e.g. after task refetch). */
  onRefreshBuildSummary?: () => void | Promise<void>;
  /** Increment (e.g. on a timer) to refresh task files list in the Data section. */
  filesPollTick?: number;
}

export function BuildSessionView({
  task,
  onTaskRefetch,
  onPublish,
  isPublishing = false,
  onDelete,
  onUpdateTask,
  buildSummary,
  buildSummaryLoading = false,
  buildSummaryError = null,
  onRefreshBuildSummary,
  filesPollTick = 0,
}: BuildSessionViewProps) {
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [filesRefreshTrigger, setFilesRefreshTrigger] = useState(0);
  const buildClickRef = useRef<(() => void) | null>(null);
  const onRefetch = useCallback(() => {
    onTaskRefetch?.();
    onRefreshBuildSummary?.();
  }, [onTaskRefetch, onRefreshBuildSummary]);
  const handleFilesAdded = useCallback(() => {
    onTaskRefetch?.();
    onRefreshBuildSummary?.();
    setFilesRefreshTrigger((n) => n + 1);
  }, [onTaskRefetch, onRefreshBuildSummary]);

  const handlePublish = useCallback(async () => {
    await onPublish?.();
  }, [onPublish]);

  const buildBreadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: "New agent", href: "/agents/new" },
    { label: task.title || "Build" },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <TaskHeader
        task={task}
        breadcrumbs={buildBreadcrumbs}
        onDeploy={() => setShowDeployDialog(true)}
        isPublishing={isPublishing}
        onDelete={onDelete ?? (() => {})}
        onUpdateTask={onUpdateTask ?? (async () => {})}
        onOpenAnalytics={() => {}}
      />
      <DeployAgentDialog
        isOpen={showDeployDialog}
        onClose={() => setShowDeployDialog(false)}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
      {/* Two columns: left = build canvas, right = chat */}
      <div className="flex flex-1 min-h-0 w-full gap-0 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col border-r">
          <BuildCanvas
            task={task}
            buildSummary={buildSummary}
            buildSummaryLoading={buildSummaryLoading}
            buildSummaryError={buildSummaryError}
            onRefresh={onRefreshBuildSummary}
            filesRefreshTrigger={filesRefreshTrigger + filesPollTick}
            responseState={task.agent_state}
            onBuildClick={() => buildClickRef.current?.()}
          />
        </div>
        <div className="w-1/3 shrink-0 flex flex-col min-h-0 h-full overflow-hidden">
          <div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden">
            <BuildPageContent
              task={task}
              onRefetch={onRefetch}
              onFilesAdded={handleFilesAdded}
              filesRefreshTrigger={filesRefreshTrigger}
              hideCreatedList
              onBuildClickRef={buildClickRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
