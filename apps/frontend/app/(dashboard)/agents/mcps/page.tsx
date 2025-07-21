"use client";

import { MCPsTable } from "@workspace/ui/components/mcps-table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@workspace/ui/components/ui/button";
import { availableMCPs } from "@/lib/demo-data/mcps";
import AgentsTabs from "../AgentsTabs";
import { Plus } from "lucide-react";

export default function MCPsPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();

  const handleViewMCP = (mcpId: string) => {
    router.push(`/mcps/${mcpId}`);
  };

  const breadcrumbs = [{ label: "MCPs" }];

  const actions = (
    <>
      <Button variant="ghost" size="sm">
        Sync from backend
      </Button>
      <Button size="sm" variant="ghost">
        <Plus className="h-4 w-4 mr-1" />
        Add Public MCP
      </Button>
    </>
  );

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} fixed={true} />
      <AgentsTabs />

      {/* Main Content - with top padding for fixed header */}
      <div className="pt-8 p-4">
        <MCPsTable data={availableMCPs} onViewMCP={handleViewMCP} />
      </div>
    </div>
  );
}
