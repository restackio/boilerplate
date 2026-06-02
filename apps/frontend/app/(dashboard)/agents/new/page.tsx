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
  Briefcase,
  FileSearch,
  FlaskConical,
  Globe,
  Headset,
  Loader2,
  Megaphone,
  Network,
  Radar,
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
    title: "LinkedIn signal radar",
    teaser:
      "Watch C-level posts for buying signals; suggest outreach angles per account.",
    icon: Radar,
    iconClassName: "text-blue-700",
    prompt: `I want to monitor LinkedIn activity from C-levels at a list of target accounts and turn relevant posts into outreach signals for our sales team.

Inputs I will provide:
- A list of LinkedIn profile URLs of C-levels (CEO, CTO, COO, CFO, CRO, VP Eng, VP Product, etc.)
- A short company brief per target account (industry, what we sell to them, current pain hypotheses, value prop) — I'll upload these as files into the dataset later.

Integration to use:
- I already installed a LinkedIn MCP integration in this workspace that runs on PhantomBuster. The tool descriptions on that MCP mention "phantombuster". Before designing, please call \`listworkspaceintegrations\` with query "phantombuster" (and also try "linkedin" if nothing comes back) to find its mcp_server_id, then \`listintegrationtools\` to see exactly which tools are exposed (launch agent, fetch results/export, etc.). Use those real tools in the pipeline — do NOT fall back to mockaiintegration unless the lookup actually returns nothing.

Flow I want (weekly cadence):
1. PhantomBuster runs weekly per profile and extracts new posts / comments / articles, with built-in deduplication.
2. The agent fetches the export via the PhantomBuster API (through the LinkedIn MCP tools).
3. An LLM classifies each item as either "relevant" (AI, automation, efficiency, hiring pain, cost pressure, tooling complaints, transformation projects) or "noise" (personal updates, generic reposts, congratulations, motivational quotes, job announcements without context).
4. For relevant items, the agent matches the post against the corresponding company brief and generates a suggested outreach angle (1–3 sentences: which pain it touches, why now, suggested opener).
5. Everything — relevant and noise — gets stored in ClickHouse so we have a full audit trail.

Architecture I want (hybrid):
- One ClickHouse dataset as the shared store.
- One child pipeline agent: ONE LinkedIn profile per run. It (a) calls the PhantomBuster/LinkedIn MCP tools to fetch the latest export for that profile, (b) for each new item runs the LLM classification, (c) for relevant items reads the company brief from the dataset (file in the dataset for that account) and generates the outreach angle, (d) loads all rows (relevant + noise) into the dataset, (e) calls completetask.
- One parent agent of type \`pipeline\` (orchestration only — no chat) that takes the list of LinkedIn profile URLs and creates one subtask per profile against the child pipeline. This is what we'd schedule weekly.
- A SEPARATE interactive agent ("Sales Signals Assistant") that reads from the SAME ClickHouse dataset using clickhouselisttables / clickhouserunselectquery. Sales reps open this every day to ask things like "what's relevant from Acme this week?", "which CEOs talked about AI adoption pain in the last 14 days?", "give me top 5 outreach openers for accounts in fintech".

Suggested dataset columns (feel free to refine):
- profile_url (string)
- profile_name (string)
- profile_company (string)
- post_url (string)
- post_type (post | comment | article)
- post_text (string)
- posted_at (timestamp)
- fetched_at (timestamp)
- classification (relevant | noise)
- relevance_categories (array: ai, automation, efficiency, pain, hiring, cost, tooling, transformation, other)
- relevance_reason (string — short LLM justification)
- company_brief_match (string — which pain hypothesis from the brief it touches, if any)
- suggested_outreach_angle (string — generated only for relevant items)
- raw_phantombuster_id (string — for dedup / traceability)

Schedule I want (Phase 2.5):
- After the build completes, set up a recurring weekly schedule on the pipeline parent: every Monday at 06:00 in Europe/Berlin.
- The scheduled task description should be the list of LinkedIn profile URLs to fan out (we'll start with a placeholder list and update it later).
- I understand this also runs the parent once immediately on creation; that's fine.

Please:
1. First call \`listworkspaceintegrations\` with query "phantombuster" so you confirm the LinkedIn MCP is there before drawing the pattern. Then \`listintegrationtools\` so the diagram references the real tools.
2. Render the pattern with \`updatepatternspecs\`: dataset in the middle, child pipeline pushes to it, pipeline parent fans out subtasks to the child, interactive "Sales Signals Assistant" pulls from it. Show the LinkedIn/PhantomBuster MCP as an integration node connected to the child pipeline. (You can leave the schedule node off until after the user confirms cadence in Phase 2.5.)
3. Show me a small dummy table (5–6 columns) with one relevant row and one noise row so I can sanity-check the schema.
4. Then ask me anything ambiguous and wait for me to reply Build.

Do not create anything yet — plan + pattern + dummy table + questions, then wait for "Build". After you've built everything in Phase 2, ask me to confirm the weekly schedule before calling updateschedule.`,
  },
  {
    title: "Forward-deployed jobs radar",
    teaser:
      "Scrape FDE job postings worldwide; chat to compare countries, salaries, and role types.",
    icon: Briefcase,
    iconClassName: "text-indigo-600",
    prompt: `I want to monitor LinkedIn job postings for "forward deployed engineer" worldwide and let our team chat with the data.

Integration (real data only - no mock fallback):
- A LinkedIn MCP integration is installed in this workspace. Before designing, call \`listworkspaceintegrations\` with query "linkedin", then call \`listintegrationtools\` and identify the jobs search-page tool I added. The tool already has the search query and locations set in its own default settings - it searches LinkedIn for "forward deployed engineer" across all countries on its own. You do NOT pass a search URL, keyword, geoId, or country - just call the tool with no search params. It returns the full list of matching jobs across all countries in one call.
- Each result item looks like: { jobId, jobUrl, jobTitle, companyName, location, logoUrl, workplaceType (Hybrid|Remote|On-site), isRemote (bool), postedAt (relative text like "6 months ago"), salary (free-text like "$70K/yr - $95K/yr") }. Note: salary is optional - when no salary is posted, the "salary" key is omitted from the item entirely (not null/empty, simply absent). location is a free-text place string (e.g. "Barcelona" or "London, England, United Kingdom").
- Use ONLY that search-page tool. Do NOT scrape individual job detail pages, and do NOT use mockaiintegration. We need real data for this build.
- IMPORTANT - the tool is slow and backed by a service that can only run ONE job at a time. Call it EXACTLY ONCE per run. Never call it a second time in the same run. If it times out (e.g. a 504 "Timed out waiting for MCP server response") or errors, do NOT retry it - record the failure and \`completetask\`. A retry would start a second concurrent job and break the run. (Put this no-retry rule in the pipeline agent's instructions explicitly.)
- If the search-page tool is missing, STOP at the end of Phase 1. In your reply, tell me exactly which integration/tools you found, what is missing, and what naming mismatch to fix before I reply Build.
- Empty results are fine - if the tool returns no jobs, save zero rows and complete. Never fabricate rows to fill gaps.

Architecture (hybrid):
- One ClickHouse dataset \`fde-jobs\` shared by both agents.
- Pipeline agent \`fde-jobs-pipeline\` (type pipeline): in a single run it (a) calls the LinkedIn MCP search-page tool EXACTLY ONCE to get all jobs across all countries (never retry it - see the no-retry rule above), (b) passes each result item to \`transformdata\` to derive the country from the location text and classify role_category as one of coding | sales-consultancy | hybrid | unknown (inferred from the job title), (c) \`loadintodataset\` writes all rows into \`fde-jobs\`, (d) \`completetask\`. No per-country fan-out and no orchestrator agent are needed - the tool runs the worldwide search itself in one call.
- Interactive agent \`fde-jobs-assistant\` (type interactive): reads ONLY from \`fde-jobs\` via \`clickhouselisttables\` and \`clickhouserunselectquery\`. Never give it the LinkedIn MCP search-page tool or any write tools. Translates user questions into SELECTs internally and replies in plain English (never show SQL).

Dataset columns (from the search-results payload):
- job_id, job_url, job_title, company_name, company_logo_url
- location (raw place text from the item), city (best-effort city parsed from location), country (best-effort country derived from location by the LLM, nullable)
- workplace_type (hybrid | remote | onsite | null), is_remote (bool)
- posted_at_text (the raw relative text like "6 months ago"), fetched_at (timestamp of the scrape)
- salary_raw (the original salary string, nullable), salary_min, salary_max, salary_currency, salary_period (yearly | monthly | hourly | null) - parsed from salary_raw when present
- role_category (coding | sales-consultancy | hybrid | unknown), role_category_reason (short LLM justification)
Note: we only scrape the search results (not each job detail page), so there is no full job description. Salary, workplace type, and location come through on the search payload. The payload has no explicit country field, so country is inferred from the location text. Detailed tech-stack extraction stays out of scope since it needs the full description - if you want it later, we re-add a job-details scrape.

Transform task prompt (use inside \`transformdata\` for each search-result item):
"From this LinkedIn job search-result item, extract: (1) job_id (jobId), job_url (jobUrl), job_title (jobTitle), company_name (companyName), company_logo_url (logoUrl), location (the raw location text), workplace_type (lowercase the workplaceType: hybrid|remote|onsite, or null), is_remote (isRemote), posted_at_text (postedAt); (2) from the location text derive city (the city/town) and country (the country name, e.g. 'Barcelona' -> Spain, 'London, England, United Kingdom' -> United Kingdom); if location is just 'Remote' or the country is unclear, set country to null; (3) salary is optional and the "salary" key may be entirely absent from the item - if there is no salary key, set salary_raw and all salary_* fields to null and do not guess; if present, salary_raw = the salary string verbatim, and parse it into salary_min, salary_max (numbers, e.g. '$70K/yr - $95K/yr' -> 70000 and 95000), salary_currency (ISO like USD/EUR), salary_period (yearly|monthly|hourly from /yr, /mo, /hr); (4) role_category as one of 'coding', 'sales-consultancy', 'hybrid', 'unknown' inferred from the job title, with a one-sentence role_category_reason." (fetched_at is the scrape time - set it when loading the row.)

Interactive agent conversation opener (put in its instructions):
On the first reply after the user's first message in a new thread, start with a one-line welcome, then "Here are a few things you can ask me:" and the bullet list below. If the user's first message is already a substantive question, give the welcome + bullets briefly, then answer.
- "How many open forward-deployed engineer roles per country?"
- "Which companies are hiring for forward deployed engineer right now?"
- "What's the salary range across postings that publish one, and how does it vary by country?"
- "How many of these are coding roles vs sales/consultancy?"
- "How many roles are remote vs hybrid vs onsite, and which cities have the most openings?"

Please:
1. First call \`listworkspaceintegrations\` with query "linkedin" so the diagram references the real integration, then \`listintegrationtools\` to confirm the search-page tool.
2. \`updatepatternspecs\`: dataset \`fde-jobs\` in the middle, the pipeline agent pushes to it, the interactive assistant pulls from it, and the LinkedIn MCP integration node connected to the pipeline agent. (No orchestrator/parent node - the tool searches all countries itself.)
3. Show me a dummy table to sanity-check the schema: columns job_title, company_name, location, country, salary_raw, role_category, with one coding row (e.g. salary present, country derived from a city+country location) and one sales-consultancy row (e.g. no salary, location "Remote" -> country null).
4. Ask anything ambiguous and wait for me to reply Build.

Do not create anything yet - plan + pattern + dummy table + questions, then wait for "Build".`,
  },
  {
    title: "Domain research pipeline",
    teaser: "Scrape company websites and generate AI use-case briefs.",
    icon: Globe,
    iconClassName: "text-blue-500",
    prompt:
      "Build a domain research pipeline that uses Firecrawl to scrape company websites, produces AI agent use-case briefs, and provides a chat interface to explore results.\n\nIntegration: Firecrawl (already installed in workspace). Use listworkspaceintegrations with query \"firecrawl\" to find the existing integration, then listintegrationtools and updateagenttool to attach Firecrawl tools to the pipeline agent.\n\nContext store: ClickHouse dataset company-use-case-briefs (same dataset for all three agents).\n\nArchitecture — three agents:\n\n1) Pipeline agent (e.g. company-research-pipeline): type pipeline. For each company domain (one subtask per domain):\n   - Use Firecrawl to crawl up to 3 pages per domain: /about (or /about-us), /services (or /solutions, /what-we-do), /careers (or /jobs, /team). Use crawl or scrape with markdown output mode.\n   - If total scraped markdown < 300 words across all pages, flag confidence_flag = \"needs-manual-research\" and still save partial results.\n   - Otherwise, use transformdata to analyze the combined markdown with this task: \"From this company website content, extract: (1) a one-sentence summary of what the company does, (2) the top 2-3 AI agent use cases most relevant to their business, (3) for each use case a business value argument (1-2 sentences), and (4) an estimated annual dollar value for each use case based on company size/industry signals.\" Output schema: {\"type\": \"object\", \"properties\": {\"company_name\": {\"type\": \"string\"}, \"what_they_do\": {\"type\": \"string\"}, \"use_cases\": {\"type\": \"array\", \"items\": {\"type\": \"object\", \"properties\": {\"use_case\": {\"type\": \"string\"}, \"value_argument\": {\"type\": \"string\"}, \"value_dollars\": {\"type\": \"string\"}}}}, \"confidence_flag\": {\"type\": \"string\", \"enum\": [\"high\", \"medium\", \"needs-manual-research\"]}}}\n   - Use loadintodataset to write the structured output into company-use-case-briefs.\n\n2) Parent orchestrator agent (e.g. company-research-orchestrator): type pipeline. This agent receives a list of domains (via task description), then uses createsubtask to fan out one subtask per domain to the pipeline agent above. Give it updatetodos and createsubtask tools. Instructions: \"You receive a list of company domains. For each domain, create one subtask dispatched to the company-research-pipeline agent with the domain as the task description. Process in batches of 20 to avoid rate limits. Update todos to track progress.\"\n\n3) Interactive agent (e.g. company-research-chat): type interactive. Only reads from the same ClickHouse dataset company-use-case-briefs via clickhouse_run_select_query — do not give this agent Firecrawl or any write tools. Translates user questions into SELECTs behind the scenes and replies in plain English (never show SQL to the user). If the dataset is empty, tell the user the pipeline hasn't run yet.\n\n   Conversation opener (put in this agent's instructions): On the first reply after the user's first message in a new thread, start with a one-line welcome, then: \"Here are a few things you can ask me:\" and a short bullet list of 4-5 concrete examples:\n   - \"Which companies were flagged as needs-manual-research?\"\n   - \"Show me the top 10 companies by estimated AI value in dollars\"\n   - \"What are the most common use cases across all companies?\"\n   - \"Give me the full brief for [domain.com]\"\n   - \"Which companies have use cases around customer support automation?\"\n   If the user's first message is already a substantive question, give the welcome + examples briefly, then answer their question.\n\nNo MockAIIntegration.\n\nModels: Use gpt-5.4-mini for the pipeline agent (cost-efficient for volume), gpt-5.4 for the orchestrator, and gpt-5.4 for the interactive agent.",
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
