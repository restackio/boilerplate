"use client";

import { useState, useCallback} from "react";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { PROMPT_TEMPLATES } from "./prompt-templates";

export interface AgentConfigData {
  name?: string;
  description?: string;
  instructions: string;
  model: string;
  reasoning_effort: string;
}

interface AgentConfigurationFormProps {
  // Data
  data: AgentConfigData | null;
  onChange: (data: Partial<AgentConfigData>) => void;
  
  // UI Configuration
  showNameField?: boolean;
  showDescriptionField?: boolean;
  showModelSection?: boolean; // Control model configuration section
  showInstructionsSection?: boolean; // Control instructions section
  showInstructionsPreview?: boolean;
  isReadOnly?: boolean;
  
  // Layout
  variant?: "full" | "compact"; // full = cards, compact = simple
  instructionsMinHeight?: string;
  
  // Validation
  validateName?: boolean;
  nameError?: string;
  onNameValidation?: (isValid: boolean, error: string) => void;
}

// Model options - centralized (latest OpenAI models per https://developers.openai.com/api/docs/changelog/)
export const MODEL_OPTIONS = [
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.2-chat-latest", label: "GPT-5.2 Chat (latest)" },
  { value: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5.1-chat-latest", label: "GPT-5.1 Chat (latest)" },
  { value: "gpt-5.1-codex", label: "GPT-5.1 Codex" },
  { value: "gpt-5.1-codex-mini", label: "GPT-5.1 Codex Mini" },
  { value: "gpt-5.1-codex-max", label: "GPT-5.1 Codex Max" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-5-nano", label: "GPT-5 Nano" },
  { value: "gpt-5-2025-08-07", label: "GPT-5 (2025-08-07)" },
  { value: "gpt-5-mini-2025-08-07", label: "GPT-5 Mini (2025-08-07)" },
  { value: "gpt-5-nano-2025-08-07", label: "GPT-5 Nano (2025-08-07)" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "o3-deep-research", label: "O3 Deep Research" },
  { value: "o4-mini-deep-research", label: "O4 Mini Deep Research" },
];

// Reasoning effort options - centralized
export const REASONING_EFFORT_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// Helper component for layout
function FieldWrapper({ children, title, variant }: { children: React.ReactNode; title?: string; variant: "full" | "compact" }) {
  if (variant === "compact") {
    return <div className="space-y-2">{children}</div>;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export function AgentConfigurationForm({
  data,
  onChange,
  showNameField = true,
  showDescriptionField = true,
  showModelSection = true,
  showInstructionsSection = true,
  isReadOnly = false,
  variant = "full",
  instructionsMinHeight = "200px",
  validateName = true,
  nameError: externalNameError,
  onNameValidation,
}: AgentConfigurationFormProps) {
  // Controlled component - use data from props
  const name = data?.name || "";
  const description = data?.description || "";
  const instructions = data?.instructions || "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses.";
  const model = data?.model || "gpt-5.2";
  const reasoningEffort = data?.reasoning_effort || "medium";
  
  // UI state
  const [internalNameError, setInternalNameError] = useState("");
  
  const nameError = externalNameError || internalNameError;

  // Validation
  const validateAgentName = useCallback((name: string): boolean => {
    if (!validateName) return true;
    
    const slugPattern = /^[a-z0-9-_]+$/;
    if (!name) {
      const error = "Agent name is required";
      setInternalNameError(error);
      onNameValidation?.(false, error);
      return false;
    }
    if (!slugPattern.test(name)) {
      const error = "Agent name must be in slug format (lowercase letters, numbers, hyphens, underscores only)";
      setInternalNameError(error);
      onNameValidation?.(false, error);
      return false;
    }
    setInternalNameError("");
    onNameValidation?.(true, "");
    return true;
  }, [validateName, onNameValidation]);

  return (
    <div className="space-y-4">
      {/* Name Field */}
      {showNameField && (
        <div className="space-y-2">
          <Label htmlFor="agent-name">Name</Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ name: v });
              validateAgentName(v);
            }}
            placeholder="e.g., github-pr-agent, zendesk-support"
            className={nameError ? "border-red-500" : ""}
            disabled={isReadOnly}
          />
          {nameError && (
            <p className="text-sm text-red-500">{nameError}</p>
          )}
          <p className="text-xs text-neutral-500">
            Use lowercase letters, numbers, hyphens, and underscores only
          </p>
        </div>
      )}

      {/* Description Field */}
      {showDescriptionField && (
        <div className="space-y-2">
          <Label htmlFor="agent-description">Description</Label>
          <Input
            id="agent-description"
            value={description}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ description: v });
            }}
            placeholder="Brief description of what this agent does..."
            disabled={isReadOnly}
          />
        </div>
      )}

      {/* Model Configuration */}
      {showModelSection && (
        <FieldWrapper title="Model Configuration" variant={variant}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-model" className="text-xs">Model</Label>
              <Select
                value={model}
                onValueChange={(v) => {
                  onChange({ model: v });
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className={variant === "compact" ? "mt-1" : ""}>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-reasoning-effort" className="text-xs">Reasoning effort</Label>
              <Select
                value={reasoningEffort}
                onValueChange={(v) => {
                  onChange({ reasoning_effort: v });
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className={variant === "compact" ? "mt-1" : ""}>
                  <SelectValue placeholder="Select reasoning effort" />
                </SelectTrigger>
                <SelectContent>
                  {REASONING_EFFORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FieldWrapper>
      )}

      {/* Instructions */}
      {showInstructionsSection && (
        <FieldWrapper title="Instructions" variant={variant}>
          <div className="space-y-3">
            {/* Template Insertion - Only show in edit mode */}
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Insert from template:</Label>
                <Select onValueChange={(id) => {
                  const template = PROMPT_TEMPLATES.find(x => x.id === id);
                  if (template) {
                    const newInstructions = instructions 
                      ? instructions + "\n\n" + template.content 
                      : template.content;
                    onChange({ instructions: newInstructions });
                  }
                }}>
                  <SelectTrigger className="h-8 w-full">
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
            )}
            
            <Textarea
              id="agent-instructions"
              value={instructions}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ instructions: v });
              }}
              placeholder="Enter detailed instructions for how this agent should behave..."
              className={`font-mono text-sm resize-none`}
              style={{ minHeight: instructionsMinHeight }}
              disabled={isReadOnly}
            />
            <p className="text-xs text-muted-foreground">
              Define how the agent should respond. Markdown is supported.
            </p>
          </div>
        </FieldWrapper>
      )}
    </div>
  );
}
