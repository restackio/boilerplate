"use client";

import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

export interface AgentConfigData {
  name?: string;
  description?: string;
  instructions: string;
  model: string;
  reasoning_effort: string;
}

interface AgentConfigFormProps {
  // Data
  initialData?: Partial<AgentConfigData>;

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

  // Model Options
  modelOptions?: Array<{ value: string; label: string }>;
  reasoningEffortOptions?: Array<{ value: string; label: string }>;

  // Template System
  enableTemplates?: boolean;
  templates?: PromptTemplate[];
  onTemplateSelect?: (template: PromptTemplate) => void;
}

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category?: string;
}

// Default model options (latest OpenAI models per https://developers.openai.com/api/docs/changelog/)
export const DEFAULT_MODEL_OPTIONS = [
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
  { value: "o3-deep-research", label: "O3 Deep Research" },
  { value: "o4-mini-deep-research", label: "O4 Mini Deep Research" },
];

// Default reasoning effort options
export const DEFAULT_REASONING_EFFORT_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// Default instructions template
const DEFAULT_INSTRUCTIONS =
  "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses.";

export interface AgentConfigFormRef {
  getCurrentData: () => AgentConfigData;
}

export const AgentConfigForm = forwardRef<
  AgentConfigFormRef,
  AgentConfigFormProps
>(
  (
    {
      initialData,
      showNameField = true,
      showDescriptionField = true,
      showInstructionsPreview = false,
      isReadOnly = false,
      variant = "full",
      instructionsMinHeight = "200px",
      validateName = true,
      nameError: externalNameError,
      onNameValidation,
      modelOptions = DEFAULT_MODEL_OPTIONS,
      reasoningEffortOptions = DEFAULT_REASONING_EFFORT_OPTIONS,
      enableTemplates = false,
      templates = [],
      onTemplateSelect,
    },
    ref,
  ) => {
    // Form state
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(
      initialData?.description || "",
    );
    const [instructions, setInstructions] = useState(
      initialData?.instructions || DEFAULT_INSTRUCTIONS,
    );
    const [model, setModel] = useState(initialData?.model || "gpt-5.2");
    const [reasoningEffort, setReasoningEffort] = useState(
      initialData?.reasoning_effort || "medium",
    );

    // UI state
    const [previewMode, setPreviewMode] = useState(true);
    const [internalNameError, setInternalNameError] = useState("");

    const nameError = externalNameError || internalNameError;

    // Validation
    const validateAgentName = useCallback(
      (name: string): boolean => {
        if (!validateName) return true;

        const slugPattern = /^[a-z0-9-_]+$/;
        if (!name) {
          const error = "Agent name is required";
          setInternalNameError(error);
          onNameValidation?.(false, error);
          return false;
        }
        if (!slugPattern.test(name)) {
          const error =
            "Agent name must be in slug format (lowercase letters, numbers, hyphens, underscores only)";
          setInternalNameError(error);
          onNameValidation?.(false, error);
          return false;
        }
        setInternalNameError("");
        onNameValidation?.(true, "");
        return true;
      },
      [validateName, onNameValidation],
    );

    // Update form when initial data changes
    useEffect(() => {
      if (initialData) {
        if (initialData.name !== undefined) setName(initialData.name);
        if (initialData.description !== undefined)
          setDescription(initialData.description);
        if (initialData.instructions !== undefined)
          setInstructions(initialData.instructions);
        if (initialData.model !== undefined) setModel(initialData.model);
        if (initialData.reasoning_effort !== undefined)
          setReasoningEffort(initialData.reasoning_effort);
      }
    }, [initialData]);

    // Expose getCurrentData function via ref
    useImperativeHandle(
      ref,
      () => ({
        getCurrentData: () => ({
          ...(showNameField && { name }),
          ...(showDescriptionField && { description }),
          instructions,
          model,
          reasoning_effort: reasoningEffort,
        }),
      }),
      [
        name,
        description,
        instructions,
        model,
        reasoningEffort,
        showNameField,
        showDescriptionField,
      ],
    );

    // Template handling
    const handleTemplateSelect = (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        const newInstructions = instructions
          ? instructions + "\n\n" + template.content
          : template.content;
        setInstructions(newInstructions);
        onTemplateSelect?.(template);
      }
    };

    return (
      <div className="space-y-4">
        {/* Name Field */}
        {showNameField && (
          <ConfigField variant={variant} title="Agent Name">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  validateAgentName(v);
                }}
                placeholder="e.g., github-pr-agent, zendesk-support"
                className={nameError ? "border-red-500" : ""}
                disabled={isReadOnly}
              />
              {nameError && <p className="text-sm text-red-500">{nameError}</p>}
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>
          </ConfigField>
        )}

        {/* Description Field */}
        {showDescriptionField && (
          <ConfigField variant={variant} title="Description">
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Input
                id="agent-description"
                value={description}
                onChange={(e) => {
                  const v = e.target.value;
                  setDescription(v);
                }}
                placeholder="Brief description of what this agent does..."
                disabled={isReadOnly}
              />
            </div>
          </ConfigField>
        )}

        {/* Model Configuration */}
        <ConfigField variant={variant} title="Model Configuration">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-model" className="text-xs">
                Model
              </Label>
              <Select
                value={model}
                onValueChange={(v) => {
                  setModel(v);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-reasoning-effort" className="text-xs">
                Reasoning Effort
              </Label>
              <Select
                value={reasoningEffort}
                onValueChange={(v) => {
                  setReasoningEffort(v);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reasoning effort" />
                </SelectTrigger>
                <SelectContent>
                  {reasoningEffortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigField>

        {/* Instructions */}
        <ConfigField variant={variant} title="Instructions">
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

            <div
              style={{
                display:
                  !showInstructionsPreview || !previewMode ? "block" : "none",
              }}
            >
              <div className="space-y-2">
                <Textarea
                  id="agent-instructions"
                  value={instructions}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInstructions(v);
                  }}
                  placeholder="Enter detailed instructions for how this agent should behave..."
                  className={`font-mono text-sm resize-none`}
                  style={{ minHeight: instructionsMinHeight }}
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">
                  Define how the agent should respond. Use{" "}
                  <code className="bg-muted px-1 rounded">@tool_name</code> to
                  reference tools.
                </p>
              </div>
            </div>

            <div
              style={{
                display:
                  !showInstructionsPreview || !previewMode ? "none" : "block",
              }}
            >
              <div className="space-y-2">
                <InstructionsPreview instructions={instructions} />
                <p className="text-xs text-muted-foreground">
                  Preview of how the instructions will appear with tool
                  references highlighted.
                </p>
              </div>
            </div>

            {/* Template Insertion */}
            {enableTemplates && !isReadOnly && templates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Insert from template</Label>
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="h-8 w-[240px]">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
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
        </ConfigField>
      </div>
    );
  },
);

AgentConfigForm.displayName = "AgentConfigForm";

// Helper component for field layout
interface ConfigFieldProps {
  children: React.ReactNode;
  title?: string;
  variant: "full" | "compact";
  className?: string;
}

function ConfigField({
  children,
  title,
  variant,
  className,
}: ConfigFieldProps) {
  if (variant === "compact") {
    return <div className={cn("space-y-2", className)}>{children}</div>;
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Helper component for formatting instructions with tool references
function InstructionsPreview({ instructions }: { instructions: string }) {
  const formatInstructionsWithToolRefs = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const formattedInstructions = formatInstructionsWithToolRefs(instructions);
  return (
    <div className="whitespace-pre-wrap font-mono text-sm p-3 bg-muted rounded-md border min-h-[200px]">
      {formattedInstructions}
    </div>
  );
}

// Hook for managing agent configuration
export function useAgentConfig(initialData?: Partial<AgentConfigData>) {
  const [config, setConfig] = useState<AgentConfigData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    instructions: initialData?.instructions || DEFAULT_INSTRUCTIONS,
    model: initialData?.model || "gpt-5.2",
    reasoning_effort: initialData?.reasoning_effort || "medium",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);

  const updateConfig = (updates: Partial<AgentConfigData>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const validateConfig = () => {
    const newErrors: Record<string, string> = {};

    if (!config.instructions?.trim()) {
      newErrors.instructions = "Instructions are required";
    }

    if (!config.model) {
      newErrors.model = "Model selection is required";
    }

    if (!config.reasoning_effort) {
      newErrors.reasoning_effort = "Reasoning effort is required";
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);
    return valid;
  };

  const reset = () => {
    setConfig({
      name: "",
      description: "",
      instructions: DEFAULT_INSTRUCTIONS,
      model: "gpt-5.2",
      reasoning_effort: "medium",
    });
    setErrors({});
    setIsValid(true);
  };

  return {
    config,
    setConfig,
    updateConfig,
    errors,
    isValid,
    validateConfig,
    reset,
  };
}
