"use client";

import { useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { Label } from "@workspace/ui/components/ui/label";
import { AgentToolsManager } from "./agent-tools-manager";
import { AgentConfigurationForm, type AgentConfigData, type AgentConfigurationFormRef } from "./agent-configuration-form";

interface Agent {
  id?: string;
  name?: string;
  description?: string;
  instructions?: string;
  status: "published" | "draft" | "archived";
  model?: string;
  reasoning_effort?: string;
}

export interface AgentSetupTabRef {
  getCurrentData: () => AgentConfigData | null;
}

interface AgentSetupTabProps {
  agent: Agent | null;
  onSave: (agentData: AgentConfigData) => Promise<void>;
  isSaving: boolean;
  workspaceId: string;
  onChange?: (agentData: AgentConfigData) => void; // Deprecated - use ref instead
}

export const AgentSetupTab = forwardRef<AgentSetupTabRef, AgentSetupTabProps>(({ agent, workspaceId }, ref) => {
  const [nameError, setNameError] = useState("");
  const formRef = useRef<AgentConfigurationFormRef>(null);
  
  // Check if agent is published (read-only)
  const isReadOnly = agent?.status === "published";

  // Handle name validation
  const handleNameValidation = useCallback((isValid: boolean, error: string) => {
    setNameError(error);
  }, []);

  // Memoize initial data to prevent unnecessary re-renders
  const initialData = useMemo(() => ({
    name: agent?.name,
    description: agent?.description,
    instructions: agent?.instructions || "",
    model: agent?.model || "gpt-5",
    reasoning_effort: agent?.reasoning_effort || "medium",
  }), [agent?.name, agent?.description, agent?.instructions, agent?.model, agent?.reasoning_effort]);

  // Expose getCurrentData function via ref
  useImperativeHandle(ref, () => ({
    getCurrentData: () => {
      return formRef.current?.getCurrentData() || null;
    },
  }), []);

  return (
    <div className="space-y-6">
      {/* Agent Configuration Form */}
      <AgentConfigurationForm
        ref={formRef}
        initialData={initialData}
        showNameField={true}
        showDescriptionField={true}
        showInstructionsPreview={true}
        isReadOnly={isReadOnly}
        variant="full"
        instructionsMinHeight="400px"
        validateName={true}
        nameError={nameError}
        onNameValidation={handleNameValidation}
      />

      {/* Tools Section */}
      <div className="space-y-4">
        <Label>Tools</Label>
        {agent?.id && (
          <AgentToolsManager agentId={agent.id} workspaceId={workspaceId} agent={agent} />
        )}
      </div>

    </div>
  );
});

AgentSetupTab.displayName = "AgentSetupTab"; 