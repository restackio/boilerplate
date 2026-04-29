"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Building,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useAddToSlackAuthorizeUrl } from "@/lib/use-add-to-slack-url";
import { executeWorkflow } from "@/app/actions/workflow";
import type { McpServer } from "@/hooks/use-workspace-scoped-actions";

const SLACK_CHANNEL_TYPE = "slack";

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.315z" />
    </svg>
  );
}

interface FormData {
  name: string;
  openaiApiKey: string;
}

interface ChannelIntegration {
  id: string;
  workspace_id: string;
  channel_type: string;
  external_id: string;
}

function CreateWorkspaceContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingWorkspaceId, setOnboardingWorkspaceId] = useState<
    string | null
  >(null);
  const [openaiMcpServerId, setOpenaiMcpServerId] = useState<string | null>(
    null,
  );
  const [slackConnected, setSlackConnected] = useState(false);
  const {
    setCurrentWorkspaceId,
    createWorkspace,
    workspaces,
    loading: workspaceLoading,
    refreshData,
  } = useDatabaseWorkspace();
  /** Right after create, the URL can update before context `workspaces` includes the new id. */
  const justCreatedWorkspaceIdRef = useRef<string | null>(null);
  /** One refetch for deep links / list lag before we show "not found". */
  const resyncAttemptedForIdRef = useRef<string | null>(null);
  /** Avoid re-applying the same URL workspace on every context re-render. */
  const lastAppliedOnboardingWidRef = useRef<string | null>(null);
  const addToSlackUrl = useAddToSlackAuthorizeUrl(
    currentStep === 2 && onboardingWorkspaceId ? onboardingWorkspaceId : null,
  );

  const [formData, setFormData] = useState<FormData>({
    name: "",
    openaiApiKey: "",
  });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const loadOpenaiMcpServerId = useCallback(async (workspaceId: string) => {
    const result = await executeWorkflow("McpServersReadWorkflow", {
      workspace_id: workspaceId,
    });
    if (!result.success || !result.data) {
      setOpenaiMcpServerId(null);
      return;
    }
    const servers = result.data as McpServer[];
    const openai = servers.find(
      (s) => s.server_label?.toLowerCase() === "openai",
    );
    setOpenaiMcpServerId(openai?.id ?? null);
  }, []);

  const loadSlackConnected = useCallback(async (workspaceId: string) => {
    const result = await executeWorkflow(
      "ChannelIntegrationsByWorkspaceWorkflow",
      {
        workspace_id: workspaceId,
        channel_type: SLACK_CHANNEL_TYPE,
      },
    );
    if (!result.success || !result.data) {
      setSlackConnected(false);
      return;
    }
    const raw = result.data as
      | { integrations?: ChannelIntegration[] }
      | ChannelIntegration[];
    const integrations = Array.isArray(raw)
      ? raw
      : ((raw as { integrations?: ChannelIntegration[] }).integrations ?? []);
    setSlackConnected(Boolean(integrations[0]));
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id) {
          setIsAuthenticated(true);
          return;
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
      }
    }

    // If not authenticated, redirect to login
    setIsAuthenticated(false);
    router.push("/login");
  }, [router]);

  const urlWorkspaceId = searchParams.get("workspaceId");

  // Reset one-shot resync if user switches to a different ?workspaceId=
  useEffect(() => {
    if (!urlWorkspaceId) {
      lastAppliedOnboardingWidRef.current = null;
    }
    if (
      resyncAttemptedForIdRef.current &&
      resyncAttemptedForIdRef.current !== urlWorkspaceId
    ) {
      resyncAttemptedForIdRef.current = null;
    }
  }, [urlWorkspaceId]);

  const applyOnboardingForWorkspace = useCallback(
    (workspaceId: string) => {
      setError("");
      setOnboardingWorkspaceId(workspaceId);
      setCurrentWorkspaceId(workspaceId);
      setCurrentStep(2);
      void loadOpenaiMcpServerId(workspaceId);
      void loadSlackConnected(workspaceId);
    },
    [setCurrentWorkspaceId, loadOpenaiMcpServerId, loadSlackConnected],
  );

  useEffect(() => {
    if (isAuthenticated !== true) return;
    if (!urlWorkspaceId) return;
    if (workspaceLoading.isLoading) return;

    const match = workspaces.find((w) => w.id === urlWorkspaceId);
    if (match) {
      if (justCreatedWorkspaceIdRef.current === urlWorkspaceId) {
        justCreatedWorkspaceIdRef.current = null;
      }
      if (lastAppliedOnboardingWidRef.current === urlWorkspaceId) {
        return;
      }
      lastAppliedOnboardingWidRef.current = urlWorkspaceId;
      applyOnboardingForWorkspace(urlWorkspaceId);
      return;
    }

    if (justCreatedWorkspaceIdRef.current === urlWorkspaceId) {
      if (lastAppliedOnboardingWidRef.current === urlWorkspaceId) {
        return;
      }
      lastAppliedOnboardingWidRef.current = urlWorkspaceId;
      applyOnboardingForWorkspace(urlWorkspaceId);
      return;
    }

    if (resyncAttemptedForIdRef.current !== urlWorkspaceId) {
      resyncAttemptedForIdRef.current = urlWorkspaceId;
      void refreshData();
      return;
    }

    setError("That workspace was not found.");
    setCurrentStep(1);
    setOnboardingWorkspaceId(null);
    setOpenaiMcpServerId(null);
    setSlackConnected(false);
    resyncAttemptedForIdRef.current = null;
    lastAppliedOnboardingWidRef.current = null;
    justCreatedWorkspaceIdRef.current = null;
    router.replace(pathname, { scroll: false });
  }, [
    isAuthenticated,
    urlWorkspaceId,
    workspaceLoading.isLoading,
    workspaces,
    pathname,
    router,
    applyOnboardingForWorkspace,
    refreshData,
  ]);

  useEffect(() => {
    if (isAuthenticated !== true) return;
    if (!urlWorkspaceId) return;
    const hasOAuthParam =
      searchParams.has("slack_connected") || searchParams.has("slack_error");
    if (!hasOAuthParam) return;
    void loadSlackConnected(urlWorkspaceId).then(() => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("slack_connected");
      p.delete("slack_error");
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    });
  }, [
    isAuthenticated,
    urlWorkspaceId,
    searchParams,
    pathname,
    router,
    loadSlackConnected,
  ]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateWorkspace = async () => {
    setIsLoading(true);
    setError("");

    try {
      const storedUser = localStorage.getItem("currentUser");
      if (!storedUser) {
        setError("User session not found");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);

      const createdWorkspace = await createWorkspace({
        name: formData.name.trim(),
        created_by_user_id: userData.id,
      });

      justCreatedWorkspaceIdRef.current = createdWorkspace.id;
      resyncAttemptedForIdRef.current = null;
      setCurrentWorkspaceId(createdWorkspace.id);
      setOnboardingWorkspaceId(createdWorkspace.id);
      setOpenaiMcpServerId(createdWorkspace.openai_mcp_server_id ?? null);
      setCurrentStep(2);
      setSlackConnected(false);
      router.replace(
        `${pathname}?workspaceId=${encodeURIComponent(createdWorkspace.id)}`,
        { scroll: false },
      );
    } catch (err) {
      void err;
      setError("Failed to create workspace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishOnboarding = async () => {
    const apiKey = formData.openaiApiKey.trim();
    setError("");

    if (apiKey && !openaiMcpServerId) {
      setError(
        "OpenAI integration is not available. Add a key in Integrations.",
      );
      return;
    }

    if (apiKey && openaiMcpServerId && onboardingWorkspaceId) {
      setIsLoading(true);
      try {
        const storedUser = localStorage.getItem("currentUser");
        if (!storedUser) {
          setError("User session not found");
          return;
        }
        const userData = JSON.parse(storedUser);
        const tokenResult = await executeWorkflow("BearerTokenCreateWorkflow", {
          user_id: userData.id,
          workspace_id: onboardingWorkspaceId,
          mcp_server_id: openaiMcpServerId,
          access_token: apiKey,
          token_name: "Workspace API key",
        });
        if (!tokenResult?.success) {
          setError(
            "Could not save your OpenAI key. You can add it in Integrations.",
          );
          return;
        }
      } catch {
        setError(
          "Could not save your OpenAI key. Try again or use Integrations.",
        );
        return;
      } finally {
        setIsLoading(false);
      }
    }

    window.location.href = "/agents/new";
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            New workspace
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Let&apos;s set up a new workspace for agents
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-3 sm:space-x-4 max-w-md">
            <div
              className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 text-sm sm:text-base shrink-0 ${
                currentStep >= 1
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-neutral-300"
              }`}
            >
              1
            </div>
            <div
              className={`h-1 flex-1 min-w-[1.5rem] max-w-20 ${currentStep >= 2 ? "bg-primary" : "bg-neutral-300"}`}
            />
            <div
              className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 text-sm sm:text-base shrink-0 ${
                currentStep >= 2
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-neutral-300"
              }`}
            >
              2
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Workspace
                </CardTitle>
                <CardDescription>Create a new workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g. My team, Acme Corp"
                    required
                  />
                </div>
                {error && currentStep === 1 && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-red-800 dark:text-red-200 text-sm">
                      {error}
                    </p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={() => void handleCreateWorkspace()}
                    disabled={!formData.name.trim() || isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>Create workspace</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                  You can add or change these any time in Integrations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold tracking-tight flex items-center gap-2">
                      Slack
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Add the app to a Slack workspace to run agents in
                      channels.
                    </p>
                  </div>
                  <div className="flex flex-col items-stretch sm:items-start gap-3">
                    {slackConnected ? (
                      <Badge
                        variant="secondary"
                        className="text-green-500 w-fit gap-1.5 py-1.5 pl-2 pr-2.5 text-sm font-medium"
                      >
                        <Check className="size-3.5" aria-hidden />
                        Connected
                      </Badge>
                    ) : addToSlackUrl ? (
                      <Button
                        variant="outline"
                        asChild
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <a href={addToSlackUrl}>
                          <SlackIcon className="size-4 shrink-0" />
                          Connect to Slack
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled
                      >
                        <SlackIcon className="size-4 shrink-0" />
                        Add to Slack
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-base font-semibold tracking-tight">
                    OpenAI
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="openaiApiKey">API key (optional)</Label>
                    <Input
                      id="openaiApiKey"
                      type="password"
                      value={formData.openaiApiKey}
                      onChange={(e) =>
                        handleInputChange("openaiApiKey", e.target.value)
                      }
                      placeholder="sk-..."
                      className="font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For running agents. Encrypted and stored securely. Gemini,
                    Anthropic, and custom models are in Early Preview.{" "}
                    <a
                      href="https://www.restack.io/contact"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Contact us for access
                    </a>
                  </p>
                </div>

                {error && currentStep === 2 && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-red-800 dark:text-red-200 text-sm">
                      {error}
                    </p>
                  </div>
                )}

                <div className="flex w-full justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => void handleFinishOnboarding()}
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <CreateWorkspaceContent />
    </Suspense>
  );
}
