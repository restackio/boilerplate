"use client";

import { useMemo, useCallback } from "react";
import { CollapsiblePanel } from "@workspace/ui/components/collapsible-panel";
import { AgentConfigurationForm, type AgentConfigData } from "../../agents/[agentId]/components/agent-configuration-form";
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
  // Convert agent to form data
  const formData = useMemo<AgentConfigData>(() => ({
    instructions: agent.instructions || "",
    model: agent.model || "gpt-5.2",
    reasoning_effort: agent.reasoning_effort || "medium",
  }), [agent.instructions, agent.model, agent.reasoning_effort]);

  // Handle form changes
  const handleFormChange = useCallback((updates: Partial<AgentConfigData>) => {
    onAgentChange(updates);
  }, [onAgentChange]);

  // Define tabs for the collapsible panel
  const tabs = [
    {
      id: "instructions",
      label: "Instructions",
      icon: FileText,
      content: (
        <AgentConfigurationForm
          data={formData}
          onChange={handleFormChange}
          showNameField={false}
          showDescriptionField={false}
          showModelSection={false}
          showInstructionsSection={true}
          variant="compact"
          instructionsMinHeight="400px"
        />
      ),
    },
    {
      id: "model",
      label: "Model",
      icon: Brain,
      content: (
        <AgentConfigurationForm
          data={formData}
          onChange={handleFormChange}
          showNameField={false}
          showDescriptionField={false}
          showModelSection={true}
          showInstructionsSection={false}
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
      title="Configuration"
      tabs={tabs}
      expandedWidth="w-1/3"
      collapsedWidth="w-12"
      direction="horizontal"
      position="left"
      background="muted"
    />
  );
}
