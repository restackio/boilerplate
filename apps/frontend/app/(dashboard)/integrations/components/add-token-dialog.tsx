"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { ExternalLink, Key, Link } from "lucide-react";
import { McpServer } from "@/hooks/use-workspace-scoped-actions";

interface AddTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServer | null;
  onStartOAuth: () => void;
  onSaveBearerToken: (token: string, name: string) => void;
  defaultTab?: "oauth" | "bearer";
}

export function AddTokenDialog({ 
  open, 
  onOpenChange, 
  server, 
  onStartOAuth, 
  onSaveBearerToken,
  defaultTab 
}: AddTokenDialogProps) {
  const [bearerToken, setBearerToken] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [activeTab, setActiveTab] = useState(defaultTab || "oauth");

  if (!server) return null;

  const handleBearerTokenSave = () => {
    if (!bearerToken.trim()) return;
    onSaveBearerToken(bearerToken, tokenName);
    setBearerToken("");
    setTokenName("");
    onOpenChange(false);
  };

  const handleOAuthStart = () => {
    onStartOAuth();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setBearerToken("");
      setTokenName("");
    } else {
      // Reset to default tab when opening
      const hasOAuth = !!server?.server_url;
      const initialTab = defaultTab || (hasOAuth ? "oauth" : "bearer");
      setActiveTab(initialTab);
    }
    onOpenChange(open);
  };

  // Determine available tabs based on server type
  const hasOAuth = !!server.server_url;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add token for {server.server_label}
          </DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to authenticate with this integration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "oauth" | "bearer")}>
          <TabsList className="grid w-full grid-cols-2">
            {hasOAuth && (
              <TabsTrigger value="oauth" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                OAuth
              </TabsTrigger>
            )}
            <TabsTrigger value="bearer" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Bearer Token
            </TabsTrigger>
          </TabsList>

          {hasOAuth && (
            <TabsContent value="oauth" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Recommended:</strong> OAuth provides secure, token-based authentication 
                    without exposing your credentials.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll be redirected to {server.server_label} to authorize this connection.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleOAuthStart}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Start OAuth
                </Button>
              </DialogFooter>
            </TabsContent>
          )}

          <TabsContent value="bearer" className="space-y-4">
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
                  placeholder="Enter your API token or key..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This token will be securely stored and used for API authentication.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleBearerTokenSave} disabled={!bearerToken.trim()}>
                Save
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
