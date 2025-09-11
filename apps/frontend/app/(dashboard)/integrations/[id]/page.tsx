"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { Separator } from "@workspace/ui/components/ui/separator";
import {
  ArrowLeft,
  Settings,
  Users,
  Globe,
  CheckCircle,
  AlertCircle,
  Plus,
  Key,
  Shield,
} from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "../../../../hooks/use-workspace-scoped-actions";
import { IntegrationSetupTab } from "./components/integration-setup-tab";
import { IntegrationTokensTab } from "./components/integration-tokens-tab";

// Provider icons mapping
const getProviderIcon = (serverLabel: string) => {
  const label = serverLabel.toLowerCase();
  if (label.includes("notion")) return "📋";
  if (label.includes("github")) return "🐙";
  if (label.includes("slack")) return "💬";
  if (label.includes("linear")) return "📊";
  if (label.includes("figma")) return "🎨";
  if (label.includes("google")) return "🔍";
  if (label.includes("openai")) return "🤖";
  return "🔗";
};

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getMcpServerById } = useWorkspaceScopedActions();
  const [server, setServer] = useState<McpServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("setup");

  const integrationId = params.id as string;

  useEffect(() => {
    const loadServer = async () => {
      if (!integrationId) return;
      
      try {
        const result = await getMcpServerById(integrationId);
        if (result.success && result.data) {
          setServer(result.data);
        } else {
          console.error("Failed to load integration:", result.error);
        }
      } catch (error) {
        console.error("Failed to load integration:", error);
      } finally {
        setLoading(false);
      }
    };

    loadServer();
  }, [integrationId, getMcpServerById]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Integration not found</h3>
              <p className="text-muted-foreground mb-4">
                The integration you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => router.push("/integrations")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/integrations")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getProviderIcon(server.server_label)}</span>
          <div>
            <h1 className="text-2xl font-bold">{server.server_label}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {server.server_url ? (
                <>
                  <Globe className="h-4 w-4" />
                  <span>{new URL(server.server_url).hostname}</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span>Local Integration</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ml-auto">
          {server.local ? (
            <Badge variant="secondary" className="text-xs">Local</Badge>
          ) : (
            <Badge variant="default" className="text-xs">Remote</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {server.server_description && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-muted-foreground">{server.server_description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <IntegrationSetupTab server={server} />
        </TabsContent>

        <TabsContent value="tokens">
          <IntegrationTokensTab server={server} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
