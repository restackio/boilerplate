"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getPublicAgent,
  createTaskForPublicAgent,
} from "@/app/actions/workflow";
import { AgentStreamProvider } from "@/app/(dashboard)/agents/[agentId]/providers/agent-stream-provider";
import { useAgentState } from "@/app/(dashboard)/agents/[agentId]/hooks/use-agent-state";
import { useRxjsConversation } from "@/app/(dashboard)/tasks/[taskId]/hooks/use-rxjs-conversation";
import type { OpenAIEvent } from "@/app/(dashboard)/tasks/[taskId]/types";
import { TaskChatInterface } from "@/app/(dashboard)/tasks/[taskId]/components";
import { PromptInput } from "@workspace/ui/components/ai-elements/prompt-input";
import { CenteredLoading } from "@workspace/ui/components/loading-states";

interface PublicAgent {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
}

const TASK_STATUSES = [
  "in_progress",
  "in_review",
  "closed",
  "completed",
  "failed",
] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

function isTaskStatus(s: string | undefined): s is TaskStatus {
  return s !== undefined && TASK_STATUSES.includes(s as TaskStatus);
}

interface PublicTask {
  id: string;
  temporal_agent_id?: string;
  workspace_id?: string;
  status?: string;
  agent_state?: { events?: unknown[]; todos?: unknown[]; subtasks?: unknown[] };
}

function PublicChatInner({ task }: { task: PublicTask }) {
  const [chatMessage, setChatMessage] = useState("");
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

  const { conversation } = useRxjsConversation({
    responseState: responseState as
      | { events: OpenAIEvent[]; [key: string]: unknown }
      | false,
    agentResponses: (agentResponses as { events?: OpenAIEvent[]; [key: string]: unknown }[]) ?? [],
    persistedState: task.agent_state as
      | { events?: OpenAIEvent[]; todos?: unknown[]; subtasks?: unknown[]; messages?: unknown[]; metadata?: Record<string, unknown> }
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
      responseState={responseState}
      task={{
          id: task.id,
          title: "",
          status: isTaskStatus(task.status) ? task.status : "in_progress",
          agent_id: "",
          agent_name: "",
          assigned_to_id: "",
          assigned_to_name: "",
          agent_state: task.agent_state,
        }}
      taskId={taskId}
    />
  );
}

export default function PublicChatPage() {
  const params = useParams();
  const agentId = params?.agentId as string;
  const [agent, setAgent] = useState<PublicAgent | null | undefined>(undefined);
  const [task, setTask] = useState<PublicTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startMessage, setStartMessage] = useState("");

  useEffect(() => {
    if (!agentId) {
      setAgent(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicAgent(agentId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setAgent(res.data as PublicAgent);
        } else {
          setAgent(null);
          setError(res.error ?? "Agent not found");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgent(null);
          setError("Failed to load agent");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const handleStartConversation = useCallback(
    async (message: string) => {
      if (!agentId || !message.trim() || creating) return;
      setCreating(true);
      setError(null);
      try {
        const res = await createTaskForPublicAgent({
          agent_id: agentId,
          title: "Chat",
          description: message.trim(),
        });
        if (res.success && res.data) {
          setTask(res.data as PublicTask);
        } else {
          setError(res.error ?? "Failed to start conversation");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start conversation",
        );
      } finally {
        setCreating(false);
      }
    },
    [agentId, creating],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <CenteredLoading message="Loading..." height="min-h-screen" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Agent not found
          </h1>
          <p className="text-muted-foreground text-sm">
            {error ||
              "This agent does not exist or is not available for public chat."}
          </p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-muted-foreground text-sm mb-4">
            Start a conversation. No login required.
          </p>
          <div className="w-full max-w-xl">
            <PromptInput
              prompt={startMessage}
              onPromptChange={setStartMessage}
              onSubmit={() => handleStartConversation(startMessage)}
              placeholder="Type your message..."
              disabled={creating}
              isLoading={creating}
            />
          </div>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </main>
      </div>
    );
  }

  const agentTaskId = task.temporal_agent_id;
  if (!agentTaskId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <p className="text-muted-foreground">Unable to load conversation.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <main className="flex-1 flex flex-col min-h-0">
        <AgentStreamProvider agentTaskId={agentTaskId} taskStatus={task.status}>
          <PublicChatInner task={task} />
        </AgentStreamProvider>
      </main>
    </div>
  );
}
