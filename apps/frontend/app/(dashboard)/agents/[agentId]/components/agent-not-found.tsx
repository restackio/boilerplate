"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@workspace/ui/components/empty-state";

export function AgentNotFound() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-96">
      <EmptyState
        title="Agent not found"
        description="The agent you're looking for doesn't exist or has been removed."
        action={{
          label: "Back to Agents",
          onClick: () => router.push("/agents"),
          variant: "outline"
        }}
      />
    </div>
  );
}
