"use client";

/**
 * Channels view for the agent-builder.
 *
 * Shows the Slack channels connected to the agents created in this build
 * session. The "Connect" modal does NOT call the Slack API: the user
 * pastes a channel ID directly, so we don't need the ``groups:read`` /
 * ``channels:read`` OAuth scopes for browsing.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, Plus, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useAddToSlackAuthorizeUrl } from "@/lib/use-add-to-slack-url";

const SLACK_CHANNEL_TYPE = "slack";


interface ChannelIntegration {
  id: string;
  workspace_id: string;
  channel_type: string;
  external_id: string;
  created_at?: string;
}

interface ChannelWithIntegration {
  id: string;
  channel_integration_id: string;
  external_channel_id: string;
  external_channel_name?: string | null;
  agent_id: string;
  channel_type: string;
  external_id: string;
  created_at?: string | null;
}

export interface BuildChannelsAgent {
  id: string;
  name: string;
}

interface BuildChannelsProps {
  workspaceId: string;
  agents: BuildChannelsAgent[];
}

export function BuildChannels({ workspaceId, agents }: BuildChannelsProps) {
  const { executeWorkflow } = useWorkspaceScopedActions();
  const addToSlackUrl = useAddToSlackAuthorizeUrl(workspaceId);

  const [integration, setIntegration] = useState<ChannelIntegration | null>(
    null,
  );
  const [bindings, setBindings] = useState<ChannelWithIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newChannelId, setNewChannelId] = useState("");
  const [newAgentId, setNewAgentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const agentIds = useMemo(
    () => agents.map((a) => a.id).filter(Boolean),
    [agents],
  );
  const agentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of agents) m.set(a.id, a.name);
    return m;
  }, [agents]);

  const fetchIntegration = useCallback(async () => {
    if (!workspaceId) return;
    const result = await executeWorkflow<
      { integrations?: ChannelIntegration[] } | ChannelIntegration[]
    >("ChannelIntegrationsByWorkspaceWorkflow", {
      workspace_id: workspaceId,
      channel_type: SLACK_CHANNEL_TYPE,
    });
    if (result.success && result.data) {
      const raw = result.data;
      const integrations = Array.isArray(raw)
        ? raw
        : ((raw as { integrations?: ChannelIntegration[] }).integrations ?? []);
      setIntegration(integrations[0] ?? null);
    } else {
      setIntegration(null);
    }
  }, [workspaceId, executeWorkflow]);

  const fetchBindings = useCallback(async () => {
    if (!workspaceId || agentIds.length === 0) {
      setBindings([]);
      return;
    }
    const result = await executeWorkflow<
      { channels?: ChannelWithIntegration[] } | ChannelWithIntegration[]
    >("ChannelsByWorkspaceWorkflow", {
      workspace_id: workspaceId,
      channel_type: SLACK_CHANNEL_TYPE,
      agent_ids: agentIds,
    });
    if (result.success && result.data) {
      const raw = result.data;
      const items = Array.isArray(raw)
        ? raw
        : ((raw as { channels?: ChannelWithIntegration[] }).channels ?? []);
      setBindings(items);
    }
  }, [workspaceId, agentIds, executeWorkflow]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchIntegration(), fetchBindings()]);
    } catch {
      setError("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [fetchIntegration, fetchBindings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!integration) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await executeWorkflow<{
          ok?: boolean;
          updated_count?: number;
        }>("SlackRefreshChannelNamesWorkflow", {
          channel_integration_id: integration.id,
        });
        if (!cancelled && result.success && result.data?.updated_count) {
          await fetchBindings();
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [integration, executeWorkflow, fetchBindings]);

  const handleAdd = async () => {
    if (!integration || !newChannelId.trim() || !newAgentId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await executeWorkflow("ChannelCreateWorkflow", {
        channel_integration_id: integration.id,
        external_channel_id: newChannelId.trim(),
        agent_id: newAgentId,
      });
      if (result.success) {
        setNewChannelId("");
        setNewAgentId("");
        setAddOpen(false);
        await fetchBindings();
      } else {
        setError(result.error ?? "Failed to connect channel");
      }
    } catch {
      setError("Failed to connect channel");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bindingId: string) => {
    setActionLoading(`delete-${bindingId}`);
    setError(null);
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

  const canAdd = Boolean(integration) && agents.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Slack channels connected to agents in this build.
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => void refresh()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => setAddOpen(true)}
            disabled={!canAdd}
            title={
              !integration
                ? "Connect Slack first"
                : agents.length === 0
                ? "No agents in this build yet"
                : "Connect a channel"
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Connect
          </Button>
        </div>
      </div>

      {error && <div className="text-xs text-destructive">{error}</div>}

      {!integration ? (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-2">
          <p>No Slack workspace connected.</p>
          {addToSlackUrl ? (
            <Button asChild size="sm" variant="outline" className="h-7">
              <a href={addToSlackUrl}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Connect Slack
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7" disabled>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Connect Slack
            </Button>
          )}
        </div>
      ) : bindings.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">
          No channels connected yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-8">Channel</TableHead>
              <TableHead className="h-8">Agent</TableHead>
              <TableHead className="h-8 w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bindings.map((b) => {
              const teamId = b.external_id || integration?.external_id;
              const channelDeepLink = teamId
                ? `https://slack.com/app_redirect?channel=${b.external_channel_id}&team=${teamId}`
                : null;
              const displayName = b.external_channel_name;
              return (
                <TableRow key={b.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-col leading-tight">
                        {displayName ? (
                          channelDeepLink ? (
                            <a
                              href={channelDeepLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium hover:underline"
                            >
                              {displayName}
                            </a>
                          ) : (
                            <span className="text-xs font-medium">
                              {displayName}
                            </span>
                          )
                        ) : (
                          <span className="font-mono text-xs">
                            {b.external_channel_id}
                          </span>
                        )}
                        {displayName ? (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {b.external_channel_id}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-xs">
                    {agentNameById.get(b.agent_id) ?? b.agent_id}
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => void handleDelete(b.id)}
                      disabled={actionLoading === `delete-${b.id}`}
                    >
                      {actionLoading === `delete-${b.id}` ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Channel</DialogTitle>
            <DialogDescription>
              Paste a Slack channel ID and pick an agent. Messages in that
              channel will be handled by the selected agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="build-channel-id">Slack channel ID</Label>
              <Input
                id="build-channel-id"
                placeholder="C0123456789"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                In Slack: channel name → About → Channel ID (at the bottom).
                Make sure to invite the bot to the channel afterwards.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={newAgentId} onValueChange={setNewAgentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleAdd()}
              disabled={
                !newChannelId.trim() ||
                !newAgentId ||
                submitting ||
                !integration
              }
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
    </div>
  );
}
