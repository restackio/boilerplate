"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import {
  useWorkspaceScopedActions,
  type Task,
} from "@/hooks/use-workspace-scoped-actions";
import { getOrCreateTaskFilesDatasetId } from "@/app/actions/workflow";
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
import { ArrowUp, Lightbulb, Loader2 } from "lucide-react";
import { CenteredLoading } from "@workspace/ui/components/loading-states";

/** Short prompts that fill the box. The build agent will turn these into a plan (todos, diagram), then create agents, datasets, and views after approval. */
const STARTER_PROMPTS: { title: string; prompt: string }[] = [
  {
    title: "Deep research agent",
    prompt:
      "Build a deep research agent: find top 5 tech companies, research leadership change news for each, at C-level and from last 7 days, save results to a table, and summarize which companies had leadership changes.",
  },
  {
    title: "Sales outreach agent",
    prompt:
      "Build an agent that helps with sales outreach: track leads, draft emails, and suggest follow-ups. I want a table of leads and a way to see pipeline stages.",
  },
  {
    title: "Data pipeline from API",
    prompt:
      "Build a pipeline that pulls data from a REST API on a schedule, stores it in a table, and lets me query or view the latest records.",
  },
  {
    title: "Support triage agent",
    prompt:
      "Build a support triage agent that reads tickets, classifies by priority and category, and suggests responses. I need a table of tickets and views for open vs resolved.",
  },
  {
    title: "Content marketing policy validation",
    prompt:
      "Build a content marketing policy validation agent only: no pipeline agent. I will upload my policy PDFs to this task (they go into the workspace task-files dataset). Create one interactive agent that uses that dataset to check whether marketing content (copy, campaigns, assets) complies with the policy and reports violations with suggested fixes.",
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
      setCreating(true);
      setBuildAgentError(null);
      try {
        let description = message.trim();
        const isPolicyValidationStarter =
          /content marketing policy validation/i.test(description) &&
          /no pipeline|task-files/i.test(description);
        if (isPolicyValidationStarter) {
          const policyDatasetId = await getOrCreateTaskFilesDatasetId(
            currentWorkspaceId,
          );
          if (policyDatasetId) {
            description += `\n\n[Build instruction: dataset_id for policy docs is ${policyDatasetId}. Do not create a pipeline agent or a new dataset. Create only one interactive agent attached to this dataset (use this dataset_id for the view). Add context-store tools so the agent can query the dataset.]`;
          }
        }
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
          <div className="flex items-center space-x-3">
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
                <SelectTrigger className="w-[180px]">
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
            <div className="flex-1" />
            <Button
              onClick={() => handleStartConversation(startMessage)}
              disabled={creating || !startMessage.trim()}
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
              {creating ? "Creating…" : "Create agent"}
            </Button>
          </div>
        </div>

        <section className="pt-4 border-t">
          <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Starter prompts
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Use a starter to fill the prompt above; edit if you like, then click
            Create agent. The builder will propose a plan (and diagram), then
            create agents, datasets, and views after you approve.
          </p>
          <ul className="space-y-2">
            {STARTER_PROMPTS.map((item) => (
              <li key={item.title}>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => handlePickStarter(item.prompt)}
                  disabled={creating}
                >
                  <span className="truncate font-medium">{item.title}</span>
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
