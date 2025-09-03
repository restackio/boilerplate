"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Copy } from "lucide-react";

interface Agent {
  id?: string;
  name?: string;
}

interface WebhookTabProps {
  agent: Agent | null;
  workspaceId: string;
}

export function WebhookTab({ agent, workspaceId }: WebhookTabProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const agentName = agent?.name || 'agent-name';
  const webhookUrl = `http://localhost:8000/webhook/workspace/${workspaceId}/agent/${agentName}`;

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Source: test" \\
  -d '{
    "title": "Test Event",
    "description": "Testing webhook integration",
    "event_type": "test",
    "timestamp": "${new Date().toISOString()}"
  }'`;

  const copyToClipboard = async (text: string, setCopied: (value: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Agent Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              readOnly
              className="font-mono text-sm bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
            >
              {copiedUrl ? "Copied!" : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this URL in your external service (GitHub, Zendesk, Slack, etc.) to send webhooks to this agent.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="curl-example">Test cURL</Label>
          <div className="flex gap-2">
            <Textarea
              id="curl-example"
              value={curlExample}
              readOnly
              className="font-mono text-xs resize-none bg-white"
              rows={8}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(curlExample, setCopiedCurl)}
            >
              {copiedCurl ? "Copied!" : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy and run this command in your terminal to test the webhook locally.
          </p>
        </div>

    </div>
  );
}
