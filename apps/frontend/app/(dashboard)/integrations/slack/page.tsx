"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
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

const SLACK_BOT_URL =
  process.env.NEXT_PUBLIC_SLACK_BOT_URL || "http://localhost:3002";

interface SlackInstallation {
  id: string;
  team_id: string;
  team_name: string;
  workspace_id: string;
  installed_at?: string;
  created_at?: string;
}

interface ChannelAgentMapping {
  id: string;
  slack_installation_id: string;
  channel_id: string;
  channel_name: string;
  agent_id: string;
  agent_name?: string;
  is_default: boolean;
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

  const [installation, setInstallation] = useState<SlackInstallation | null>(
    null,
  );
  const [mappings, setMappings] = useState<ChannelAgentMapping[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newAgentId, setNewAgentId] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [addingMapping, setAddingMapping] = useState(false);

  const fetchInstallation = useCallback(async () => {
    if (!isReady || !currentWorkspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await executeWorkflow<
        | { installations?: SlackInstallation[] }
        | SlackInstallation[]
      >("SlackInstallationsByWorkspaceWorkflow", {
        workspace_id: currentWorkspaceId,
      });

      if (result.success && result.data) {
        const raw = result.data;
        const installations = Array.isArray(raw)
          ? raw
          : (raw as { installations?: SlackInstallation[] })
              .installations ?? [];
        setInstallation(installations[0] ?? null);
      } else {
        setInstallation(null);
      }
    } catch {
      setError("Failed to load Slack installation status");
      setInstallation(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, currentWorkspaceId, executeWorkflow]);

  const fetchMappings = useCallback(async () => {
    if (!installation) return;

    try {
      const result = await executeWorkflow<
        | { channel_agents?: ChannelAgentMapping[] }
        | ChannelAgentMapping[]
      >("SlackChannelAgentsByInstallationWorkflow", {
        slack_installation_id: installation.id,
      });

      if (result.success && result.data) {
        const raw = result.data;
        const items = Array.isArray(raw)
          ? raw
          : (raw as { channel_agents?: ChannelAgentMapping[] })
              .channel_agents ?? [];
        setMappings(items);
      }
    } catch {
      console.error("Failed to fetch channel-agent mappings");
    }
  }, [installation, executeWorkflow]);

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
    fetchInstallation();
  }, [fetchInstallation]);

  useEffect(() => {
    if (installation) {
      fetchMappings();
      fetchAgents();
    }
  }, [installation, fetchMappings, fetchAgents]);

  const handleDisconnect = async () => {
    if (!installation) return;

    setActionLoading("disconnect");
    try {
      const result = await executeWorkflow("SlackInstallationDeleteWorkflow", {
        team_id: installation.team_id,
      });

      if (result.success) {
        setInstallation(null);
        setMappings([]);
      } else {
        setError(result.error ?? "Failed to disconnect Slack workspace");
      }
    } catch {
      setError("Failed to disconnect Slack workspace");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMapping = async () => {
    if (!installation || !newChannelId || !newAgentId) return;

    setAddingMapping(true);
    try {
      const result = await executeWorkflow(
        "SlackChannelAgentCreateWorkflow",
        {
          slack_installation_id: installation.id,
          channel_id: newChannelId,
          channel_name: newChannelName || newChannelId,
          agent_id: newAgentId,
          is_default: newIsDefault,
        },
      );

      if (result.success) {
        setNewChannelId("");
        setNewChannelName("");
        setNewAgentId("");
        setNewIsDefault(false);
        setAddDialogOpen(false);
        await fetchMappings();
      } else {
        setError(result.error ?? "Failed to create channel mapping");
      }
    } catch {
      setError("Failed to create channel mapping");
    } finally {
      setAddingMapping(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    setActionLoading(`delete-${mappingId}`);
    try {
      const result = await executeWorkflow(
        "SlackChannelAgentDeleteWorkflow",
        { id: mappingId },
      );

      if (result.success) {
        await fetchMappings();
      } else {
        setError(result.error ?? "Failed to delete channel mapping");
      }
    } catch {
      setError("Failed to delete channel mapping");
    } finally {
      setActionLoading(null);
    }
  };

  const getAgentName = (agentId: string) => {
    return agents.find((a) => a.id === agentId)?.name ?? agentId;
  };

  const handleRefresh = () => {
    fetchInstallation();
    if (installation) fetchMappings();
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
        ) : !installation ? (
          <NotConnectedCard workspaceId={currentWorkspaceId} />
        ) : (
          <>
            <ConnectedWorkspaceCard
              installation={installation}
              onDisconnect={handleDisconnect}
              disconnecting={actionLoading === "disconnect"}
            />

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Channel-Agent Mappings</CardTitle>
                    <CardDescription>
                      Route Slack channels to specific agents
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Mapping
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {mappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No channel mappings yet. Add one to route Slack messages to
                    an agent.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">
                                {mapping.channel_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {mapping.channel_id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {mapping.agent_name ??
                              getAgentName(mapping.agent_id)}
                          </TableCell>
                          <TableCell>
                            {mapping.is_default && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMapping(mapping.id)}
                              disabled={
                                actionLoading === `delete-${mapping.id}`
                              }
                            >
                              {actionLoading === `delete-${mapping.id}` ? (
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

            <AddMappingDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              agents={agents}
              channelId={newChannelId}
              onChannelIdChange={setNewChannelId}
              channelName={newChannelName}
              onChannelNameChange={setNewChannelName}
              agentId={newAgentId}
              onAgentIdChange={setNewAgentId}
              isDefault={newIsDefault}
              onIsDefaultChange={setNewIsDefault}
              onSubmit={handleAddMapping}
              submitting={addingMapping}
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
  const oauthUrl = `${SLACK_BOT_URL}/slack/oauth/authorize${
    workspaceId ? `?workspace_id=${workspaceId}` : ""
  }`;

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
        <Button asChild size="lg">
          <a href={oauthUrl}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Add to Slack
          </a>
        </Button>
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
  installation,
  onDisconnect,
  disconnecting,
}: {
  installation: SlackInstallation;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const installedDate = installation.installed_at ?? installation.created_at;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <SlackIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{installation.team_name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  Connected
                </Badge>
                <span className="text-xs">
                  Team ID: {installation.team_id}
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

function AddMappingDialog({
  open,
  onOpenChange,
  agents,
  channelId,
  onChannelIdChange,
  channelName,
  onChannelNameChange,
  agentId,
  onAgentIdChange,
  isDefault,
  onIsDefaultChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  channelId: string;
  onChannelIdChange: (v: string) => void;
  channelName: string;
  onChannelNameChange: (v: string) => void;
  agentId: string;
  onAgentIdChange: (v: string) => void;
  isDefault: boolean;
  onIsDefaultChange: (v: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Channel Mapping</DialogTitle>
          <DialogDescription>
            Map a Slack channel to an agent. Messages in this channel will be
            handled by the selected agent.
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              placeholder="#general"
              value={channelName}
              onChange={(e) => onChannelNameChange(e.target.value)}
            />
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
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-default"
              checked={isDefault}
              onCheckedChange={(checked) => onIsDefaultChange(checked === true)}
            />
            <Label htmlFor="is-default" className="text-sm font-normal">
              Set as default mapping for unmatched channels
            </Label>
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
                Creating...
              </>
            ) : (
              "Create Mapping"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
