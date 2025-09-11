"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { useWorkspaceScopedActions, type McpServer } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { 
  Plug, 
  Plus, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Globe,
  Server,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { Badge } from "@workspace/ui/components/ui/badge";


interface UserOAuthConnection {
  id: string;
  user_id: string;
  mcp_server_id: string;
  connected_at: string;
  expires_at: string | null;
}

interface McpServersTableProps {
  data: McpServer[];
  userConnections: UserOAuthConnection[];
  onConnectServer: (serverId: string) => void;
}

function McpServersTable({ data, userConnections, onConnectServer }: McpServersTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center">
          <Plug className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No MCP Servers Available</h3>
          <p className="text-muted-foreground mb-4">
            No MCP servers have been configured for this workspace yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Ask your workspace admin to add MCP servers in the{" "}
            <a href="/dashboard/agents/mcps" className="text-primary hover:underline">
              MCP Servers
            </a>{" "}
            section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Available MCP Servers</h3>
        <p className="text-sm text-muted-foreground">
          Connect your personal accounts to enable agents to access these services on your behalf.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Server</TableHead>
            <TableHead className="hidden md:table-cell w-1/4">Type</TableHead>
            <TableHead className="hidden lg:table-cell w-1/4">Your Connection</TableHead>
            <TableHead className="w-1/6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((server) => {
            const connection = userConnections.find(conn => conn.mcp_server_id === server.id);
            const isConnected = !!connection;
            
            return (
              <TableRow key={server.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span>{server.server_label}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {server.server_description || (server.local ? "Local MCP server" : server.server_url)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={server.local ? "secondary" : "outline"} className="text-xs">
                    {server.local ? (
                      <>
                        <Server className="h-3 w-3 mr-1" />
                        Local
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Remote
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {isConnected ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Connected</span>
                      </div>
                      {connection?.connected_at && (
                        <div className="text-xs text-muted-foreground">
                          Connected {new Date(connection.connected_at).toLocaleDateString()}
                        </div>
                      )}
                      {connection?.expires_at && (
                        <div className="text-xs text-muted-foreground">
                          Expires {new Date(connection.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Not connected</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isConnected ? (
                    <div className="flex gap-2">
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      {/* TODO: Add disconnect/refresh token functionality */}
                    </div>
                  ) : (
                    <Button 
                      onClick={() => onConnectServer(server.id)}
                      size="sm"
                      variant="outline"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Account
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function IntegrationsPage() {
  const { currentWorkspaceId, currentUser } = useDatabaseWorkspace();
  const { mcpServers, mcpServersLoading, fetchMcpServers, executeWorkflow } = useWorkspaceScopedActions();
  const [userConnections, setUserConnections] = useState<UserOAuthConnection[]>([]);
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);

  // Load MCP servers and user connections
  useEffect(() => {
    fetchMcpServers();
    
    // TODO: Load user OAuth connections when API is available
    // const loadConnections = async () => {
    //   if (!currentUser?.id || !currentWorkspaceId) return;
    //   
    //   try {
    //     const connectionsResult = await executeWorkflow<any>(
    //       "UserOAuthConnectionsReadWorkflow", 
    //       { user_id: currentUser.id, workspace_id: currentWorkspaceId }
    //     );
    //     
    //     if (connectionsResult.success && connectionsResult.data?.connections) {
    //       setUserConnections(connectionsResult.data.connections);
    //     }
    //   } catch (error) {
    //     console.error("Failed to load user connections:", error);
    //   }
    // };
    // 
    // loadConnections();
  }, [fetchMcpServers]);

  const handleConnectServer = (serverId: string) => {
    const server = mcpServers.find(s => s.id === serverId);
    if (server) {
      setSelectedServer(server);
      setShowConnectDialog(true);
    }
  };

  const handleOAuthConnect = async () => {
    if (!selectedServer || !currentUser || !currentWorkspaceId) return;
    
    setOAuthLoading(true);
    try {
      console.log("Initiating MCP OAuth flow for server:", selectedServer.server_label);
      
      const result = await executeWorkflow<any>(
        "McpOAuthInitializeWorkflow",
        {
          user_id: currentUser.id,
          workspace_id: currentWorkspaceId,
          mcp_server_id: selectedServer.id,
        }
      );

      if (result.success && result.data?.authorization_url) {
        // Store OAuth parameters for callback
        sessionStorage.setItem('oauth_mcp_server_id', selectedServer.id);
        sessionStorage.setItem('oauth_user_id', currentUser.id);
        sessionStorage.setItem('oauth_workspace_id', currentWorkspaceId);
        
        // Store client_id and client_secret for token exchange
        if (result.data.client_id) {
          sessionStorage.setItem('oauth_client_id', result.data.client_id);
        }
        if (result.data.client_secret) {
          sessionStorage.setItem('oauth_client_secret', result.data.client_secret);
        }

        // Redirect to OAuth URL
        window.location.href = result.data.authorization_url;
        setShowConnectDialog(false);
      } else {
        const errorMsg = result.error || "Failed to initiate OAuth flow";
        console.error("OAuth initiation failed:", errorMsg);
        alert(`OAuth setup failed: ${errorMsg}`);
      }
      
    } catch (error) {
      console.error("OAuth flow error:", error);
      alert("Failed to start OAuth flow. Please check the console for details.");
    } finally {
      setOAuthLoading(false);
    }
  };

  if (mcpServersLoading.isLoading && mcpServers.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading OAuth integrations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OAuth Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal OAuth connections to MCP servers for agent access
          </p>
        </div>
      </div>

      {/* Error State */}
      {mcpServersLoading.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800 text-sm">
            Error loading MCP servers: {mcpServersLoading.error}
          </p>
        </div>
      )}

      {/* MCP Servers Table */}
      <McpServersTable
        data={mcpServers}
        userConnections={userConnections}
        onConnectServer={handleConnectServer}
      />

      {/* Connect OAuth Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Connect to {selectedServer?.server_label}
            </DialogTitle>
            <DialogDescription>
              Connect your account to this MCP server to enable OAuth-based agent integrations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Server Details:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Type:</strong> {selectedServer?.local ? "Local MCP Server" : "Remote MCP Server"}</p>
                {selectedServer?.server_url && (
                  <p><strong>URL:</strong> {selectedServer.server_url}</p>
                )}
                {selectedServer?.server_description && (
                  <p><strong>Description:</strong> {selectedServer.server_description}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                onClick={handleOAuthConnect}
                disabled={oauthLoading}
              >
                {oauthLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Account
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowConnectDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
