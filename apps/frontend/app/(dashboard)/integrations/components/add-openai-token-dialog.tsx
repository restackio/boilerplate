"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useOAuthFlow } from "@/hooks/use-oauth-flow";
import { AddTokenDialog } from "./add-token-dialog";
import { RefreshCw } from "lucide-react";

interface AddOpenAITokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the user successfully adds a token (e.g. to refresh parent state) */
  onTokenAdded?: () => void;
}

/**
 * Dialog prompting the user to add an OpenAI API key to the workspace.
 * Used when creating a task or new agent and the workspace has no OpenAI token.
 */
export function AddOpenAITokenDialog({
  open,
  onOpenChange,
  onTokenAdded,
}: AddOpenAITokenDialogProps) {
  const { openaiServer, fetchMcpServers, executeWorkflow, mcpServersLoading } =
    useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();
  const { startOAuthFlow } = useOAuthFlow();

  // When dialog opens, ensure we have fresh MCP server list (parent may not have fetched yet)
  useEffect(() => {
    if (open) {
      fetchMcpServers();
    }
  }, [open, fetchMcpServers]);

  const handleBearerTokenSave = async (token: string, name: string) => {
    if (!currentUser?.id || !openaiServer) return;

    try {
      const result = await executeWorkflow("BearerTokenCreateWorkflow", {
        user_id: currentUser.id,
        workspace_id: openaiServer.workspace_id,
        mcp_server_id: openaiServer.id,
        access_token: token,
        token_name: name || undefined,
      });

      if (result.success) {
        await fetchMcpServers();
        onTokenAdded?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to save bearer token:", error);
    }
  };

  const handleStartOAuth = async () => {
    if (openaiServer) {
      await startOAuthFlow(openaiServer);
      onOpenChange(false);
    }
  };

  if (!openaiServer) {
    const isLoading = mcpServersLoading.isLoading;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>OpenAI API key required</DialogTitle>
            <DialogDescription>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading integrations…
                </span>
              ) : (
                <>
                  This workspace needs an OpenAI API key to create tasks and run
                  agents. The OpenAI integration could not be found. Go to
                  Integrations to add your key.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <AddTokenDialog
      open={open}
      onOpenChange={onOpenChange}
      server={openaiServer}
      onStartOAuth={handleStartOAuth}
      onSaveBearerToken={handleBearerTokenSave}
      defaultTab="bearer"
    />
  );
}
