"use client";

import { useState, useEffect } from "react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
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
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import {
  Key,
  Plus,
  Shield,
  Trash2,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "../../../../../hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "../../../../../lib/database-workspace-context";

interface OAuthToken {
  id: string;
  user_id: string;
  workspace_id: string;
  mcp_server_id: string;
  auth_type: string;
  token_type: string;
  expires_at: string | null;
  scope: string[] | null;
  connected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface IntegrationTokensTabProps {
  server: McpServer;
}

export function IntegrationTokensTab({ server }: IntegrationTokensTabProps) {
  const { executeWorkflow } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();
  const [tokens, setTokens] = useState<OAuthToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [showBearerDialog, setShowBearerDialog] = useState(false);
  const [bearerToken, setBearerToken] = useState("");
  const [tokenName, setTokenName] = useState("");

  useEffect(() => {
    loadTokens();
  }, [server.id]);

  const loadTokens = async () => {
    try {
      const result = await executeWorkflow("OAuthTokensGetByWorkspaceWorkflow", {
        workspace_id: server.workspace_id,
      });
      if (result.success && result.data && typeof result.data === 'object' && 'tokens' in result.data) {
        // Filter tokens for this specific server
        const tokens = (result.data as any).tokens;
        const serverTokens = tokens.filter(
          (token: OAuthToken) => token.mcp_server_id === server.id
        );
        setTokens(serverTokens);
      }
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setLoading(false);
    }
  };

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
        const data = result.data as any;
        
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

  const handleDeleteToken = async (tokenId: string) => {
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

  const getAuthTypeBadge = (authType: string) => {
    switch (authType) {
      case "oauth":
        return <Badge variant="default" className="text-xs">OAuth</Badge>;
      case "bearer":
        return <Badge variant="secondary" className="text-xs">Bearer</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{authType}</Badge>;
    }
  };

  const getStatusBadge = (token: OAuthToken) => {
    if (token.expires_at) {
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      if (expiresAt < now) {
        return <Badge variant="destructive" className="text-xs flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expired
        </Badge>;
      }
    }
    return <Badge variant="default" className="text-xs flex items-center gap-1">
      <CheckCircle className="h-3 w-3" />
      Active
    </Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Token Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {server.server_url && (
              <Dialog open={showOAuthDialog} onOpenChange={setShowOAuthDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Connect with OAuth
                  </Button>
                </DialogTrigger>
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

            <Dialog open={showBearerDialog} onOpenChange={setShowBearerDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Add Bearer Token
                </Button>
              </DialogTrigger>
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
        </CardContent>
      </Card>

      {/* Active Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active Tokens ({tokens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
              <p className="text-muted-foreground">
                Connect to this integration using OAuth or add a Bearer token to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      {getAuthTypeBadge(token.auth_type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(token)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {token.connected_at 
                          ? new Date(token.connected_at).toLocaleDateString()
                          : "Unknown"
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      {token.expires_at ? (
                        <div className="text-sm text-muted-foreground">
                          {new Date(token.expires_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {token.scope && token.scope.length > 0 ? (
                          token.scope.map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No scope</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteToken(token.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
