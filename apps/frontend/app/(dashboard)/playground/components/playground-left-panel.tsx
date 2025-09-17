"use client";

import { CollapsiblePanel } from "@workspace/ui/components/collapsible-panel";
import { AgentConfigForm } from "@workspace/ui/components/agent-config-form";
import { Brain, Wrench, FileText } from "lucide-react";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { PlaygroundToolsDisplay } from "./playground-tools-display";

interface PlaygroundLeftPanelProps {
  agent: Agent;
  onAgentChange: (updates: Partial<Agent>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaceId: string;
}

export function PlaygroundLeftPanel({
  agent,
  onAgentChange,
  isCollapsed,
  onToggleCollapse,
  workspaceId,
}: PlaygroundLeftPanelProps) {
  // Convert agent change handler to AgentConfigForm format
  const handleConfigChange = (config: Partial<Agent>) => {
    onAgentChange(config);
  };

  // Define tabs for the collapsible panel
  const tabs = [
    {
      id: "instructions",
      label: "Instructions",
      icon: FileText,
      content: (
        <AgentConfigForm
          initialData={{
            instructions: agent.instructions || "",
            model: agent.model || "gpt-5",
            reasoning_effort: agent.reasoning_effort || "medium",
          }}
          onChange={handleConfigChange}
          showNameField={false}
          showDescriptionField={false}
          showInstructionsPreview={false}
          variant="compact"
          instructionsMinHeight="200px"
        />
      ),
    },
    {
      id: "model",
      label: "Model",
      icon: Brain,
      content: (
        <AgentConfigForm
          initialData={{
            instructions: agent.instructions || "",
            model: agent.model || "gpt-5",
            reasoning_effort: agent.reasoning_effort || "medium",
          }}
          onChange={handleConfigChange}
          showNameField={false}
          showDescriptionField={false}
          showInstructionsPreview={false}
          variant="compact"
        />
      ),
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,
      content: (
        <PlaygroundToolsDisplay agentId={agent.id} workspaceId={workspaceId} />
      ),
    },
  ];

  return (
    <CollapsiblePanel
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      title="Agent Configuration"
      tabs={tabs}
      activeTab="instructions"
      expandedWidth="w-1/3"
      collapsedWidth="w-12"
      direction="horizontal"
      position="left"
      background="muted"
    />
  );
}
