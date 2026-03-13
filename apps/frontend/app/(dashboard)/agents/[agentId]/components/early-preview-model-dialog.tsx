"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { ExternalLink } from "lucide-react";

const CONTACT_URL = "https://www.restack.io/contact";

interface EarlyPreviewModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EarlyPreviewModelDialog({
  isOpen,
  onClose,
}: EarlyPreviewModelDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Early Preview</DialogTitle>
          <DialogDescription>
            Gemini, Anthropic, and custom models are available in Early Preview.
            Contact us for access to use these models with your agents.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            <Button className="w-full sm:w-auto">
              Contact us for access
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
          <p className="text-muted-foreground text-xs">
            Or visit{" "}
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              restack.io/contact
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
