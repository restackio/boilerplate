import { useRef, useMemo, useState, useEffect } from "react";
import type { Task } from "@/hooks/use-workspace-scoped-actions";
import { ConversationItem } from "../types";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { ContentSection, CodeBlock } from "@workspace/ui/components/content-display";
import { PromptInput } from "@workspace/ui/components/ai-elements/prompt-input";
import { Response } from "@workspace/ui/components/ai-elements/response";
import {
  TaskCardMcp,
  TaskCardTool,
  TaskCardWebSearch,
  TaskCardError,
} from "./cards";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@workspace/ui/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@workspace/ui/components/ai-elements/reasoning";
import { useConversationItem } from "../hooks/use-conversation-item";
import { TaskTodosList } from "./task-todos-list";
import { TaskSubtasksList } from "./task-subtasks-list";
import { TaskCreatedList } from "./task-created-list";
import { TaskFilesList } from "./task-files-list";
import { FeedbackButtons } from "./feedback-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Plus,
  FileUp,
  Brain,
  MessageSquare,
  Search,
  Wrench,
  Bot,
  Database,
  LayoutGrid,
  Plug,
  ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AddTaskFilesDialog } from "./add-task-files-dialog";
import {
  isUserMessage,
  isReasoning,
  isToolCall,
  isWebSearch,
  isApprovalRequest,
  isError,
  getDisplayTitle,
  extractTextContent,
  extractToolArguments,
  extractToolOutput,
  getItemStatus,
  isItemCompleted,
  isItemPending,
} from "../utils/conversation-utils";
import type { ReactNode } from "react";

/** Detect assistant content that is only raw tool-call JSON (duplicate of tool card). */
function isToolCallSpilloverContent(text: string): boolean {
  if (!text || text.length < 30) return false;
  const t = text.trim();
  return (
    (t.includes('"workspace_id"') &&
      (t.includes('"slug"') ||
        t.includes("createdataset") ||
        t.includes("updatedataset"))) ||
    (t.includes("mcp_restack-core") &&
      (t.includes("createdataset") ||
        t.includes("updatedataset") ||
        t.includes("createview") ||
        t.includes("updateview")))
  );
}

type ChatBlock =
  | { kind: "user"; item: ConversationItem; index: number }
  | {
      kind: "agent_run";
      items: ConversationItem[];
      startIndex: number;
    };

/** Partition conversation into user messages and agent runs (until next user message). */
function partitionConversation(conversation: ConversationItem[]): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  let i = 0;
  while (i < conversation.length) {
    const item = conversation[i];
    if (isUserMessage(item)) {
      blocks.push({ kind: "user", item, index: i });
      i += 1;
      continue;
    }
    const runStart = i;
    const runItems: ConversationItem[] = [];
    while (i < conversation.length && !isUserMessage(conversation[i])) {
      runItems.push(conversation[i]);
      i += 1;
    }
    blocks.push({ kind: "agent_run", items: runItems, startIndex: runStart });
  }
  return blocks;
}

/** Whether this item should be shown as a step inside ChainOfThought (not approval/error, not final assistant). */
function isChainStep(item: ConversationItem): boolean {
  return (
    isReasoning(item) ||
    item.type === "mcp_call" ||
    item.type === "mcp_list_tools" ||
    isWebSearch(item) ||
    (item.type === "assistant" && item.openai_output?.role === "assistant")
  );
}

/** Get the final assistant message only if it is the very last item in the run (so we don't split the chain when steps come after an assistant). */
function getFinalAssistantInRun(
  items: ConversationItem[]
): ConversationItem | null {
  if (items.length === 0) return null;
  const last = items[items.length - 1];
  if (last.openai_output?.role === "assistant") return last;
  return null;
}

/** One node in the unified chain: either a step or an inline card (approval/error). */
type ChainNode =
  | { type: "step"; item: ConversationItem }
  | { type: "card"; item: ConversationItem };

/** Segment an agent run into one chain (steps + cards in order) and optional final assistant. */
function segmentAgentRun(items: ConversationItem[]): {
  nodes: ChainNode[];
  finalAssistant: ConversationItem | null;
} {
  const finalAssistant = getFinalAssistantInRun(items);
  const nodes: ChainNode[] = [];

  for (const item of items) {
    if (item === finalAssistant) continue; // final assistant rendered at end
    if (isApprovalRequest(item) || isError(item)) {
      nodes.push({ type: "card", item });
    } else if (isChainStep(item)) {
      nodes.push({ type: "step", item });
    }
  }

  return { nodes, finalAssistant };
}

/** Turn camelCase or lowercase tool names into a short title (e.g. "updateTodos" → "Update todos"). */
function humanizeToolName(name: string): string {
  if (!name || name.length === 0) return "Tool";
  const lower = name.toLowerCase();
  const known: Record<string, string> = {
    updatetodos: "Update todos",
    updatepatternspecs: "Update pattern specs",
    updateagenttool: "Update agent tool",
    mcp_list_tools: "List tools",
  };
  if (known[lower]) return known[lower];
  const withSpaces = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

/** Icons for chain steps – match task-created-list style (Bot, Database, LayoutGrid, Plug). */
const TOOL_ICON_MAP: Record<string, LucideIcon> = {
  updatetodos: ListChecks,
  updatepatternspecs: LayoutGrid,
  updateagenttool: Bot,
  updateagent: Bot,
  createagent: Bot,
  mcp_list_tools: Plug,
  listtools: Plug,
  updatedataset: Database,
  createdataset: Database,
  updateview: LayoutGrid,
  createview: LayoutGrid,
  updateintegration: Plug,
  createintegrationfromremotemcp: Plug,
  create_integration_from_remote_mcp: Plug,
};

/** Icon for a chain step: tool-specific when available, otherwise default by type. */
function getStepIcon(item: ConversationItem): LucideIcon | undefined {
  if (isReasoning(item)) return Brain;
  if (item.type === "assistant" && item.openai_output?.role === "assistant")
    return MessageSquare;
  if (isWebSearch(item)) return Search;
  if (item.type === "mcp_list_tools") return Plug;
  if (item.type === "mcp_call") {
    const name =
      ((item.openai_output?.name ?? item.openai_output?.tool) as string) ?? "";
    const key = name.replace(/_/g, "").toLowerCase();
    return TOOL_ICON_MAP[key] ?? Wrench;
  }
  return Wrench;
}

/** Expandable "View details" content: full reasoning text or tool arguments + output JSON. */
function getStepDetailsContent(item: ConversationItem): ReactNode {
  if (isReasoning(item)) {
    const summary = item.openai_output?.summary;
    const text = Array.isArray(summary)
      ? summary.map((s) => (s as { text?: string }).text ?? "").join("\n\n")
      : typeof summary === "string"
        ? summary
        : "";
    if (!text.trim()) return null;
    return (
      <div className="whitespace-pre-wrap font-mono text-xs">
        <Response>{text}</Response>
      </div>
    );
  }
  if (item.type === "assistant" && item.openai_output?.role === "assistant") {
    const text = extractTextContent(item);
    if (!text.trim()) return null;
    return (
      <div className="whitespace-pre-wrap">
        <Response>{text}</Response>
      </div>
    );
  }
  if (item.type === "mcp_call" || item.type === "mcp_list_tools") {
    const args = extractToolArguments(item);
    const output = extractToolOutput(item);
    const hasError = !!item.openai_output?.error || getItemStatus(item) === "failed";
    const parts: ReactNode[] = [];
    if (args !== undefined && args !== null) {
      const argsStr =
        typeof args === "string" ? args : JSON.stringify(args, null, 2);
      parts.push(
        <ContentSection key="args" label="Arguments">
          <CodeBlock content={argsStr} />
        </ContentSection>
      );
    }
    if (output !== undefined && output !== null) {
      const outputStr =
        typeof output === "string"
          ? output
          : JSON.stringify(output, null, 2);
      parts.push(
        <ContentSection key="output" label={hasError ? "Error details" : "Output"}>
          <CodeBlock content={outputStr} isError={hasError} />
        </ContentSection>
      );
    }
    if (parts.length === 0) return null;
    return <div className="space-y-3">{parts}</div>;
  }
  if (isWebSearch(item)) {
    const output = item.openai_output?.output ?? item.openai_output?.result;
    if (output == null) return null;
    const str =
      typeof output === "string" ? output : JSON.stringify(output, null, 2);
    return (
      <ContentSection label="Result">
        <CodeBlock content={str} />
      </ContentSection>
    );
  }
  return null;
}

/** First line of tool output for use as step description (e.g. "Workflow 'X' completed successfully"). */
function getToolOutputPreview(item: ConversationItem): string | undefined {
  const output = item.openai_output?.output ?? item.openai_output?.result;
  if (output == null) return undefined;
  if (typeof output === "string") {
    const first = output.split("\n")[0]?.trim();
    return first && first.length < 120 ? first : undefined;
  }
  if (typeof output === "object" && output !== null) {
    const o = output as Record<string, unknown>;
    const msg = [o.message, o.summary, (Array.isArray(o.content) ? (o.content[0] as { text?: string })?.text : o.content)].find(
      (v): v is string => typeof v === "string" && v.length > 0 && v.length < 120
    );
    return msg ?? undefined;
  }
  return undefined;
}

/** Label and status for a ChainOfThoughtStep from a conversation item. */
function getStepLabelAndStatus(item: ConversationItem): {
  label: string;
  description?: string;
  status: "complete" | "active" | "pending";
} {
  const status = getItemStatus(item);
  const pending = isItemPending(item);
  const completed = isItemCompleted(item);
  const stepStatus: "complete" | "active" | "pending" = completed
    ? "complete"
    : pending
      ? "active"
      : "pending";

  if (isReasoning(item)) {
    const duration =
      typeof item.reasoning_duration_seconds === "number"
        ? item.reasoning_duration_seconds
        : 0;
    const streaming = item.isStreaming ?? false;
    return {
      label: streaming ? "Thinking..." : `Thought for ${duration >= 1 ? `${duration} seconds` : "<1s"}`,
      description: streaming ? "Reasoning in progress…" : undefined,
      status: streaming ? "active" : "complete",
    };
  }
  if (item.type === "assistant" && item.openai_output?.role === "assistant") {
    const text = extractTextContent(item);
    const short =
      text.length > 100 ? `${text.slice(0, 100).trim()}…` : text || "Progress update";
    return { label: short, status: "complete" };
  }
  if (item.type === "mcp_call" || item.type === "mcp_list_tools") {
    const rawName =
      (item.openai_output?.name ?? item.openai_output?.tool ?? "Tool") as string;
    const name = humanizeToolName(rawName);
    const statusText =
      status === "completed" || status === "success"
        ? "Completed"
        : pending
          ? "Processing…"
          : status;
    const duration =
      typeof item.duration_seconds === "number" && item.duration_seconds > 0
        ? ` · ${item.duration_seconds}s`
        : "";
    const outputPreview = getToolOutputPreview(item);
    const description = outputPreview
      ? `${statusText}${duration} · ${outputPreview}`
      : `${statusText}${duration}`.trim();
    return {
      label: name,
      description: description || undefined,
      status: stepStatus,
    };
  }
  if (isWebSearch(item)) {
    const query = item.openai_output?.action?.query ?? "Search";
    const q = typeof query === "string" ? query.slice(0, 50) : "";
    return {
      label: q ? `Search: "${q}"` : "Web search",
      description: completed ? "Search completed" : pending ? "Searching…" : undefined,
      status: stepStatus,
    };
  }
  return {
    label: getDisplayTitle(item),
    status: stepStatus,
  };
}

const AGENT_PROGRESS_AUTO_CLOSE_DELAY_MS = 1000;

/** Renders one Agent progress chain: open by default, auto-collapse when all steps complete unless user toggled. Steps and cards (approval/error) are interleaved in order. */
function AgentProgressChain({
  nodes,
  chainKey,
  onApproveRequest,
  onDenyRequest,
  onCardClick,
}: {
  nodes: ChainNode[];
  chainKey: string;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const hasAutoClosedRef = useRef(false);

  const stepNodes = useMemo(
    () => nodes.filter((n): n is ChainNode & { type: "step" } => n.type === "step"),
    [nodes]
  );
  const allStepsComplete = useMemo(
    () =>
      stepNodes.every(
        (n) => getStepLabelAndStatus(n.item).status === "complete"
      ),
    [stepNodes]
  );

  useEffect(() => {
    if (userToggled) return;
    if (!allStepsComplete || !open || hasAutoClosedRef.current) return;
    hasAutoClosedRef.current = true;
    const timer = setTimeout(() => setOpen(false), AGENT_PROGRESS_AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allStepsComplete, open, userToggled]);

  const handleOpenChange = (next: boolean) => {
    setUserToggled(true);
    setOpen(next);
  };

  return (
    <ChainOfThought key={chainKey} open={open} onOpenChange={handleOpenChange}>
      <ChainOfThoughtHeader>Agent progress</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {nodes.map((node) =>
          node.type === "step" ? (
            (() => {
              const { label, description, status } = getStepLabelAndStatus(node.item);
              const StepIcon = getStepIcon(node.item);
              const detailsContent = getStepDetailsContent(node.item);
              return (
                <ChainOfThoughtStep
                  key={node.item.id}
                  icon={StepIcon}
                  label={label}
                  description={description}
                  status={status}
                >
                  {detailsContent}
                </ChainOfThoughtStep>
              );
            })()
          ) : (
            <div key={node.item.id} className="my-2">
              {node.item.type === "mcp_approval_request" ? (
                <TaskCardMcp
                  item={node.item}
                  onApprove={() =>
                    onApproveRequest?.(node.item.openai_output?.id || node.item.id)
                  }
                  onDeny={() =>
                    onDenyRequest?.(node.item.openai_output?.id || node.item.id)
                  }
                  onClick={onCardClick || (() => {})}
                />
              ) : (
                <TaskCardError item={node.item} onClick={onCardClick || (() => {})} />
              )}
            </div>
          )
        )}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

function AgentRunBlock({
  runItems,
  startIndex,
  conversationLength,
  onApproveRequest,
  onDenyRequest,
  onCardClick,
  taskId,
  agentId,
  workspaceId,
}: {
  runItems: ConversationItem[];
  startIndex: number;
  conversationLength: number;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
  taskId?: string;
  agentId?: string;
  workspaceId?: string;
}) {
  const { nodes, finalAssistant } = segmentAgentRun(runItems);

  // Single assistant message only: render as before (no chain)
  if (
    runItems.length === 1 &&
    finalAssistant &&
    runItems[0] === finalAssistant
  ) {
    return (
      <div key={finalAssistant.id}>
        <RenderConversationItem
          item={finalAssistant}
          onApproveRequest={onApproveRequest}
          onDenyRequest={onDenyRequest}
          onCardClick={onCardClick}
          taskId={taskId}
          agentId={agentId}
          workspaceId={workspaceId}
          responseIndex={startIndex}
          messageCount={conversationLength}
          reasoningDuration={undefined}
        />
      </div>
    );
  }

  const finalIndex =
    finalAssistant != null
      ? startIndex + runItems.indexOf(finalAssistant)
      : -1;

  return (
    <div className="flex flex-col gap-4 justify-start">
      {nodes.length > 0 && (
        <AgentProgressChain
          nodes={nodes}
          chainKey={`chain-${startIndex}`}
          onApproveRequest={onApproveRequest}
          onDenyRequest={onDenyRequest}
          onCardClick={onCardClick}
        />
      )}
      {finalAssistant && (
        <div key={finalAssistant.id} className="flex justify-start">
          <div className="flex flex-col max-w-[85%]">
            <div className="flex items-start space-x-2">
              <div className="bg-transparent">
                <div className="text-sm whitespace-pre-wrap break-words">
                  {isToolCallSpilloverContent(extractTextContent(finalAssistant)) ? (
                    <span className="text-muted-foreground italic">
                      Tool output shown above
                    </span>
                  ) : (
                    <Response>{extractTextContent(finalAssistant)}</Response>
                  )}
                </div>
              </div>
            </div>
            {taskId && agentId && workspaceId && (
              <FeedbackButtons
                item={finalAssistant}
                taskId={taskId}
                agentId={agentId}
                workspaceId={workspaceId}
                responseIndex={finalIndex}
                messageCount={conversationLength}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskChatInterfaceProps {
  conversation: ConversationItem[];
  chatMessage: string;
  onChatMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onCardClick?: (item: ConversationItem) => void;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  agentLoading: boolean;
  showSplitView: boolean;
  /** When true, chat fills its container (no max-width/center). Use on build page. */
  fillContainer?: boolean;
  responseState?: unknown; // Agent state for real-time updates (while task running)
  task?: Task;
  taskId?: string;
  agentId?: string;
  workspaceId?: string;
  onFilesAdded?: () => void;
  /** Increment to refresh the Files list (e.g. after adding files). */
  filesRefreshTrigger?: number;
  /** Callback to refetch task (so Created list shows latest agents, datasets, views). */
  onRefreshTask?: () => void | Promise<void>;
}

export function TaskChatInterface({
  conversation,
  chatMessage,
  onChatMessageChange,
  onSendMessage,
  onCardClick,
  onApproveRequest,
  onDenyRequest,
  agentLoading,
  showSplitView,
  fillContainer = false,
  responseState,
  task,
  taskId,
  agentId,
  workspaceId,
  onFilesAdded,
  filesRefreshTrigger,
  onRefreshTask,
}: TaskChatInterfaceProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [addFilesDialogOpen, setAddFilesDialogOpen] = useState(false);

  const isTaskActive = task?.status === "in_progress";

  // Transparently use real-time state OR database state
  const todos = useMemo(() => {
    // Try real-time first (while task is running)
    if (isTaskActive && responseState && typeof responseState === "object") {
      const state = responseState as { todos?: unknown[] };
      if (state.todos?.length) return state.todos;
    }

    // Fallback to database (when task is completed/failed/closed)
    if (task?.agent_state?.todos?.length) {
      return task.agent_state.todos;
    }

    return null;
  }, [isTaskActive, responseState, task?.agent_state?.todos]);

  const subtasks = useMemo(() => {
    // Try real-time first (while task is running)
    if (isTaskActive && responseState && typeof responseState === "object") {
      const state = responseState as { subtasks?: unknown[] };
      if (state.subtasks?.length) return state.subtasks;
    }

    // Fallback to database (when task is completed/failed/closed)
    if (task?.agent_state?.subtasks?.length) {
      return task.agent_state.subtasks;
    }

    return null;
  }, [isTaskActive, responseState, task?.agent_state?.subtasks]);

  return (
    <div
      className={`${showSplitView ? "w-3/5 h-full" : fillContainer ? "w-full" : "w-full max-w-4xl mx-auto"} flex flex-col bg-background`}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {conversation.length === 0 ? (
          <EmptyState title="No messages" description="Start a conversation!" />
        ) : (
          <>
            {partitionConversation(conversation).map((block, blockIdx) =>
              block.kind === "user" ? (
                <div key={block.item.id}>
                  <RenderConversationItem
                    item={block.item}
                    onApproveRequest={onApproveRequest}
                    onDenyRequest={onDenyRequest}
                    onCardClick={onCardClick}
                    taskId={taskId}
                    agentId={agentId}
                    workspaceId={workspaceId}
                    responseIndex={block.index}
                    messageCount={conversation.length}
                    reasoningDuration={undefined}
                  />
                </div>
              ) : (
                <AgentRunBlock
                  key={`run-${block.startIndex}`}
                  runItems={block.items}
                  startIndex={block.startIndex}
                  conversationLength={conversation.length}
                  onApproveRequest={onApproveRequest}
                  onDenyRequest={onDenyRequest}
                  onCardClick={onCardClick}
                  taskId={taskId}
                  agentId={agentId}
                  workspaceId={workspaceId}
                />
              )
            )}
          </>
        )}
        <div ref={conversationEndRef} />
      </div>

      <div className="sticky bottom-0 z-50 p-2">
        <div className="py-2 space-y-2">
          {/* Persistent Subtasks List above input - real-time from agent state */}
          {subtasks && <TaskSubtasksList subtasks={subtasks} />}

          {/* Created (agents, datasets, views) - build task */}
          {task && (
            <TaskCreatedList
              task={task}
              onRefresh={onRefreshTask}
              responseState={responseState}
            />
          )}

          {/* Files uploaded to this task */}
          {taskId && (
            <TaskFilesList
              taskId={taskId}
              refreshTrigger={filesRefreshTrigger}
            />
          )}

          {/* Persistent Todo List above input */}
          {todos && <TaskTodosList todos={todos} />}
        </div>

        <PromptInput
          prompt={chatMessage}
          onPromptChange={onChatMessageChange}
          onSubmit={onSendMessage}
          isLoading={agentLoading}
          isInitializing={false}
          placeholder="Request changes or ask a question"
          loadingPlaceholder="Agent is processing..."
          initializingPlaceholder="Waiting for agent to be ready..."
          leadingActions={
            workspaceId && taskId ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setAddFilesDialogOpen(true);
                      }}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Add files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AddTaskFilesDialog
                  workspaceId={workspaceId}
                  taskId={taskId}
                  open={addFilesDialogOpen}
                  onOpenChange={setAddFilesDialogOpen}
                  onFilesAdded={onFilesAdded}
                />
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

// Render conversation items based on their type
function RenderConversationItem({
  item,
  onApproveRequest,
  onDenyRequest,
  onCardClick,
  taskId,
  agentId,
  workspaceId,
  responseIndex,
  messageCount,
  reasoningDuration,
}: {
  item: ConversationItem;
  onApproveRequest?: (itemId: string) => void;
  onDenyRequest?: (itemId: string) => void;
  onCardClick?: (item: ConversationItem) => void;
  taskId?: string;
  agentId?: string;
  workspaceId?: string;
  responseIndex: number;
  messageCount: number;
  reasoningDuration?: number;
}) {
  const conversationItemData = useConversationItem(item);
  switch (item.type) {
    case "error":
      return <TaskCardError key={item.id} item={item} onClick={onCardClick} />;

    case "reasoning": {
      const reasoningText =
        item.openai_output?.summary?.map((s) => s.text).join("\n\n") || "";

      // Use isStreaming from the conversation store - it's properly set to false
      // when response.output_item.done is received, regardless of duration
      const isInProgress = item.isStreaming ?? false;

      return (
        <Reasoning
          key={item.id}
          isStreaming={isInProgress}
          duration={reasoningDuration || 0}
        >
          <ReasoningTrigger />
          <ReasoningContent>
            {reasoningText || "No reasoning available"}
          </ReasoningContent>
        </Reasoning>
      );
    }

    case "mcp_approval_request":
      return (
        <TaskCardMcp
          key={item.id}
          item={item}
          onApprove={() =>
            onApproveRequest?.(item.openai_output?.id || item.id)
          }
          onDeny={() => onDenyRequest?.(item.openai_output?.id || item.id)}
          onClick={onCardClick}
        />
      );

    case "mcp_list_tools":
      return (
        <TaskCardTool
          key={item.id}
          item={item}
          onClick={onCardClick || (() => {})}
        />
      );

    case "mcp_call":
      return (
        <TaskCardTool
          key={item.id}
          item={item}
          onClick={onCardClick || (() => {})}
        />
      );

    case "web_search_call":
      return (
        <TaskCardWebSearch key={item.id} item={item} onClick={onCardClick} />
      );

    case "assistant": {
      const { isUser, textContent, isReasoningType } = conversationItemData;
      const isAgentMessage =
        !isUser && item.openai_output?.role === "assistant";
      const hideAsSpillover =
        !isUser && isToolCallSpilloverContent(textContent);
      return (
        <div
          key={item.id}
          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        >
          <div className="flex flex-col max-w-[85%]">
            <div className="flex items-start space-x-2">
              <div
                className={
                  isUser
                    ? "p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800"
                    : isReasoningType
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                      : "bg-transparent"
                }
              >
                <div className="text-sm whitespace-pre-wrap break-words">
                  {hideAsSpillover ? (
                    <span className="text-muted-foreground italic">
                      Tool output shown above
                    </span>
                  ) : (
                    <Response>{textContent}</Response>
                  )}
                </div>
              </div>
            </div>
            {/* Show feedback buttons only for agent messages */}
            {isAgentMessage && taskId && agentId && workspaceId && (
              <FeedbackButtons
                item={item}
                taskId={taskId}
                agentId={agentId}
                workspaceId={workspaceId}
                responseIndex={responseIndex}
                messageCount={messageCount}
              />
            )}
          </div>
        </div>
      );
    }

    // case 'response_status': {
    //   const responseStatus = item.openai_event?.response?.status || item.openai_event?.type?.split('.').pop();
    //   return (
    //     <div key={item.id} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
    //       <span className={`${item.isStreaming ? 'animate-pulse' : ''}`}>
    //         {responseStatus === 'created' && '...'}
    //         {responseStatus === 'in_progress' && '...'}
    //         {responseStatus === 'completed' && ''}
    //         {item.openai_event?.type === 'response.created' && '...'}
    //       </span>
    //     </div>
    //   );
    // }

    default: {
      const { isUser, textContent, isReasoningType } = conversationItemData;
      const isAgentMessage =
        !isUser && item.openai_output?.role === "assistant";
      const hideAsSpillover =
        !isUser && isToolCallSpilloverContent(textContent);
      return (
        <div
          key={item.id}
          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        >
          <div className="flex flex-col max-w-[85%]">
            <div className="flex items-start space-x-2">
              <div
                className={
                  isUser
                    ? "p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800"
                    : isReasoningType
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                      : "bg-transparent"
                }
              >
                <div className="text-sm whitespace-pre-wrap break-words">
                  {hideAsSpillover ? (
                    <span className="text-muted-foreground italic">
                      Tool output shown above
                    </span>
                  ) : (
                    <Response>{textContent}</Response>
                  )}
                </div>
              </div>
            </div>
            {/* Show feedback buttons only for agent messages */}
            {isAgentMessage && taskId && agentId && workspaceId && (
              <FeedbackButtons
                item={item}
                taskId={taskId}
                agentId={agentId}
                workspaceId={workspaceId}
                responseIndex={responseIndex}
                messageCount={messageCount}
              />
            )}
          </div>
        </div>
      );
    }
  }
}
