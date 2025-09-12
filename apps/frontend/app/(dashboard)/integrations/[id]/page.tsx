"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent } from "@workspace/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
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

// Provider icons mapping - generic approach based on service patterns
const getProviderIcon = (serverLabel: string) => {
  const label = serverLabel.toLowerCase();
  
  // Documentation & Knowledge Management
  if (label.includes("notion") || label.includes("confluence") || label.includes("wiki")) return "📋";
  if (label.includes("docs") || label.includes("document")) return "📄";
  
  // Development & Code
  if (label.includes("github") || label.includes("gitlab") || label.includes("bitbucket")) return "🐙";
  if (label.includes("code") || label.includes("repo")) return "💻";
  
  // Communication
  if (label.includes("slack") || label.includes("teams") || label.includes("discord")) return "💬";
  if (label.includes("email") || label.includes("mail")) return "📧";
  
  // Project Management
  if (label.includes("linear") || label.includes("jira") || label.includes("asana")) return "📊";
  if (label.includes("trello") || label.includes("project")) return "📋";
  
  // Design
  if (label.includes("figma") || label.includes("sketch") || label.includes("design")) return "🎨";
  
  // Search & Data
  if (label.includes("google") || label.includes("search")) return "🔍";
  if (label.includes("analytics") || label.includes("data")) return "📈";
  
  // AI & ML
  if (label.includes("openai") || label.includes("ai") || label.includes("gpt")) return "🤖";
  
  // Storage & Files
  if (label.includes("drive") || label.includes("dropbox") || label.includes("storage")) return "💾";
  
  // CRM & Sales
  if (label.includes("salesforce") || label.includes("crm") || label.includes("hubspot")) return "💼";
  
  // Default for any integration
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
      <div className="flex-1">
        <PageHeader 
          breadcrumbs={[
            { label: "Integrations", href: "/integrations" },
            { label: "Loading..." }
          ]} 
        />
        <div className="p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex-1">
        <PageHeader 
          breadcrumbs={[
            { label: "Integrations", href: "/integrations" },
            { label: "Integration not found" }
          ]} 
        />
        <div className="p-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Integration not found</h3>
                <p className="text-muted-foreground mb-4">
                  The integration you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button onClick={() => router.push("/integrations")}>
                  Back to Integrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Integrations", href: "/integrations" },
    { label: server.server_label }
  ];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-lg">{getProviderIcon(server.server_label)}</span>
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
      {server.local ? (
        <Badge variant="secondary" className="text-xs">Local</Badge>
      ) : (
        <Badge variant="default" className="text-xs">Remote</Badge>
      )}
    </div>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />

      {/* Main Content - with top padding for fixed header */}
      <div className="pt-8 p-4">
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
    </div>
  );
}
