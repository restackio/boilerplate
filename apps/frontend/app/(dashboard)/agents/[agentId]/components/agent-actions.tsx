"use client";

import { useState } from "react";
import { ActionButtonGroup, commonActions, type ActionButton } from "@workspace/ui/components/action-button-group";
import { AgentStatusBadge, type AgentStatus } from "@workspace/ui/components/agent-status-badge";
import { Play } from "lucide-react";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { DeleteAgentDialog, ArchiveAgentDialog, TestAgentDialog } from "./";

interface AgentActionsProps {
  agent: Agent;
  onSave: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  isDeleting: boolean;
  isArchiving: boolean;
}

export function AgentActions({
  agent,
  onSave,
  onPublish,
  onDelete,
  onArchive,
  isSaving,
  isPublishing,
  isDeleting,
  isArchiving,
}: AgentActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);

  const handleDeleteAgent = async () => {
    await onDelete();
    setShowDeleteDialog(false);
  };

  const handleArchiveAgent = async () => {
    await onArchive();
    setShowArchiveDialog(false);
  };

  // Define actions - they appear in order: status / archive / delete / save / test / publish
  const actions: ActionButton[] = [
    commonActions.archive(() => setShowArchiveDialog(true), isArchiving),
    commonActions.delete(() => setShowDeleteDialog(true), isDeleting),
    {
      key: "save",
      label: agent?.status === "published" ? "New version" : "Save",
      variant: agent.status === "published" ? "default" : "outline",
      loading: isSaving,
      loadingLabel: agent?.status === "published" ? "Creating version..." : "Saving...",
      onClick: onSave,
    },
    {
      key: "test",
      label: "Test",
      variant: "outline",
      onClick: () => setShowTestDialog(true),
    },
    {
      key: "publish",
      label: "Publish",
      icon: Play,
      variant: "default",
      loading: isPublishing,
      loadingLabel: "Publishing...",
      onClick: onPublish,
      show: agent.status === "draft",
    },
  ];

  return (
    <>
      <ActionButtonGroup
        actions={actions}
        statusBadge={<AgentStatusBadge status={agent.status as AgentStatus} size="sm" />}
      />

      {/* Dialogs */}
      <DeleteAgentDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAgent}
        agent={agent}
        isDeleting={isDeleting}
      />

      <ArchiveAgentDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveAgent}
        agent={agent}
        isArchiving={isArchiving}
      />

      <TestAgentDialog
        isOpen={showTestDialog}
        onClose={() => setShowTestDialog(false)}
        agent={agent}
      />
    </>
  );
}
