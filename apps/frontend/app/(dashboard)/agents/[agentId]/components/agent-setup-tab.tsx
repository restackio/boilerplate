"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { AgentToolsManager } from "./agent-tools-manager";
import { PROMPT_TEMPLATES } from "./prompt-templates";
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
  onSave: (agentData: AgentConfigData) => Promise<void>;
  isSaving: boolean;
  workspaceId: string;
  onChange?: (agentData: AgentConfigData) => void;
}

export function AgentSetupTab({ agent, onChange, workspaceId }: AgentSetupTabProps) {
  const [nameError, setNameError] = useState("");
  const [currentInstructions, setCurrentInstructions] = useState("");
  
  // Check if agent is published (read-only)
  const isReadOnly = agent?.status === "published";

  // Handle form data changes
  const handleFormChange = useCallback((data: AgentConfigData) => {
    onChange?.(data);
  }, [onChange]);

  // Handle name validation
  const handleNameValidation = useCallback((isValid: boolean, error: string) => {
    setNameError(error);
  }, []);

  // Handle instructions changes for template insertion
  const handleInstructionsChange = useCallback((newInstructions: string) => {
    setCurrentInstructions(newInstructions);
    handleFormChange({
      name: agent?.name || "",
      description: agent?.description || "",
      instructions: newInstructions,
      model: agent?.model || "gpt-5",
      reasoning_effort: agent?.reasoning_effort || "medium",
    });
  }, [agent?.name, agent?.description, agent?.model, agent?.reasoning_effort, handleFormChange]);

  // Memoize initial data to prevent unnecessary re-renders
  const initialData = useMemo(() => ({
    name: agent?.name,
    description: agent?.description,
    instructions: agent?.instructions || "",
    model: agent?.model || "gpt-5",
    reasoning_effort: agent?.reasoning_effort || "medium",
  }), [agent?.name, agent?.description, agent?.instructions, agent?.model, agent?.reasoning_effort]);

  // Update current instructions when agent changes
  useEffect(() => {
    if (agent?.instructions) {
      setCurrentInstructions(agent.instructions);
    }
  }, [agent?.instructions]);

  return (
    <div className="space-y-6">
      {/* Agent Configuration Form */}
      <AgentConfigurationForm
        initialData={initialData}
        onChange={handleFormChange}
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

      {/* Template Insertion - Only show in edit mode */}
      {!isReadOnly && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Insert template</Label>
            <Select onValueChange={(id) => {
              const template = PROMPT_TEMPLATES.find(x => x.id === id);
              if (template) {
                const newInstructions = currentInstructions 
                  ? currentInstructions + "\n\n" + template.content 
                  : template.content;
                handleInstructionsChange(newInstructions);
              }
            }}>
              <SelectTrigger className="h-8 w-[240px]">
                <SelectValue placeholder="GPT-5 best-practice templates" />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Select a template to append to your current instructions
          </p>
        </div>
      )}
    </div>
  );
} 