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
import {
  ExternalLink,
} from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "../../../../../hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "../../../../../lib/database-workspace-context";


interface IntegrationTokensTabProps {
  server: McpServer;
}

export function IntegrationTokensTab({ server }: IntegrationTokensTabProps) {
  const { executeWorkflow } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [showBearerDialog, setShowBearerDialog] = useState(false);
  const [bearerToken, setBearerToken] = useState("");
  const [tokenName, setTokenName] = useState("");

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
    if (!currentUser?.id) {
      console.error("No current user available");
      return;
    }

    try {
      // Start OAuth flow
      const result = await executeWorkflow("McpOAuthInitializeWorkflow", {
        user_id: currentUser.id,
        workspace_id: server.workspace_id,
        mcp_server_id: server.id,
      });
      
      if (result.success && result.data && typeof result.data === 'object' && 'authorization_url' in result.data) {
        const data = result.data as { authorization_url: string; client_id?: string; client_secret?: string };
        
        // Store OAuth session data for callback
        sessionStorage.setItem('oauth_mcp_server_id', server.id);
        sessionStorage.setItem('oauth_user_id', currentUser.id);
        sessionStorage.setItem('oauth_workspace_id', server.workspace_id);
        
        // Store client credentials if available
        if (data.client_id) {
          sessionStorage.setItem('oauth_client_id', data.client_id);
        }
        if (data.client_secret) {
          sessionStorage.setItem('oauth_client_secret', data.client_secret);
        }
        
        // Redirect to OAuth authorization URL
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
    }
    setShowOAuthDialog(false);
  };

  const handleBearerTokenSave = async () => {
    if (!bearerToken.trim()) return;
    if (!currentUser?.id) {
      console.error("No current user available");
      return;
    }

    try {
      const result = await executeWorkflow("BearerTokenCreateWorkflow", {
        user_id: currentUser.id,
        workspace_id: server.workspace_id,
        mcp_server_id: server.id,
        bearer_token: bearerToken,
        token_name: tokenName || undefined,
      });
      
      if (result.success) {
        await loadTokens();
        setBearerToken("");
        setTokenName("");
        setShowBearerDialog(false);
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
        onAddOAuth={server.server_url ? () => setShowOAuthDialog(true) : undefined}
        onAddBearerToken={() => setShowBearerDialog(true)}
        isLoading={loading}
      />

      {/* OAuth Dialog */}
      {server.server_url && (
        <Dialog open={showOAuthDialog} onOpenChange={setShowOAuthDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect with OAuth</DialogTitle>
              <DialogDescription>
                You'll be redirected to {server.server_label} to authorize this connection.
                This is the recommended secure method for connecting to remote services.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOAuthDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleOAuthConnect}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Start OAuth Flow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bearer Token Dialog */}
      <Dialog open={showBearerDialog} onOpenChange={setShowBearerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bearer Token</DialogTitle>
            <DialogDescription>
              Enter a Bearer token for direct API authentication. This token will be
              encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name (Optional)</Label>
              <Input
                id="token-name"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g., Production API Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bearer-token">Bearer Token</Label>
              <Textarea
                id="bearer-token"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBearerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBearerTokenSave} disabled={!bearerToken.trim()}>
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
