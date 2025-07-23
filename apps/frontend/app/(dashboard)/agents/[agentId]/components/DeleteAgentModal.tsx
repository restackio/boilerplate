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
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: any;
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Agent
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{agent?.name}</strong>? This action cannot be undone.
            {agent?.version_count && agent.version_count > 1 && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">⚠️ Version Warning</p>
                <p className="text-xs text-muted-foreground">
                  This agent has {agent.version_count} versions. Deleting this agent will remove all versions.
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
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 