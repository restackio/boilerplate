"use client";

import { useState, useMemo, useRef } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { AgentConfigForm, type AgentConfigFormRef } from "@workspace/ui/components/agent-config-form";
import { QuickActionDialog, useQuickActionDialog } from "@workspace/ui/components/quick-action-dialog";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Plus } from "lucide-react";

interface CreateAgentDialogProps {
  onAgentCreated?: () => void;
}

export function CreateAgentDialog({ onAgentCreated }: CreateAgentDialogProps) {
  const { createAgent } = useWorkspaceScopedActions();
  const { isOpen, open, close, isLoading, handleError, handleSuccess } = useQuickActionDialog();
  const formRef = useRef<AgentConfigFormRef>(null);
  
  const [nameError, setNameError] = useState("");

  // Use static initial data to prevent infinite loop
  const staticInitialData = useMemo(() => ({
    name: "",
    description: "",
    instructions: "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses.",
    model: "gpt-5",
    reasoning_effort: "medium",
  }), []);

  const handleCreateAgent = async () => {
    // Get current form data
    const formData = formRef.current?.getCurrentData();
    if (!formData) {
      throw new Error("Unable to get form data");
    }

    // Basic validation
    if (!formData.instructions?.trim()) {
      throw new Error("Instructions are required");
    }

    // Create agent with status as draft
    const agentData = {
      ...formData,
      status: "draft" as const,
    };

    const result = await createAgent(agentData);
    if (result.success) {
      setNameError("");
      onAgentCreated?.();
    } else {
      throw new Error(result.error || "Failed to create agent");
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
          ref={formRef}
          initialData={staticInitialData}
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