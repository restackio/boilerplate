"use client";

import { useState, useCallback } from "react";
import { Label } from "@workspace/ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Button } from "@workspace/ui/components/ui/button";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Copy, Check, Share2 } from "lucide-react";

interface Agent {
  id?: string;
  name?: string;
  status: "published" | "draft" | "archived";
  is_public?: boolean;
}

interface AgentSharingTabProps {
  agent: Agent | null;
  isSaving: boolean;
  onAgentUpdated?: () => void;
}

export function AgentSharingTab({
  agent,
  isSaving,
  onAgentUpdated,
}: AgentSharingTabProps) {
  const [publicCopied, setPublicCopied] = useState(false);
  const { updateAgent } = useWorkspaceScopedActions();
  const isPublic = !!agent?.is_public;
  const isPublished = agent?.status === "published";

  const handlePublicToggle = useCallback(
    async (checked: boolean) => {
      if (!agent?.id) return;
      const result = await updateAgent(agent.id, { is_public: checked });
      if (result.success && result.data) {
        onAgentUpdated?.();
      }
    },
    [agent?.id, updateAgent, onAgentUpdated],
  );

  const publicUrl =
    typeof window !== "undefined" && agent?.id
      ? `${window.location.origin}/chat/${agent.id}`
      : "";

  const copyPublicUrl = useCallback(() => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setPublicCopied(true);
    setTimeout(() => setPublicCopied(false), 2000);
  }, [publicUrl]);

  if (!isPublished) {
    return (
      <div className="p-6">
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Publish this agent to enable public sharing. Only published agents can be shared via a public link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Public URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="is-public">Make public</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Anyone with the link can chat with this agent without logging in. Conversations appear in your dashboard.
              </p>
            </div>
            <Switch
              id="is-public"
              checked={isPublic}
              onCheckedChange={handlePublicToggle}
              disabled={isSaving}
            />
          </div>
          {isPublic && publicUrl && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <code className="text-xs flex-1 truncate">{publicUrl}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyPublicUrl}
                className="shrink-0"
              >
                {publicCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
