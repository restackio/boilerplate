"use client";

import { useState, useCallback } from "react";
import { Label } from "@workspace/ui/components/ui/label";
import { AgentToolsManager } from "./agent-tools-manager";
import { AgentConfigurationForm, type AgentConfigData } from "./agent-configuration-form";

interface Agent {
  id?: string;
  name?: string;
  description?: string;
  instructions?: string;
  status: "published" | "draft" | "archived";
  model?: string;
  reasoning_effort?: string;
}

interface AgentSetupTabProps {
  agent: Agent | null;
  draft: AgentConfigData | null;
  onChange: (draft: Partial<AgentConfigData>) => void;
  isSaving: boolean;
  workspaceId: string;
}

export function AgentSetupTab({ agent, draft, onChange, workspaceId }: AgentSetupTabProps) {
  const [nameError, setNameError] = useState("");
  
  // Check if agent is published (read-only)
  const isReadOnly = agent?.status === "published";

  // Handle name validation
  const handleNameValidation = useCallback((isValid: boolean, error: string) => {
    setNameError(error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Agent Configuration Form */}
      <AgentConfigurationForm
        data={draft}
        onChange={onChange}
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
} 