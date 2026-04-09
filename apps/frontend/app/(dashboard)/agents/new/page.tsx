"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import {
  useWorkspaceScopedActions,
  type Task,
} from "@/hooks/use-workspace-scoped-actions";
import { AddOpenAITokenDialog } from "@/app/(dashboard)/integrations/components/add-openai-token-dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  ArrowUp,
  BarChart3,
  FileSearch,
  FlaskConical,
  Headset,
  Loader2,
  Megaphone,
  Network,
} from "lucide-react";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import { posthog } from "@/lib/posthog";

/** Short prompts that fill the box. The build agent will turn these into a plan (todos, diagram), then create agents, datasets, and views after approval. */
const STARTER_PROMPTS: {
  title: string;
  teaser: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  prompt: string;
}[] = [
  {
    title: "Deep research brief",
    teaser: "Track leadership changes across top tech companies.",
    icon: FlaskConical,
    iconClassName: "text-violet-500",
    prompt:
      "Build a deep research agent: find top 5 tech companies, research leadership change news for each, at C-level and from last 7 days, save results to a table, and summarize which companies had leadership changes.",
  },
  {
    title: "Sales outreach copilot",
    teaser: "Organize leads, draft outreach, and suggest follow-ups.",
    icon: Megaphone,
    iconClassName: "text-orange-500",
    prompt:
      "Build an agent that helps with sales outreach: track leads, draft emails, and suggest follow-ups. I want a table of leads and a way to see pipeline stages.",
  },
  {
    title: "API data pipeline",
    teaser: "Ingest scheduled API data into queryable tables.",
    icon: Network,
    iconClassName: "text-sky-500",
    prompt:
      "Build a pipeline that pulls data from a REST API on a schedule, stores it in a table, and lets me query or view the latest records.",
  },
  {
    title: "Healthcare chat with PowerBI",
    teaser:
      "Mock Power BI facility KPIs into ClickHouse; chat answers without showing SQL.",
    icon: BarChart3,
    iconClassName: "text-teal-500",
    prompt:
      'Build two agents for healthcare operations KPIs (no PHI — aggregated rehab/facility metrics only; no SQL shown to end users).\n\nReal Power BI MCP: https://learn.microsoft.com/en-us/power-bi/developer/mcp/remote-mcp-server-get-started — do not connect to Fabric. **Mock source:** **GenerateMock** with **integration_template "powerbi_health"** only (apps/mcp_server/src/functions/mock_samples/powerbi_health.py). No CSV, no real QRM/Power BI API.\n\n**Context store:** ClickHouse dataset **healthcare-kpi-data** (same name for both agents).\n\n1) **Pipeline agent** (e.g. healthcare-kpi-pipeline): on a schedule (daily or weekly), call **GenerateMock** + **powerbi_health** with **parameters** for the refresh window (e.g. recent ISO weeks, regions). Persist **result.rows** into the **ClickHouse context store** as **healthcare-kpi-data** (columns: client_id, facility_id, facility_name, region, metric, value, period).\n\n2) **Interactive agent** (e.g. healthcare-kpi-chat): chat for consultants. **Only** read from that same **ClickHouse context store** via **clickhouse_run_select_query** against **healthcare-kpi-data** — do not call GenerateMock for routine answers; translate questions to SELECTs behind the scenes and reply in plain English (never show SQL). If the store is empty, say the pipeline has not run yet.\n\n**Conversation opener (put in this agent\'s instructions):** On the **first reply** after the user\'s first message in a new thread, start with a one-line welcome, then: *"Here are a few questions you can ask me:"* and a short bullet list of **3–5 concrete examples** (e.g. which of my facilities had therapist productivity drop this week; cost per treatment trend for a named facility over the last quarter; compare regions; which sites are below a productivity threshold). If the user\'s first message is already a substantive question, give the welcome + examples briefly, then answer their question.\n\nNo MockAIIntegration.',
  },
  {
    title: "Support triage assistant",
    teaser: "Classify tickets by urgency and recommend responses.",
    icon: Headset,
    iconClassName: "text-emerald-500",
    prompt:
      "Build a support triage agent that reads tickets, classifies by priority and category, and suggests responses. I need a table of tickets and views for open vs resolved.",
  },
  {
    title: "Marketing policy reviewer",
    teaser: "Validate campaigns against uploaded policy PDFs.",
    icon: FileSearch,
    iconClassName: "text-rose-500",
    prompt:
      "Build a content marketing policy validation agent only: no pipeline agent. I will upload my policy PDFs to this task (they go into the workspace task-files dataset). Create one interactive agent that uses that dataset to check whether marketing content (copy, campaigns, assets) complies with the policy and reports violations with suggested fixes.",
  },
  {
    title: "Sales chat assistant from PDFs",
    teaser: "Customer-facing chat that always captures email, then triages follow-up.",
    icon: FileSearch,
    iconClassName: "text-blue-600",
    prompt:
      "Build one customer-facing sales chat agent only: no separate pipeline agent. I will upload PDFs to this task (workspace task-files dataset) for product information and internal qualification criteria. The assistant should chat naturally with prospects, answer product questions, and ask discovery questions conversationally. Keep qualification logic internal: do not mention scores, labels, or internal criteria to end users. In all cases, collect the prospect's email before ending the conversation. If the prospect appears qualified, tell them a booking email will be sent and trigger the qualified follow-up flow; if not qualified, still collect email and route to nurture follow-up. Always keep a friendly sales-assistant tone and end each conversation with a clear next step.",
  },
];

export default function NewAgentPage() {
  const router = useRouter();
  const { currentWorkspaceId, currentUser, isReady } = useDatabaseWorkspace();
  const {
    createTask,
    getBuildAgent,
    teams,
    fetchTeams,
    hasWorkspaceOpenAIToken,
    fetchMcpServers,
  } = useWorkspaceScopedActions();
  const [creating, setCreating] = useState(false);
  const [startMessage, setStartMessage] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [addOpenAITokenDialogOpen, setAddOpenAITokenDialogOpen] =
    useState(false);
  const [buildAgentError, setBuildAgentError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    fetchTeams();
    fetchMcpServers();
  }, [isReady, fetchTeams, fetchMcpServers]);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const handleStartConversation = useCallback(
    async (message: string, options?: { skipTokenCheck?: boolean }) => {
      if (!currentWorkspaceId || !message.trim() || creating || !isReady)
        return;
      if (!options?.skipTokenCheck && !hasWorkspaceOpenAIToken) {
        setAddOpenAITokenDialogOpen(true);
        return;
      }
      const description = message.trim();
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthog.capture("agent_builder_prompt_submitted", {
          prompt: description,
          prompt_length: description.length,
          ...(selectedTeamId && { team_id: selectedTeamId }),
        });
      }
      setCreating(true);
      setBuildAgentError(null);
      try {
        const buildRes = await getBuildAgent();
        // executeWorkflow unwraps { agent } so data is the agent object directly
        const buildAgent = buildRes.data as { id?: string } | null;
        const agentId =
          buildRes.success && buildAgent?.id ? buildAgent.id : null;
        if (!agentId) {
          setBuildAgentError(
            buildRes.error ||
              "Build agent is not available. Please run the database admin seed to set up the build agent, or contact your administrator.",
          );
          setCreating(false);
          return;
        }
        const result = await createTask({
          title: "Build",
          description,
          status: "in_progress",
          agent_id: agentId,
          assigned_to_id: currentUser?.id ?? "",
          ...(selectedTeamId && { team_id: selectedTeamId }),
        });
        if (result?.success && result?.data) {
          const task = result.data as Task;
          router.push(`/agents/new/${task.id}`);
          return;
        }
      } catch {
        // Error handled by createTask
      } finally {
        setCreating(false);
      }
    },
    [
      currentWorkspaceId,
      createTask,
      getBuildAgent,
      currentUser?.id,
      creating,
      isReady,
      router,
      selectedTeamId,
      hasWorkspaceOpenAIToken,
    ],
  );

  const handlePickStarter = useCallback((prompt: string) => {
    setStartMessage(prompt);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (startMessage.trim()) handleStartConversation(startMessage);
      }
    },
    [startMessage, handleStartConversation],
  );

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <CenteredLoading message="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full w-full max-w-screen-lg mx-auto overflow-x-hidden">
      <div className="space-y-6 md:space-y-10 max-w-full mx-auto p-4 md:p-6 pt-8 md:pt-20">
        <div className="flex justify-center items-center text-center">
          <h1 className="text-2xl md:text-3xl font-semibold px-4">
            What agent are we building?
          </h1>
        </div>

        <div className="space-y-4">
          <Textarea
            rows={10}
            placeholder="Describe the agent you want to build"
            value={startMessage}
            onChange={(e) => setStartMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full resize-none min-h-[200px] max-h-[320px] text-base"
            disabled={creating}
          />
          {buildAgentError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {buildAgentError}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            {teams.length > 0 && (
              <Select
                value={selectedTeamId}
                onValueChange={(value) => {
                  if (value === "__new_team__") {
                    router.push("/teams/settings");
                    return;
                  }
                  setSelectedTeamId(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new_team__">+ New team</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="hidden flex-1 sm:block" />
            <Button
              onClick={() => handleStartConversation(startMessage)}
              disabled={creating || !startMessage.trim()}
              className="w-full gap-2 sm:w-auto"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
              {creating ? "Building…" : "Build agent"}
            </Button>
          </div>
        </div>

        <section className="pt-4 border-t">
          <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
            Starter prompts
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Pick a starter, tweak it, then build. You approve the plan before anything is created.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STARTER_PROMPTS.map((item) => (
              <li key={item.title}>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-3"
                  onClick={() => handlePickStarter(item.prompt)}
                  disabled={creating}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`mt-0.5 ${item.iconClassName}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.teaser}
                      </p>
                    </div>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AddOpenAITokenDialog
        open={addOpenAITokenDialogOpen}
        onOpenChange={setAddOpenAITokenDialogOpen}
        onTokenAdded={async () => {
          await fetchMcpServers();
          await handleStartConversation(startMessage, { skipTokenCheck: true });
        }}
      />
    </div>
  );
}
