"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { Badge } from "@workspace/ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { RefreshCw, Trash2, Plus, ExternalLink, Hash } from "lucide-react";
import {
  useWorkspaceScopedActions,
  type Agent,
} from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useAddToSlackAuthorizeUrl } from "@/lib/use-add-to-slack-url";

const SLACK_CHANNEL_TYPE = "slack";

// Generic ``channel_integrations`` row scoped to the Slack provider.
interface ChannelIntegration {
  id: string;
  workspace_id: string;
  channel_type: string;
  external_id: string;
  created_at?: string;
}

// Generic ``channels`` row binding an external channel to an agent.
interface ChannelBinding {
  id: string;
  channel_integration_id: string;
  external_channel_id: string;
  agent_id: string;
  agent_name?: string;
  created_at?: string;
}

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

export default function SlackIntegrationPage() {
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow } = useWorkspaceScopedActions();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [integration, setIntegration] = useState<ChannelIntegration | null>(
    null,
  );
  const [bindings, setBindings] = useState<ChannelBinding[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newChannelId, setNewChannelId] = useState("");
  const [newAgentId, setNewAgentId] = useState("");
  const [connectingChannel, setConnectingChannel] = useState(false);

  const fetchIntegration = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await executeWorkflow<
        | { integrations?: ChannelIntegration[] }
        | ChannelIntegration[]
      >("ChannelIntegrationsByWorkspaceWorkflow", {
        workspace_id: currentWorkspaceId,
        channel_type: SLACK_CHANNEL_TYPE,
      });

      if (result.success && result.data) {
        const raw = result.data;
        const integrations = Array.isArray(raw)
          ? raw
          : (raw as { integrations?: ChannelIntegration[] })
              .integrations ?? [];
        setIntegration(integrations[0] ?? null);
      } else {
        setIntegration(null);
      }
    } catch {
      setError("Failed to load Slack installation status");
      setIntegration(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, currentWorkspaceId, executeWorkflow]);

  const fetchBindings = useCallback(async () => {
    if (!integration) return;

    try {
      const result = await executeWorkflow<
        | { channels?: ChannelBinding[] }
        | ChannelBinding[]
      >("ChannelsByIntegrationWorkflow", {
        channel_integration_id: integration.id,
      });

      if (result.success && result.data) {
        const raw = result.data;
        const items = Array.isArray(raw)
          ? raw
          : (raw as { channels?: ChannelBinding[] }).channels ?? [];
        setBindings(items);
      }
    } catch {
      console.error("Failed to fetch channel bindings");
    }
  }, [integration, executeWorkflow]);

  const fetchAgents = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) return;

    try {
      const result = await executeWorkflow<Agent[]>("AgentsReadWorkflow", {
        workspace_id: currentWorkspaceId,
        published_only: true,
      });

      if (result.success && result.data) {
        setAgents(Array.isArray(result.data) ? result.data : []);
      }
    } catch {
      console.error("Failed to fetch agents");
    }
  }, [isReady, currentWorkspaceId, executeWorkflow]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  useEffect(() => {
    if (integration) {
      fetchBindings();
      fetchAgents();
    }
  }, [integration, fetchBindings, fetchAgents]);

  // Surface the result of the OAuth round-trip. The slack-bot redirects back
  // to whatever URL the frontend originally encoded into ``state.r``; on
  // success it appends ``?slack_connected=1`` and on failure
  // ``?slack_error=<code>`` (see append_oauth_result_to_return_url in
  // apps/slack-bot/src/bot_services/slack_oauth.py). We show a toast,
  // refresh state, and strip the query params so a manual refresh doesn't
  // re-toast.
  const oauthHandledRef = useRef(false);
  useEffect(() => {
    if (oauthHandledRef.current) return;
    const connected = searchParams.get("slack_connected");
    const errorCode = searchParams.get("slack_error");
    if (!connected && !errorCode) return;
    oauthHandledRef.current = true;

    if (connected) {
      toast({
        title: "Slack connected",
        description: "Your Slack workspace is now connected.",
      });
      fetchIntegration();
    } else if (errorCode === "already_connected_elsewhere") {
      toast({
        title: "Slack workspace already connected",
        description:
          "This Slack workspace is connected to a different Restack workspace. Ask its admin to disconnect it first, then try again.",
        variant: "destructive",
      });
    } else if (errorCode === "link_failed") {
      toast({
        title: "Slack install incomplete",
        description:
          "Slack authorized successfully, but we couldn't save the install. Please try again.",
        variant: "destructive",
      });
    } else if (errorCode) {
      toast({
        title: "Slack install failed",
        description: `Slack returned: ${errorCode}.`,
        variant: "destructive",
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("slack_connected");
    params.delete("slack_error");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, toast, router, pathname, fetchIntegration]);

  const handleDisconnect = async () => {
    if (!integration) return;

    setActionLoading("disconnect");
    try {
      const result = await executeWorkflow(
        "ChannelIntegrationDeleteWorkflow",
        {
          channel_type: SLACK_CHANNEL_TYPE,
          external_id: integration.external_id,
        },
      );

      if (result.success) {
        setIntegration(null);
        setBindings([]);
      } else {
        setError(result.error ?? "Failed to disconnect Slack workspace");
      }
    } catch {
      setError("Failed to disconnect Slack workspace");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectChannel = async () => {
    if (!integration || !newChannelId || !newAgentId) return;

    setConnectingChannel(true);
    try {
      const result = await executeWorkflow("ChannelCreateWorkflow", {
        channel_integration_id: integration.id,
        external_channel_id: newChannelId,
        agent_id: newAgentId,
      });

      if (result.success) {
        setNewChannelId("");
        setNewAgentId("");
        setAddDialogOpen(false);
        await fetchBindings();
      } else {
        setError(result.error ?? "Failed to connect channel");
      }
    } catch {
      setError("Failed to connect channel");
    } finally {
      setConnectingChannel(false);
    }
  };

  const handleDisconnectChannel = async (bindingId: string) => {
    setActionLoading(`delete-${bindingId}`);
    try {
      const result = await executeWorkflow("ChannelDeleteWorkflow", {
        id: bindingId,
      });

      if (result.success) {
        await fetchBindings();
      } else {
        setError(result.error ?? "Failed to disconnect channel");
      }
    } catch {
      setError("Failed to disconnect channel");
    } finally {
      setActionLoading(null);
    }
  };

  const getAgentName = (agentId: string) => {
    return agents.find((a) => a.id === agentId)?.name ?? agentId;
  };

  const handleRefresh = () => {
    fetchIntegration();
    if (integration) fetchBindings();
  };

  const breadcrumbs = [
    { label: "Integrations", href: "/integrations" },
    { label: "Slack" },
  ];

  const actions = (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRefresh}
      disabled={loading}
    >
      <RefreshCw
        className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
      />
      Refresh
    </Button>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />

      <div className="p-4 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-950/30 dark:border-red-900">
            <p className="text-red-800 text-sm dark:text-red-300">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-red-600 dark:text-red-400"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : !integration ? (
          <NotConnectedCard workspaceId={currentWorkspaceId} />
        ) : (
          <>
            <ConnectedWorkspaceCard
              integration={integration}
              onDisconnect={handleDisconnect}
              disconnecting={actionLoading === "disconnect"}
            />

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Connected Channels</CardTitle>
                    <CardDescription>
                      Route Slack channels to specific agents
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Connect Channel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {bindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No channels connected yet. Connect one to route Slack
                    messages to an agent.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel ID</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bindings.map((binding) => (
                        <TableRow key={binding.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono text-xs">
                                {binding.external_channel_id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {binding.agent_name ??
                              getAgentName(binding.agent_id)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnectChannel(binding.id)}
                              disabled={
                                actionLoading === `delete-${binding.id}`
                              }
                            >
                              {actionLoading === `delete-${binding.id}` ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <ConnectChannelDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              agents={agents}
              channelId={newChannelId}
              onChannelIdChange={setNewChannelId}
              agentId={newAgentId}
              onAgentIdChange={setNewAgentId}
              onSubmit={handleConnectChannel}
              submitting={connectingChannel}
            />
          </>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function NotConnectedCard({
  workspaceId,
}: {
  workspaceId: string | null;
}) {
  const oauthUrl = useAddToSlackAuthorizeUrl(workspaceId);

  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <SlackIcon className="h-8 w-8" />
        </div>
        <CardTitle>Connect Slack</CardTitle>
        <CardDescription>
          Connect your Slack workspace to enable AI-powered agents in your
          channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-6 pt-2">
        {oauthUrl ? (
          <Button asChild size="lg">
            <a href={oauthUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Add to Slack
            </a>
          </Button>
        ) : (
          <Button size="lg" disabled>
            <ExternalLink className="h-4 w-4 mr-2" />
            Add to Slack
          </Button>
        )}
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          Requires the Slack bot to be running in HTTP mode with{" "}
          <code className="text-xs">SLACK_CLIENT_ID</code> and{" "}
          <code className="text-xs">SLACK_CLIENT_SECRET</code> configured.
          See SETUP.md for details.
        </p>
      </CardContent>
    </Card>
  );
}

function ConnectedWorkspaceCard({
  integration,
  onDisconnect,
  disconnecting,
}: {
  integration: ChannelIntegration;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const installedDate = integration.created_at;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <SlackIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Slack Workspace</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  Connected
                </Badge>
                <span className="text-xs font-mono">
                  Team ID: {integration.external_id}
                </span>
                {installedDate && (
                  <span className="text-xs">
                    &middot; Installed{" "}
                    {new Date(installedDate).toLocaleDateString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Disconnect
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function ConnectChannelDialog({
  open,
  onOpenChange,
  agents,
  channelId,
  onChannelIdChange,
  agentId,
  onAgentIdChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  channelId: string;
  onChannelIdChange: (v: string) => void;
  agentId: string;
  onAgentIdChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Channel</DialogTitle>
          <DialogDescription>
            Connect a Slack channel to an agent. Messages in this channel will
            be handled by the selected agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="channel-id">Channel ID</Label>
            <Input
              id="channel-id"
              placeholder="C0123456789"
              value={channelId}
              onChange={(e) => onChannelIdChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in Slack: channel details → About → Channel ID.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={onAgentIdChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!channelId || !agentId || submitting}
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
