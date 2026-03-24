"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Loader2 } from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { ExternalLink, Key, Link } from "lucide-react";
import { McpServer } from "@/hooks/use-workspace-scoped-actions";

interface AddTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServer | null;
  onStartOAuth: () => void;
  onSaveBearerToken: (token: string, name: string) => void | Promise<void>;
  defaultTab?: "oauth" | "bearer";
}

function initialAuthTab(
  server: McpServer | null,
  defaultTab: AddTokenDialogProps["defaultTab"],
): "oauth" | "bearer" {
  if (defaultTab) return defaultTab;
  if (server?.server_url) return "oauth";
  return "bearer";
}

export function AddTokenDialog({
  open,
  onOpenChange,
  server,
  onStartOAuth,
  onSaveBearerToken,
  defaultTab,
}: AddTokenDialogProps) {
  const [bearerToken, setBearerToken] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [activeTab, setActiveTab] = useState<"oauth" | "bearer">(() =>
    initialAuthTab(server, defaultTab),
  );
  const [saving, setSaving] = useState(false);
  const dialogWasOpenRef = useRef(false);

  // Parent often opens the dialog by setting open=true without Radix firing onOpenChange(true),
  // so set the tab when the dialog first opens (fixes bearer-only integrations like OpenAI).
  useEffect(() => {
    if (!open) {
      dialogWasOpenRef.current = false;
      return;
    }
    if (!server) return;
    if (!dialogWasOpenRef.current) {
      setActiveTab(initialAuthTab(server, defaultTab));
      dialogWasOpenRef.current = true;
    }
  }, [open, server, defaultTab]);

  if (!server) return null;

  const handleBearerTokenSave = async () => {
    if (!bearerToken.trim()) return;
    setSaving(true);
    try {
      await onSaveBearerToken(bearerToken, tokenName);
      setBearerToken("");
      setTokenName("");
      // Parent is responsible for closing the dialog on success (onOpenChange(false))
    } finally {
      setSaving(false);
    }
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
      setActiveTab(initialAuthTab(server, defaultTab));
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

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "oauth" | "bearer")}
        >
          {hasOAuth && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="oauth" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                OAuth
              </TabsTrigger>

              <TabsTrigger value="bearer" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Bearer Token
              </TabsTrigger>
            </TabsList>
          )}

          {hasOAuth && (
            <TabsContent value="oauth" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Recommended:</strong> OAuth provides secure,
                    token-based authentication without exposing your
                    credentials.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll be redirected to {server.server_label} to
                  authorize this connection.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
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
                <Label htmlFor="token-name">Name</Label>
                <Input
                  id="token-name"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g., Production API Key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bearer-token">Token</Label>
                <Textarea
                  id="bearer-token"
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  placeholder="Enter your API token or key..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This token will be securely stored and used for API
                  authentication.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBearerTokenSave}
                disabled={!bearerToken.trim() || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
