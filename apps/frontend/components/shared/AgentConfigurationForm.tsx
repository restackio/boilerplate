"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@workspace/ui/components/ui/button";
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

export interface AgentConfigData {
  name?: string;
  description?: string;
  instructions: string;
  model: string;
  reasoning_effort: string;
}

interface AgentConfigurationFormProps {
  // Data
  initialData?: Partial<AgentConfigData>;
  onChange?: (data: AgentConfigData) => void;
  
  // UI Configuration
  showNameField?: boolean;
  showDescriptionField?: boolean;
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

// Model options - centralized
export const MODEL_OPTIONS = [
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
];

// Reasoning effort options - centralized
export const REASONING_EFFORT_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function AgentConfigurationForm({
  initialData,
  onChange,
  showNameField = true,
  showDescriptionField = true,
  showInstructionsPreview = false,
  isReadOnly = false,
  variant = "full",
  instructionsMinHeight = "200px",
  validateName = true,
  nameError: externalNameError,
  onNameValidation,
}: AgentConfigurationFormProps) {
  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 
    "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses."
  );
  const [model, setModel] = useState(initialData?.model || "gpt-5");
  const [reasoningEffort, setReasoningEffort] = useState(initialData?.reasoning_effort || "medium");
  
  // UI state
  const [previewMode, setPreviewMode] = useState(true);
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

  // Emit changes
  const emitChange = useCallback((overrides: Partial<AgentConfigData> = {}) => {
    const payload: AgentConfigData = {
      ...(showNameField && { name }),
      ...(showDescriptionField && { description }),
      instructions,
      model,
      reasoning_effort: reasoningEffort,
      ...overrides,
    };
    onChange?.(payload);
  }, [name, description, instructions, model, reasoningEffort, showNameField, showDescriptionField, onChange]);

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      if (initialData.name !== undefined) setName(initialData.name);
      if (initialData.description !== undefined) setDescription(initialData.description);
      if (initialData.instructions !== undefined) setInstructions(initialData.instructions);
      if (initialData.model !== undefined) setModel(initialData.model);
      if (initialData.reasoning_effort !== undefined) setReasoningEffort(initialData.reasoning_effort);
    }
  }, [
    initialData,
    initialData?.name,
    initialData?.description,
    initialData?.instructions,
    initialData?.model,
    initialData?.reasoning_effort
  ]);

  // Emit initial values only once when component mounts
  useEffect(() => {
    if (onChange) {
      const payload: AgentConfigData = {
        ...(showNameField && { name }),
        ...(showDescriptionField && { description }),
        instructions,
        model,
        reasoning_effort: reasoningEffort,
      };
      onChange(payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  // Format instructions with MCP tool references
  const formatInstructionsWithMCPs = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="font-bold text-black bg-neutral-100 px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Instructions preview component
  const InstructionsPreview = ({ instructions }: { instructions: string }) => {
    const formattedInstructions = formatInstructionsWithMCPs(instructions);
    return (
      <div className="whitespace-pre-wrap font-mono text-sm p-3 bg-muted rounded-md border min-h-[200px]">
        {formattedInstructions}
      </div>
    );
  };

  // Render field wrapper based on variant
  const FieldWrapper = ({ children, title }: { children: React.ReactNode; title?: string }) => {
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
              setName(v);
              validateAgentName(v);
              emitChange({ name: v });
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
              setDescription(v);
              emitChange({ description: v });
            }}
            placeholder="Brief description of what this agent does..."
            disabled={isReadOnly}
          />
        </div>
      )}

      {/* Model Configuration */}
      <FieldWrapper title="Model Configuration">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agent-model" className="text-xs">Model</Label>
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v);
                emitChange({ model: v });
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
            <Label htmlFor="agent-reasoning-effort" className="text-xs">Reasoning Effort</Label>
            <Select
              value={reasoningEffort}
              onValueChange={(v) => {
                setReasoningEffort(v);
                emitChange({ reasoning_effort: v });
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

      {/* Instructions */}
      <FieldWrapper title="System Instructions">
        <div className="space-y-4">
          {showInstructionsPreview && (
            <div className="flex items-center gap-2">
              <div className="ml-auto flex gap-1">
                <Button
                  type="button"
                  variant={!previewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode(false)}
                  disabled={isReadOnly}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant={previewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode(true)}
                >
                  Preview
                </Button>
              </div>
            </div>
          )}

          {(!showInstructionsPreview || !previewMode) ? (
            <div className="space-y-2">
              <Textarea
                id="agent-instructions"
                value={instructions}
                onChange={(e) => {
                  const v = e.target.value;
                  setInstructions(v);
                  emitChange({ instructions: v });
                }}
                placeholder="Enter detailed instructions for how this agent should behave..."
                className={`font-mono text-sm resize-none`}
                style={{ minHeight: instructionsMinHeight }}
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Define how the agent should respond. Use{" "}
                <code className="bg-muted px-1 rounded">@tool_name</code>{" "}
                to reference MCP tools.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <InstructionsPreview instructions={instructions} />
              <p className="text-xs text-muted-foreground">
                Preview of how the instructions will appear with tool references highlighted.
              </p>
            </div>
          )}
        </div>
      </FieldWrapper>
    </div>
  );
}
