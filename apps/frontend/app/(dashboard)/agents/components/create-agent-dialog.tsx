"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { QuickActionDialog, useQuickActionDialog } from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Plus, MessageSquare, Workflow } from "lucide-react";

interface CreateAgentDialogProps {
  onAgentCreated?: () => void;
}

export function CreateAgentDialog({ onAgentCreated }: CreateAgentDialogProps) {
  const { createAgent } = useWorkspaceScopedActions();
  const { isOpen, open, close, isLoading, handleError, handleSuccess } = useQuickActionDialog();
  
  const [agentName, setAgentName] = useState("");
  const [selectedAgentType, setSelectedAgentType] = useState<"interactive" | "pipeline" | null>(null);
  const [nameError, setNameError] = useState("");

  const validateAgentName = (name: string): boolean => {
    const slugPattern = /^[a-z0-9-_]+$/;
    if (!name) {
      setNameError("Agent name is required");
      return false;
    }
    if (!slugPattern.test(name)) {
      setNameError("Agent name must be in slug format (lowercase letters, numbers, hyphens, underscores only)");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleCreateAgent = async () => {
    // Validate inputs
    if (!validateAgentName(agentName)) {
      throw new Error("Please enter a valid agent name");
    }
    
    if (!selectedAgentType) {
      throw new Error("Please select an agent type");
    }

    // Create agent data based on type
    const baseInstructions = selectedAgentType === "interactive" 
      ? "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses."
      : "You are a pipeline agent designed to process and transform data at scale. Focus on reliability, efficiency, and data quality in your operations.";

    const agentData = {
      name: agentName,
      description: "",
      instructions: baseInstructions,
      model: "gpt-5",
      reasoning_effort: "medium",
      type: selectedAgentType,
      status: "draft" as const,
    };

    const result = await createAgent(agentData);
    if (result.success) {
      setAgentName("");
      setSelectedAgentType(null);
      setNameError("");
      onAgentCreated?.();
    } else {
      throw new Error(result.error || "Failed to create agent");
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAgentName(value);
    if (value) {
      validateAgentName(value);
    } else {
      setNameError("");
    }
  };

  return (
    <>
      <Button size="sm" onClick={open}>
        <Plus className="h-4 w-4 mr-1" />
        New agent
      </Button>

      <QuickActionDialog
        isOpen={isOpen}
        onClose={close}
        title="Create new agent"
        description="Enter a name for your agent and choose the type that best fits your needs."
        onPrimaryAction={handleCreateAgent}
        primaryActionLabel="Create agent"
        primaryActionIcon={Plus}
        isLoading={isLoading}
        closeOnSuccess={true}
        onSuccess={handleSuccess}
        onError={handleError}
        size="lg"
      >
        <div className="space-y-6">
          {/* Agent Name Input */}
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              placeholder="e.g., support-agent, data-processor"
              value={agentName}
              onChange={handleNameChange}
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && (
              <p className="text-sm text-red-600">{nameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Agent Type Selection */}
          <div className="space-y-3">
            <Label>Type</Label>
            <div className="space-y-3">
              {/* Interactive Agent Card */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedAgentType === "interactive" 
                    ? "border-primary" 
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedAgentType("interactive")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Interactive Agent</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    An agent that interacts directly with users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Takes tasks through chat or UI</li>
                    <li>• Uses tools and context to generate outputs</li>
                    <li>• Designed for feedback loops and iteration</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Pipeline Agent Card */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAgentType === "pipeline" 
                    ? "border-primary" 
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedAgentType("pipeline")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Pipeline Agent</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    An agent that runs in the background.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ingests and transforms data at scale</li>
                    <li>• Saves enriched results into the context store</li>
                    <li>• Designed for automation and reliability</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </QuickActionDialog>
    </>
  );
} 