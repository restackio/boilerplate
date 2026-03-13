"use client";

import { useCallback, useState } from "react";
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
import { DeployAgentDialog } from "@/app/(dashboard)/agents/[agentId]/components/deploy-agent-dialog";

function BuildChatInner({
  task,
  onFilesAdded,
  filesRefreshTrigger,
  onRefreshTask,
}: {
  task: Task;
  onFilesAdded?: () => void;
  filesRefreshTrigger?: number;
  onRefreshTask?: () => void | Promise<void>;
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
    />
  );
}

function BuildPageContent({
  task,
  onRefetch,
  onFilesAdded,
  filesRefreshTrigger,
}: {
  task: Task;
  onRefetch: () => void;
  onFilesAdded?: () => void;
  filesRefreshTrigger?: number;
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
      onResponseComplete={onRefetch}
    >
      <BuildChatInner
        task={task}
        onFilesAdded={onFilesAdded}
        filesRefreshTrigger={filesRefreshTrigger}
        onRefreshTask={onRefetch}
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
}

export function BuildSessionView({
  task,
  onTaskRefetch,
  onPublish,
  isPublishing = false,
}: BuildSessionViewProps) {
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [filesRefreshTrigger, setFilesRefreshTrigger] = useState(0);
  const onRefetch = useCallback(() => {
    onTaskRefetch?.();
  }, [onTaskRefetch]);
  const handleFilesAdded = useCallback(() => {
    onTaskRefetch?.();
    setFilesRefreshTrigger((n) => n + 1);
  }, [onTaskRefetch]);

  const handlePublish = useCallback(async () => {
    await onPublish?.();
  }, [onPublish]);

  const buildBreadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: "New agent", href: "/agents/new" },
    { label: task.title || "Build" },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full">
      <TaskHeader
        task={task}
        breadcrumbs={buildBreadcrumbs}
        onDeploy={() => setShowDeployDialog(true)}
        isPublishing={isPublishing}
        onDelete={() => {}}
        onUpdateTask={async () => {}}
        onOpenAnalytics={() => {}}
      />
      <DeployAgentDialog
        isOpen={showDeployDialog}
        onClose={() => setShowDeployDialog(false)}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
      {/* Chat only: same layout as task detail page (header + full-width chat, no split). */}
      <div className="flex flex-1 min-h-0 w-full">
        <BuildPageContent
          task={task}
          onRefetch={onRefetch}
          onFilesAdded={handleFilesAdded}
          filesRefreshTrigger={filesRefreshTrigger}
        />
      </div>
    </div>
  );
}
