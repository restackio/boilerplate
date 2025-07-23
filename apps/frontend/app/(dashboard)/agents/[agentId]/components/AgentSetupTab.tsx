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
import { Badge } from "@workspace/ui/components/ui/badge";
import {
  Settings,
  Filter,
  Globe,
  Lock,
  CheckCircle,
} from "lucide-react";
import { availableMCPs } from "@/lib/demo-data/mcps";

interface AgentSetupTabProps {
  agent: any;
  onSave: (agentData: any) => Promise<void>;
  isSaving: boolean;
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

export function AgentSetupTab({ agent, onSave, isSaving }: AgentSetupTabProps) {
  // State for editing
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "You are a helpful support agent. Your role is to assist users with their technical questions and issues. Always be polite, professional, and thorough in your responses."
  );
  const [previewMode, setPreviewMode] = useState(true);

  // MCP navigation state
  const [mcpView, setMcpView] = useState<"all" | "public" | "private">("all");

  // Update form fields when agent data loads
  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setVersion(agent.version || "");
      setDescription(agent.description || "");
      setInstructions(agent.instructions || "");
    }
  }, [agent]);

  // Get all MCP mentions from instructions
  const getMentionsFromInstructions = (text: string): string[] => {
    const mentions = text.match(/@\w+/g) || [];
    return mentions;
  };

  // Get active MCPs based on mentions in instructions
  const getActiveMCPs = () => {
    const mentions = getMentionsFromInstructions(instructions);
    const activeMCPs = new Set<string>();

    availableMCPs.forEach((mcp) => {
      const hasActiveMention = mcp.mentions.some((mention) =>
        mentions.includes(mention)
      );
      if (hasActiveMention) {
        activeMCPs.add(mcp.id);
      }
    });

    return activeMCPs;
  };

  const activeMCPs = getActiveMCPs();

  // Filter MCPs based on current view
  const getFilteredMCPs = () => {
    switch (mcpView) {
      case "public":
        return availableMCPs.filter((mcp) => mcp.visibility === "public");
      case "private":
        return availableMCPs.filter((mcp) => mcp.visibility === "private");
      default:
        return availableMCPs;
    }
  };

  // Get MCP counts
  const mcpCounts = {
    all: availableMCPs.length,
    public: availableMCPs.filter((mcp) => mcp.visibility === "public").length,
    private: availableMCPs.filter((mcp) => mcp.visibility === "private").length,
  };

  const filteredMCPs = getFilteredMCPs();

  const handleSave = async () => {
    const agentData = {
      name,
      version,
      description,
      instructions,
    };
    await onSave(agentData);
  };

  const handleMCPClick = (mcp: (typeof availableMCPs)[0]) => {
    // Add the first mention of the MCP to instructions if not already present
    const currentMentions = getMentionsFromInstructions(instructions);
    const mcpMention = mcp.mentions[0];

    if (mcpMention && !currentMentions.includes(mcpMention)) {
      // Add mention at the end of instructions
      const capabilityText =
        mcp.capabilities[0]?.replace("_", " ") || "functionality";
      const newInstructions =
        instructions +
        (instructions.endsWith("\n") ? "" : "\n") +
        `Use ${mcpMention} for ${capabilityText}.`;
      setInstructions(newInstructions);
    }
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instructions */}
          <div className="lg:col-span-2 space-y-4">
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

          {/* MCPs */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">
                Available Tools
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Click tools to add mentions to instructions
              </p>
            </div>

            {/* MCP Navigation */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={mcpView === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMcpView("all")}
                className="flex-1 text-xs h-7"
              >
                <Filter className="h-3 w-3 mr-1" />
                All ({mcpCounts.all})
              </Button>
              <Button
                variant={
                  mcpView === "public" ? "default" : "ghost"
                }
                size="sm"
                onClick={() => setMcpView("public")}
                className="flex-1 text-xs h-7"
              >
                <Globe className="h-3 w-3 mr-1" />
                Public ({mcpCounts.public})
              </Button>
              <Button
                variant={
                  mcpView === "private" ? "default" : "ghost"
                }
                size="sm"
                onClick={() => setMcpView("private")}
                className="flex-1 text-xs h-7"
              >
                <Lock className="h-3 w-3 mr-1" />
                Private ({mcpCounts.private})
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredMCPs.map((mcp) => {
                const isActive = activeMCPs.has(mcp.id);
                const IconComponent = mcp.icon;

                return (
                  <div
                    key={mcp.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all text-sm ${
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleMCPClick(mcp)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`p-1.5 rounded-md ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <IconComponent className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <h5 className="font-medium text-sm">
                              {mcp.name}
                            </h5>
                            {isActive && (
                              <CheckCircle className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="secondary"
                              className="text-xs py-0 px-1"
                            >
                              {mcp.version}
                            </Badge>
                            {mcp.visibility === "private" ? (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Globe className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mcp.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {mcp.capabilities
                            .slice(0, 2)
                            .map((capability) => (
                              <Badge
                                key={capability}
                                variant="outline"
                                className="text-xs py-0 px-1"
                              >
                                {capability.replace("_", " ")}
                              </Badge>
                            ))}
                          {mcp.capabilities.length > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs py-0 px-1"
                            >
                              +{mcp.capabilities.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeMCPs.size > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h5 className="font-medium text-sm mb-2">
                  Active Tools ({activeMCPs.size})
                </h5>
                <div className="flex flex-wrap gap-1">
                  {Array.from(activeMCPs).map((mcpId) => {
                    const mcp = availableMCPs.find(
                      (m) => m.id === mcpId
                    );
                    if (!mcp) return null;
                    const IconComponent = mcp.icon;

                    return (
                      <div
                        key={mcpId}
                        className="flex items-center gap-1 bg-background border rounded-md px-2 py-1"
                      >
                        <IconComponent className="h-3 w-3" />
                        <span className="text-xs">
                          {mcp.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 