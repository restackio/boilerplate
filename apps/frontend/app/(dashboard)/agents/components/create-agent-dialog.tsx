"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { AgentConfigForm, useAgentConfig, type AgentConfigData } from "@workspace/ui/components/agent-config-form";
import { QuickActionDialog, useQuickActionDialog } from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Plus } from "lucide-react";

interface CreateAgentDialogProps {
  onAgentCreated?: () => void;
}

export function CreateAgentDialog({ onAgentCreated }: CreateAgentDialogProps) {
  const { createAgent } = useWorkspaceScopedActions();
  const { isOpen, open, close, isLoading, handleError, handleSuccess } = useQuickActionDialog();
  const { config, updateConfig, validateConfig, reset } = useAgentConfig({
    name: "",
    description: "",
    instructions: "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses.",
    model: "gpt-5",
    reasoning_effort: "medium",
  });

  const [nameError, setNameError] = useState("");

  const handleCreateAgent = async () => {
    // Validate config
    if (!validateConfig()) {
      throw new Error("Please fix validation errors");
    }

    // Create agent with status as draft
    const agentData = {
      ...config,
      status: "draft" as const,
    };

    const result = await createAgent(agentData);
    if (result.success) {
      reset();
      setNameError("");
      onAgentCreated?.();
    } else {
      throw new Error(result.error || "Failed to create agent");
    }
  };

  const handleConfigChange = (newConfig: AgentConfigData) => {
    updateConfig(newConfig);
    // Clear name error when name changes
    if (newConfig.name !== config.name) {
      setNameError("");
    }
  };

  const handleNameValidation = (isValid: boolean, error: string) => {
    setNameError(error);
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
        description="Configure your new agent with basic settings. You can add tools and detailed instructions after creation."
        onPrimaryAction={handleCreateAgent}
        primaryActionLabel="Create agent"
        primaryActionIcon={Plus}
        isLoading={isLoading}
        closeOnSuccess={true}
        onSuccess={handleSuccess}
        onError={handleError}
        size="lg"
      >
        <AgentConfigForm
          initialData={config}
          onChange={handleConfigChange}
          showNameField={true}
          showDescriptionField={true}
          showInstructionsPreview={false}
          variant="compact"
          validateName={true}
          nameError={nameError}
          onNameValidation={handleNameValidation}
        />
      </QuickActionDialog>
    </>
  );
} 