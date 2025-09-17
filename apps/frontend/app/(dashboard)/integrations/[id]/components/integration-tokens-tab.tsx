"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { TokensTable, TokenData } from "@workspace/ui/components/tokens-table";
import { useWorkspaceScopedActions, McpServer } from "../../../../../hooks/use-workspace-scoped-actions";
import { useOAuthFlow } from "../../../../../hooks/use-oauth-flow";
import { useDatabaseWorkspace } from "../../../../../lib/database-workspace-context";
import { AddTokenDialog } from "../../../../../components/add-token-dialog";


interface IntegrationTokensTabProps {
  server: McpServer;
}

export function IntegrationTokensTab({ server }: IntegrationTokensTabProps) {
  const { executeWorkflow } = useWorkspaceScopedActions();
  const { startOAuthFlow } = useOAuthFlow();
  const { currentUser } = useDatabaseWorkspace();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTokenDialog, setShowAddTokenDialog] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const result = await executeWorkflow("OAuthTokensGetByWorkspaceWorkflow", {
        workspace_id: server.workspace_id,
      });
      if (result.success && result.data && typeof result.data === 'object' && 'tokens' in result.data) {
        // Filter tokens for this specific server
        const tokens = (result.data as { tokens: TokenData[] }).tokens;
        const serverTokens = tokens.filter(
          (token: TokenData) => token.mcp_server_id === server.id
        );
        setTokens(serverTokens);
      }
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setLoading(false);
    }
  }, [server.id, server.workspace_id, executeWorkflow]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);


  const handleOAuthConnect = async () => {
    await startOAuthFlow(server);
  };

  const handleBearerTokenSave = async (token: string, name: string) => {
    if (!currentUser?.id) {
      console.error("No current user available");
      return;
    }

    try {
      const result = await executeWorkflow("BearerTokenCreateWorkflow", {
        user_id: currentUser.id,
        workspace_id: server.workspace_id,
        mcp_server_id: server.id,
        bearer_token: token,
        token_name: name || undefined,
      });
      
      if (result.success) {
        await loadTokens();
      }
    } catch (error) {
      console.error("Failed to save bearer token:", error);
    }
  };

  const handleDeleteToken = async (_tokenId: string) => {
    if (!currentUser?.id) {
      console.error("No current user available");
      return;
    }

    try {
      const result = await executeWorkflow("OAuthTokenDeleteWorkflow", {
        user_id: currentUser.id,
        mcp_server_id: server.id,
      });
      
      if (result.success) {
        await loadTokens();
      }
    } catch (error) {
      console.error("Failed to delete token:", error);
    }
  };

  const handleMakeDefault = async (tokenId: string) => {
    try {
      const result = await executeWorkflow("OAuthTokenSetDefaultByIdWorkflow", {
        token_id: tokenId,
      });
      
      if (result.success) {
        // Refresh the tokens list to show updated default status
        await loadTokens();
      } else {
        console.error("Failed to set token as default:", result.error);
      }
    } catch (error) {
      console.error("Failed to set token as default:", error);
    }
  };



  return (
    <div>
      <TokensTable
        data={tokens}
        onDeleteToken={handleDeleteToken}
        onMakeDefault={handleMakeDefault}
        onAddToken={() => setShowAddTokenDialog(true)}
        isLoading={loading}
      />

      {/* Add Token Dialog */}
      <AddTokenDialog
        open={showAddTokenDialog}
        onOpenChange={setShowAddTokenDialog}
        server={server}
        onStartOAuth={handleOAuthConnect}
        onSaveBearerToken={handleBearerTokenSave}
      />
    </div>
  );
}
