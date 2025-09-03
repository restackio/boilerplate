"use client";

import { useState, useEffect } from "react";
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
import { AgentToolsManager } from "./AgentToolsManager";
import { PROMPT_TEMPLATES } from "./promptTemplates";

interface Agent {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  instructions?: string;
  // New GPT-5 model configuration fields
  model?: string;
  reasoning_effort?: string;

}

interface AgentData {
  name: string;
  version: string;
  description: string;
  instructions: string;
  // New GPT-5 model configuration fields
  model: string;
  reasoning_effort: string;

}

interface AgentSetupTabProps {
  agent: Agent | null;
  onSave: (agentData: AgentData) => Promise<void>;
  isSaving: boolean;
  workspaceId: string;
  onChange?: (agentData: AgentData) => void;
}

// Function to format instructions with MCP tool references
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

// Component to display formatted instructions
const InstructionsPreview = ({ instructions }: { instructions: string }) => {
  const formattedInstructions = formatInstructionsWithMCPs(instructions);

  return (
    <div className="whitespace-pre-wrap font-mono text-sm p-3 bg-muted rounded-md border min-h-[200px]">
      {formattedInstructions}
    </div>
  );
};

export function AgentSetupTab({ agent, onSave, isSaving, workspaceId, onChange }: AgentSetupTabProps) {
  // State for editing
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses."
  );
  // New GPT-5 model configuration state
  const [model, setModel] = useState("gpt-5");
  const [reasoningEffort, setReasoningEffort] = useState("medium");

  const [previewMode, setPreviewMode] = useState(true);
  const [nameError, setNameError] = useState("");

  const emitChange = (overrides: Partial<AgentData> = {}) => {
    const payload: AgentData = {
      name,
      version,
      description,
      instructions,
      model,
      reasoning_effort: reasoningEffort,

      ...overrides,
    } as AgentData;
    onChange?.(payload);
  };

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

  // Update form fields when agent data loads
  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setVersion(agent.version || "");
      setDescription(agent.description || "");
      setInstructions(agent.instructions || "");
      // New GPT-5 model configuration fields
      setModel(agent.model || "gpt-5");
      setReasoningEffort(agent.reasoning_effort || "medium");

      // Emit initial values upward so Save can use latest edits
      emitChange({
        name: agent.name || "",
        version: agent.version || "",
        description: agent.description || "",
        instructions: agent.instructions || "",
        model: agent.model || "gpt-5",
        reasoning_effort: agent.reasoning_effort || "medium",
      });
    }
  }, [agent]);

  const handleSave = async () => {
    const agentData: AgentData = {
      name,
      version,
      description,
      instructions,
      model,
      reasoning_effort: reasoningEffort,
    };
    // Also notify parent about final state before save
    emitChange(agentData);
    await onSave(agentData);
  };


  return (
<>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { 
                const v = e.target.value; 
                setName(v); 
                validateAgentName(v);
                emitChange({ name: v }); 
              }}
              placeholder="e.g., github-pr-agent, zendesk-support"
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
            <p className="text-xs text-neutral-500">
              Use lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => { const v = e.target.value; setVersion(v); emitChange({ version: v }); }}
              placeholder="e.g., v1.0, v2.1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => { const v = e.target.value; setDescription(v); emitChange({ description: v }); }}
            placeholder="Brief description of what this agent does..."
          />
        </div>

        {/* GPT-5 Model Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={(v) => { setModel(v); emitChange({ model: v }); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5">GPT-5</SelectItem>
                <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                <SelectItem value="gpt-5-2025-08-07">GPT-5 (2025-08-07)</SelectItem>
                <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini (2025-08-07)</SelectItem>
                <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano (2025-08-07)</SelectItem>
                <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reasoning-effort">Reasoning Effort</Label>
            <Select value={reasoningEffort} onValueChange={(v) => { setReasoningEffort(v); emitChange({ reasoning_effort: v }); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select reasoning effort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
        </div>
        <div className="space-y-4">
          <Label htmlFor="tools">
            Tools
          </Label>
          {agent?.id && (
            <AgentToolsManager agentId={agent.id} />
          )}

          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="instructions">
                Instructions
              </Label>
              <div className="ml-auto flex gap-1">
                <Button
                  type="button"
                  variant={!previewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode(false)}
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

            {!previewMode ? (
              <div className="space-y-2">
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => { const v = e.target.value; setInstructions(v); emitChange({ instructions: v }); }}
                  placeholder="Enter detailed instructions for how this agent should behave..."
                  className="min-h-[400px] font-mono text-sm"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Define how the agent should respond. Use{" "}
                    <code className="bg-muted px-1 rounded">@tool_name</code>{" "}
                    to reference MCP tools.
                  </p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Insert template</Label>
                    <Select onValueChange={(id) => {
                      const t = PROMPT_TEMPLATES.find(x => x.id === id);
                      if (t) {
                        setInstructions(prev => (prev ? prev + "\n\n" : "") + t.content);
                      }
                    }}>
                      <SelectTrigger className="h-8 w-[240px]">
                        <SelectValue placeholder="GPT-5 best-practice templates" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMPT_TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <InstructionsPreview
                  instructions={instructions}
                />
                <p className="text-xs text-muted-foreground">
                  Preview of how the instructions will appear with
                  tool references highlighted.
                </p>
              </div>
            )}
          </div>
        </div>
        </>
  );
} 