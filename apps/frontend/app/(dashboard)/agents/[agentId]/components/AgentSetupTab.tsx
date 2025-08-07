"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Settings } from "lucide-react";
import { McpServerSelector } from "./McpServerSelector";

interface Agent {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  instructions?: string;
}

interface AgentData {
  name: string;
  version: string;
  description: string;
  instructions: string;
}

interface AgentSetupTabProps {
  agent: Agent | null;
  onSave: (agentData: AgentData) => Promise<void>;
  isSaving: boolean;
  workspaceId: string;
}

// Function to format instructions with MCP tool references
const formatInstructionsWithMCPs = (text: string) => {
  const parts = text.split(/(@\w+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={index}
          className="font-bold text-black bg-gray-100 px-1 rounded"
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

export function AgentSetupTab({ agent, onSave, isSaving, workspaceId }: AgentSetupTabProps) {
  // onSave and isSaving are provided by parent but not used in this component yet
  void onSave; // Suppress unused warning
  void isSaving; // Suppress unused warning
  // State for editing
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses."
  );
  const [previewMode, setPreviewMode] = useState(true);

  // Update form fields when agent data loads
  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setVersion(agent.version || "");
      setDescription(agent.description || "");
      setInstructions(agent.instructions || "");
    }
  }, [agent]);





  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Agent Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter agent name..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., v1.0, v2.1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this agent does..."
          />
        </div>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="instructions">
                System Instructions
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
                  onChange={(e) =>
                    setInstructions(e.target.value)
                  }
                  placeholder="Enter detailed instructions for how this agent should behave..."
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Define how the agent should respond. Use{" "}
                  <code className="bg-muted px-1 rounded">
                    @tool_name
                  </code>{" "}
                  to reference MCP tools.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <InstructionsPreview
                  instructions={instructions}
                />
                <p className="text-xs text-muted-foreground">
                  Preview of how the instructions will appear with
                  MCP tool references highlighted.
                </p>
              </div>
            )}
          </div>

          {/* MCP Server Selector */}
          <McpServerSelector
            agentId={agent?.id || ""}
            workspaceId={workspaceId}
            onMcpServersChange={(mcpServers) => {
              // Handle MCP servers change if needed
              console.log("MCP servers changed:", mcpServers);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
} 