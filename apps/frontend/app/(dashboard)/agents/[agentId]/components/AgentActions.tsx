"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { AgentStatusBadge, type AgentStatus } from "@workspace/ui/components/agent-status-badge";
import {
  Play,
  Trash2,
  Archive,
} from "lucide-react";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { DeleteAgentModal, ArchiveAgentModal, TestAgentModal } from "./";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  const handleDeleteAgent = async () => {
    await onDelete();
    setShowDeleteModal(false);
  };

  const handleArchiveAgent = async () => {
    await onArchive();
    setShowArchiveModal(false);
  };

  return (
    <>
      <AgentStatusBadge status={agent.status as AgentStatus} size="sm" />
      
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowArchiveModal(true)}
      >
        <Archive className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowDeleteModal(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setShowTestModal(true)}
      >
        Test
      </Button>
      
      <Button 
        variant={agent.status === "published" ? "default" : "outline"}
        size="sm"
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {agent?.status === "published" ? "Creating version..." : "Saving..."}
          </>
        ) : (
          agent?.status === "published" ? "New version" : "Save"
        )}
      </Button>

      {agent.status === "draft" && (
        <Button 
          variant="default" 
          size="sm"
          onClick={onPublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Publishing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Publish
            </>
          )}
        </Button>
      )}

      {/* Modals */}
      <DeleteAgentModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAgent}
        agent={agent}
        isDeleting={isDeleting}
      />

      <ArchiveAgentModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchiveAgent}
        agent={agent}
        isArchiving={isArchiving}
      />

      <TestAgentModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        agent={agent}
      />
    </>
  );
}
