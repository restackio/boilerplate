"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import { CollapsiblePanel } from "@workspace/ui/components/collapsible-panel";
import { AgentConfigForm, type AgentConfigFormRef } from "@workspace/ui/components/agent-config-form";
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
  const formRef = useRef<AgentConfigFormRef>(null);

  // Static initial data - form will manage its own state
  const initialData = useMemo(() => ({
    instructions: agent.instructions || "",
    model: agent.model || "gpt-5",
    reasoning_effort: agent.reasoning_effort || "medium",
  }), [agent.instructions, agent.model, agent.reasoning_effort]);

  // Function to sync form data back to agent when needed
  const syncFormToAgent = useCallback(() => {
    const formData = formRef.current?.getCurrentData();
    if (formData) {
      onAgentChange({
        instructions: formData.instructions,
        model: formData.model,
        reasoning_effort: formData.reasoning_effort,
      });
    }
  }, [onAgentChange]);

  // Sync on blur or when switching tabs (optional - for better UX)
  useEffect(() => {
    const handleBlur = () => syncFormToAgent();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [syncFormToAgent]);

  // Define tabs for the collapsible panel
  const tabs = [
    {
      id: "instructions",
      label: "Instructions",
      icon: FileText,
      content: (
        <div onBlur={syncFormToAgent}>
          <AgentConfigForm
            ref={formRef}
            initialData={initialData}
            showNameField={false}
            showDescriptionField={false}
            showInstructionsPreview={false}
            variant="compact"
            instructionsMinHeight="200px"
          />
        </div>
      ),
    },
    {
      id: "model",
      label: "Model",
      icon: Brain,
      content: (
        <div onBlur={syncFormToAgent}>
          <AgentConfigForm
            ref={formRef}
            initialData={initialData}
            showNameField={false}
            showDescriptionField={false}
            showInstructionsPreview={false}
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
