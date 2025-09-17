"use client";

import { ConfirmationDialog } from "@workspace/ui/components";

interface ArchiveAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: { id: string; name: string; version_count?: number; status?: string } | null;
  isArchiving: boolean;
}

export function ArchiveAgentDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  agent, 
  isArchiving 
}: ArchiveAgentDialogProps) {
  if (!agent) return null;

  const warnings = [
    {
      description: "Archived agents are hidden from the main list but can be restored later. No data is permanently lost.",
    },
  ];

  if (agent.version_count && agent.version_count > 1) {
    warnings.push({
      description: "This will archive the current version. Other versions of this agent will remain unchanged.",
    });
  }

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Archive agent"
      description={
        <>
          Are you sure you want to archive <strong>{agent.name}</strong>?
        </>
      }
      variant="warning"
      confirmText="Archive"
      loadingText="Archiving..."
      isLoading={isArchiving}
      warnings={warnings}
    />
  );
}

// Separate Delete Dialog for permanent deletion
interface DeleteAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: { id: string; name: string; version_count?: number; status?: string } | null;
  isDeleting: boolean;
}

export function DeleteAgentDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  agent, 
  isDeleting 
}: DeleteAgentDialogProps) {
  if (!agent) return null;

  const warnings: Array<{
    title?: string;
    description: string;
    variant?: "muted" | "warning";
  }> = [
    {
      description: "The agent and all its data will be permanently removed from the system.",
    },
  ];

  if (agent.version_count && agent.version_count > 1) {
    warnings.push({
      title: "Version warning",
      description: `This agent has ${agent.version_count} versions. Deleting will remove all versions permanently.`,
      variant: "warning" as const,
    });
  }

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete agent"
      description={
        <>
          Are you sure you want to permanently delete <strong>{agent.name}</strong>?
        </>
      }
      variant="destructive"
      confirmText="Delete"
      loadingText="Deleting..."
      isLoading={isDeleting}
      warnings={warnings}
    />
  );
} 