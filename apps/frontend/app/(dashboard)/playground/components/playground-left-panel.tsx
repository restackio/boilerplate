"use client";

import { useMemo, useCallback, useRef } from "react";
import { CollapsiblePanel } from "@workspace/ui/components/collapsible-panel";
import { AgentConfigurationForm, type AgentConfigurationFormRef } from "../../agents/[agentId]/components/agent-configuration-form";
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
  const instructionsFormRef = useRef<AgentConfigurationFormRef>(null);
  const modelFormRef = useRef<AgentConfigurationFormRef>(null);

  // Static initial data - form will manage its own state
  const initialData = useMemo(() => ({
    instructions: agent.instructions || "",
    model: agent.model || "gpt-5",
    reasoning_effort: agent.reasoning_effort || "medium",
  }), [agent.instructions, agent.model, agent.reasoning_effort]);

  // Function to sync form data back to agent when needed
  const syncFormToAgent = useCallback((formRef: React.RefObject<AgentConfigurationFormRef>) => {
    const formData = formRef.current?.getCurrentData();
    if (formData) {
      onAgentChange({
        instructions: formData.instructions,
        model: formData.model,
        reasoning_effort: formData.reasoning_effort,
      });
    }
  }, [onAgentChange]);

  // Define tabs for the collapsible panel
  const tabs = [
    {
      id: "instructions",
      label: "Instructions",
      icon: FileText,
      content: (
        <div onBlur={() => syncFormToAgent(instructionsFormRef)}>
          <AgentConfigurationForm
            ref={instructionsFormRef}
            initialData={initialData}
            showNameField={false}
            showDescriptionField={false}
            showModelSection={false}
            showInstructionsSection={true}
            variant="compact"
            instructionsMinHeight="400px"
          />
        </div>
      ),
    },
    {
      id: "model",
      label: "Model",
      icon: Brain,
      content: (
        <div onBlur={() => syncFormToAgent(modelFormRef)}>
          <AgentConfigurationForm
            ref={modelFormRef}
            initialData={initialData}
            showNameField={false}
            showDescriptionField={false}
            showModelSection={true}
            showInstructionsSection={false}
            variant="compact"
          />
        </div>
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
