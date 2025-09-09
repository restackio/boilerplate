"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";

interface ArchiveAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: { id: string; name: string; version_count?: number; status?: string } | null;
  isArchiving: boolean;
}

export function ArchiveAgentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  agent, 
  isArchiving 
}: ArchiveAgentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Archive agent
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to archive <strong>{agent?.name}</strong>? 
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Archived agents are hidden from the main list but can be restored later. No data is permanently lost.
              </p>
            </div>
            {agent?.version_count && agent.version_count > 1 && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">
                  This will archive the current version. Other versions of this agent will remain unchanged.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isArchiving}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={onConfirm}
            disabled={isArchiving}
          >
            {isArchiving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Archiving...
              </>
            ) : (
              <>
                Archive
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Separate Delete Modal for permanent deletion
interface DeleteAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: { id: string; name: string; version_count?: number; status?: string } | null;
  isDeleting: boolean;
}

export function DeleteAgentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  agent, 
  isDeleting 
}: DeleteAgentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Delete agent
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>{agent?.name}</strong>?
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                The agent and all its data will be permanently removed from the system.
              </p>
            </div>
            {agent?.version_count && agent.version_count > 1 && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Version warning</p>
                <p className="text-xs text-muted-foreground">
                  This agent has {agent.version_count} versions. Deleting will remove all versions permanently.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 