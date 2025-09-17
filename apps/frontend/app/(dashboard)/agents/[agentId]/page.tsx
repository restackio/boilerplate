"use client";

import { useParams } from "next/navigation";
import { TooltipProvider } from "@workspace/ui/components/ui/tooltip";
import { PageHeader } from "@workspace/ui/components/page-header";
import { 
  AgentActions,
  AgentNotFound,
  AgentTabNavigation
} from "./components";
import { useAgentPage } from "./hooks/use-agent-page";

export default function AgentEditPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  
  const {
    agent,
    isReady,
    workspaceId,
    activeTab,
    isSaving,
    isPublishing,
    isDeleting,
    isArchiving,
    setActiveTab,
    handleDraftChange,
    handleSave,
    handlePublish,
    handleDelete,
    handleArchive,
    getAgentVersions,
  } = useAgentPage(agentId);

  // Note: Loading state is now handled by loading.tsx
  // Only check if data is ready, not if it's loading
  if (!isReady) {
    return null; // Next.js loading.tsx will handle the loading state
  }

  // Show not found state
  if (!agent) {
    return (
      <TooltipProvider>
        <AgentNotFound />
      </TooltipProvider>
    );
  }

  const breadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: agent.name },
  ];

  return (
    <TooltipProvider>
      <div className="flex-1">
        <PageHeader 
          breadcrumbs={breadcrumbs} 
          actions={
            <AgentActions
              agent={agent}
              onSave={() => handleSave()}
              onPublish={handlePublish}
              onDelete={handleDelete}
              onArchive={handleArchive}
              isSaving={isSaving}
              isPublishing={isPublishing}
              isDeleting={isDeleting}
              isArchiving={isArchiving}
            />
          } 
          fixed={true} 
        />

        {/* Main Content */}
        <div className="bg-primary-foreground p-4">
          <div className="space-y-6">
            <AgentTabNavigation
              agent={agent}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSave={handleSave}
              onChange={handleDraftChange}
              isSaving={isSaving}
              workspaceId={workspaceId}
              agentId={agentId}
              getAgentVersions={getAgentVersions}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
