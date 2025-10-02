"use client";

import { QuickActionDialog, commonFields, type QuickActionButton } from "@workspace/ui/components/quick-action-dialog";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { Agent } from "@/hooks/use-workspace-scoped-actions";

interface TestAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
}

export function TestAgentDialog({ isOpen, onClose, agent }: TestAgentDialogProps) {
  const { createTask } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();
  const router = useRouter();

  const handleCreateTask = async (formData: Record<string, string>) => {
    const taskDescription = formData.description;
    
    const taskData = {
      title: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : ""),
      description: taskDescription,
      status: "in_progress" as const,
      agent_id: agent.id,
      assigned_to_id: currentUser?.id || "",
    };

    const result = await createTask(taskData);

    if (result.success && result.data) {
      // Navigate to the new task
      router.push(`/tasks/${result.data.id}`);
    } else {
      throw new Error(result.error || "Failed to create test task");
    }
  };

  const handleGoToPlayground = () => {
    onClose();
    router.push(`/playground?agentId=${agent.id}`);
  };

  // Define form fields
  const fields = [
    {
      ...commonFields.description(true),
      placeholder: "Describe what you want to test with this agent...",
      rows: 8,
    }
  ];

  // Define actions
  const actions: QuickActionButton[] = [
    {
      key: "playground",
      label: "Compare in Playground",
      variant: "outline" as const,
      onClick: handleGoToPlayground,
    },
    {
      key: "create",
      label: "Create test task",
      icon: ArrowUp,
      variant: "default" as const,
      isPrimary: true,
      requiresValidation: true,
      onClick: handleCreateTask,
    },
  ];

  return (
    <QuickActionDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Test Agent"
      description={`Create a test task for ${agent.name}`}
      fields={fields}
      actions={actions}
      closeOnSuccess={true}
      size="md"
    />
  );
}
