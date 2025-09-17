"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent } from "@workspace/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { PageHeader } from "@workspace/ui/components/page-header";
import { TooltipProvider } from "@workspace/ui/components/ui/tooltip";
import {
  Settings,
  AlertCircle,
  Key,
  Trash2,
} from "lucide-react";
import { useWorkspaceScopedActions, McpServer } from "../../../../hooks/use-workspace-scoped-actions";
import { IntegrationSetupTab } from "./components/integration-setup-tab";
import { IntegrationTokensTab } from "./components/integration-tokens-tab";


export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getMcpServerById, updateMcpServer, deleteMcpServer } = useWorkspaceScopedActions();
  const [server, setServer] = useState<McpServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("setup");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  interface McpServerFormData {
    server_label: string;
    server_url: string;
    local: boolean;
    server_description: string;
    headers: Record<string, string>;
  }

  const [setupData, setSetupData] = useState<{
    formData?: McpServerFormData;
    headerInput?: string;
  }>({});

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
      <TooltipProvider>
        <div className="flex-1">
          <PageHeader 
            breadcrumbs={[
              { label: "Integrations", href: "/integrations" },
              { label: "Loading..." }
            ]} 
            fixed={true}
          />
          <div className="bg-primary-foreground p-4">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (!server) {
    return (
      <TooltipProvider>
        <div className="flex-1">
          <PageHeader 
            breadcrumbs={[
              { label: "Integrations", href: "/integrations" },
              { label: "Integration not found" }
            ]} 
            fixed={true}
          />
          <div className="bg-primary-foreground p-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Integration not found</h3>
                  <p className="text-muted-foreground mb-4">
                    The integration you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                  </p>
                  <Button onClick={() => router.push("/integrations")}>
                    Back to Integrations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const breadcrumbs = [
    { label: "Integrations", href: "/integrations" },
    { label: server.server_label }
  ];

  const handleSave = async () => {
    if (!server || !setupData.formData) {
      console.error("No server or setup data available for saving");
      return;
    }

    setIsSaving(true);
    try {
      // Parse headers if provided
      let parsedHeaders = {};
      if (setupData.headerInput?.trim()) {
        try {
          parsedHeaders = JSON.parse(setupData.headerInput);
        } catch (error) {
          console.error("Invalid JSON format for headers:", error);
          alert("Invalid JSON format for headers");
          setIsSaving(false);
          return;
        }
      }

      const result = await updateMcpServer(server.id, {
        server_label: setupData.formData.server_label,
        server_url: setupData.formData.local ? undefined : setupData.formData.server_url,
        local: setupData.formData.local,
        server_description: setupData.formData.server_description || undefined,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
      });

      if (result?.success) {
        // Reload the server data to reflect the changes
        const updatedResult = await getMcpServerById(integrationId);
        if (updatedResult.success && updatedResult.data) {
          setServer(updatedResult.data);
        }
        console.log("Integration saved successfully");
      } else {
        console.error("Failed to save integration:", result?.error);
        alert(result?.error || "Failed to save integration");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save integration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!server) {
      console.error("No server available for deletion");
      return;
    }

    if (!confirm(`Are you sure you want to delete the integration "${server.server_label}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteMcpServer(server.id);
      if (result?.success) {
        console.log("Integration deleted successfully");
        router.push("/integrations");
      } else {
        console.error("Failed to delete integration:", result?.error);
        alert(result?.error || "Failed to delete integration");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete integration");
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex-1">
        <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />

        {/* Main Content */}
        <div className="bg-primary-foreground p-4">
          <div className="space-y-6">
            <div className="bg-background rounded-lg border">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b bg-muted/30 rounded-t-lg px-4 py-2">
                  <TabsList className="bg-transparent p-0 h-auto gap-1">
                    <TabsTrigger
                      value="setup"
                      className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Settings className="h-4 w-4" />
                      Setup
                    </TabsTrigger>
                    <TabsTrigger
                      value="tokens"
                      className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Key className="h-4 w-4" />
                      Tokens
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="setup" className="p-6 space-y-6">
                  <IntegrationSetupTab 
                    server={server} 
                    onDataChange={setSetupData}
                  />
                </TabsContent>

                <TabsContent value="tokens" className="p-6">
                  <IntegrationTokensTab server={server} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
