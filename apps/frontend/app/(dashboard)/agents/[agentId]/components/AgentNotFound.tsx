"use client";

import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/ui/button";
import { Bot } from "lucide-react";

export function AgentNotFound() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Agent not found</h2>
        <p className="text-muted-foreground">
          The agent you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button 
          onClick={() => router.push("/agents")} 
          className="mt-4"
          variant="outline"
        >
          Back to Agents
        </Button>
      </div>
    </div>
  );
}
