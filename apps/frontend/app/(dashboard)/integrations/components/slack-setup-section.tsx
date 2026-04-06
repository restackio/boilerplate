"use client";

import { useCallback, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/ui/collapsible";
import {
  ChevronRight,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Shield,
} from "lucide-react";
import manifest from "../../../../../slack-bot/manifest.json";

const MANIFEST_JSON = JSON.stringify(manifest, null, 2);

const ENV_TEMPLATE = `SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
SLACK_DEFAULT_CHANNEL_ID=C...`;

const SCOPES: { scope: string; reason: string }[] = [
  { scope: "app_mentions:read", reason: "Detect when users @mention the bot" },
  {
    scope: "channels:history, channels:read",
    reason: "Read thread replies in channels",
  },
  {
    scope: "chat:write, chat:write.public",
    reason: "Post agent responses and task notifications",
  },
  {
    scope: "im:history, im:read, im:write",
    reason: "Direct message support",
  },
  {
    scope: "reactions:read, reactions:write",
    reason: "Status indicators on messages",
  },
  {
    scope: "users:read",
    reason: "Resolve user names for task attribution",
  },
  { scope: "commands", reason: "/restack-list slash command" },
];

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <Check className="h-3.5 w-3.5 mr-1" />
      ) : (
        <Copy className="h-3.5 w-3.5 mr-1" />
      )}
      {label ?? (copied ? "Copied" : "Copy")}
    </Button>
  );
}

function StepHeader({
  number,
  title,
  open,
}: {
  number: number;
  title: string;
  open: boolean;
}) {
  return (
    <CollapsibleTrigger className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50 rounded-md px-2 -mx-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {number}
      </span>
      <span className="font-medium text-sm">{title}</span>
      <ChevronRight
        className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
      />
    </CollapsibleTrigger>
  );
}

export function SlackSetupSection() {
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});
  const [scopesOpen, setScopesOpen] = useState(false);

  const toggleStep = (step: number) =>
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Slack Integration
        </CardTitle>
        <CardDescription>
          Connect Slack so every task gets a thread in your channel. Agents
          stream responses there and users can reply from either Slack or the
          dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-1">
        {/* Step 1 */}
        <Collapsible
          open={openSteps[1]}
          onOpenChange={() => toggleStep(1)}
        >
          <StepHeader number={1} title="Create the Slack app" open={!!openSteps[1]} />
          <CollapsibleContent className="pl-11 pb-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Go to Slack, select &quot;From an app manifest&quot;, pick your
              workspace, paste this JSON, and click Create.
            </p>
            <div className="relative">
              <div className="absolute right-2 top-2 z-10">
                <CopyButton text={MANIFEST_JSON} label="Copy manifest" />
              </div>
              <pre className="overflow-auto rounded-md bg-muted p-4 pr-36 text-xs max-h-64">
                {MANIFEST_JSON}
              </pre>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://api.slack.com/apps?new_app=1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open Slack App Settings
              </a>
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Step 2 */}
        <Collapsible
          open={openSteps[2]}
          onOpenChange={() => toggleStep(2)}
        >
          <StepHeader number={2} title="Copy tokens" open={!!openSteps[2]} />
          <CollapsibleContent className="pl-11 pb-3 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-medium">
                  Bot Token{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    xoxb-...
                  </code>
                </p>
                <p className="text-muted-foreground text-xs">
                  Install App &rarr; Bot User OAuth Token
                </p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-medium">
                  App-Level Token{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    xapp-...
                  </code>
                </p>
                <p className="text-muted-foreground text-xs">
                  Basic Information &rarr; App-Level Tokens &rarr; generate with{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    connections:write
                  </code>{" "}
                  scope
                </p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-medium">Signing Secret</p>
                <p className="text-muted-foreground text-xs">
                  Basic Information &rarr; App Credentials
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Step 3 */}
        <Collapsible
          open={openSteps[3]}
          onOpenChange={() => toggleStep(3)}
        >
          <StepHeader
            number={3}
            title="Configure environment"
            open={!!openSteps[3]}
          />
          <CollapsibleContent className="pl-11 pb-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Add these variables to your environment (or{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                .env
              </code>{" "}
              for local development). On the Restack platform, set them in your
              application&apos;s environment settings.
            </p>
            <div className="relative">
              <div className="absolute right-2 top-2 z-10">
                <CopyButton text={ENV_TEMPLATE} />
              </div>
              <pre className="overflow-auto rounded-md bg-muted p-4 pr-28 text-xs">
                {ENV_TEMPLATE}
              </pre>
            </div>
            <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">
                  SLACK_DEFAULT_CHANNEL_ID
                </strong>{" "}
                enables automatic task-to-thread mirroring. Every task created
                from the dashboard gets a Slack thread.
              </p>
              <p>
                Invite the bot first:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  /invite @Restack
                </code>{" "}
                in the channel. Then right-click the channel name &rarr; View
                channel details &rarr; copy the Channel ID at the bottom.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Permissions reference */}
        <Collapsible open={scopesOpen} onOpenChange={setScopesOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50 rounded-md px-2 -mx-2">
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Permissions reference
            </span>
            <ChevronRight
              className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${scopesOpen ? "rotate-90" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-9 pb-3">
            <div className="rounded-md border text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Scope</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Why it&apos;s needed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCOPES.map(({ scope, reason }) => (
                    <tr key={scope} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {scope}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
