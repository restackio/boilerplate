"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Cloud, ExternalLink, Server, Container } from "lucide-react";

const RESTACK_CONSOLE_URL = "https://console.restack.io";
const RESTACK_HELM_URL = "https://github.com/restackio/helm";

interface DeployAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}

export function DeployAgentDialog({
  isOpen,
  onClose,
  onPublish,
  isPublishing,
}: DeployAgentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deploy agent</DialogTitle>
          <DialogDescription>
            Choose how you want to deploy and run this agent.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-3">
            <OptionCard
              icon={<Cloud className="h-5 w-5" />}
              title="Deploy on Restack Cloud"
              description="Add your OpenAI key to the workspace and run agents as usual. No infrastructure to manage."
              action={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link href="/integrations" onClick={onClose}>
                    <Button variant="outline" size="sm">
                      Add OpenAI key
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await onPublish();
                      onClose();
                    }}
                    disabled={isPublishing}
                  >
                    {isPublishing ? "Publishing..." : "Publish agent"}
                  </Button>
                </div>
              }
            />
            <OptionCard
              icon={<Server className="h-5 w-5" />}
              title="Deploy on your Cloud"
              description="Use Restack in your own cloud (AWS, GCP, Azure)."
              action={
                <a
                  href={RESTACK_CONSOLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                >
                  <Button variant="outline" size="sm">
                    Open console
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </a>
              }
            />
            <OptionCard
              icon={<Container className="h-5 w-5" />}
              title="Deploy yourself with Helm and Kubernetes"
              description="Self-host with our Helm charts."
              action={
                <a
                  href={RESTACK_HELM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                >
                  <Button variant="outline" size="sm">
                    View Helm charts
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </a>
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
        <div className="pt-2">{action}</div>
      </div>
    </div>
  );
}
