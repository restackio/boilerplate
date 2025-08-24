"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
import { XCircle, Check, Loader2 } from "lucide-react";
import { ConversationItem } from "../types";

interface TaskCardMcpProps {
  item: ConversationItem;
  onApprove?: (itemId: string) => void;
  onDeny?: (itemId: string) => void;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardMcp({ item, onApprove, onDeny, onClick }: TaskCardMcpProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const output = item.openai_output;
  const status = output.status || "waiting-approval";
  const toolName = output.name || "Unknown tool";
  const serverLabel = output.server_label || "";
  const toolArguments = output.arguments;
  
  const isProcessed = status === "completed" || status === "failed";
  const isWaitingApproval = status === "waiting-approval" || !status;



  const handleApprove = async () => {
    if (!onApprove) return;
    setIsProcessing(true);
    try {
      // Use the openai_output ID or fall back to item.id
      const approvalId = output.id || item.id;

      await onApprove(approvalId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!onDeny) return;
    setIsProcessing(true);
    try {
      // Use the openai_output ID or fall back to item.id
      const approvalId = output.id || item.id;

      await onDeny(approvalId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card 
      className={`w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
        isProcessing ? "opacity-75 pointer-events-none" : ""
      }`}
      onClick={() => onClick?.(item)}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Approval required: {toolName} {serverLabel && `(${serverLabel})`}
          {isProcessing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {toolArguments && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Arguments:</p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-x-auto">
              {JSON.stringify(typeof toolArguments === 'string' ? JSON.parse(toolArguments) : toolArguments, null, 2)}
            </pre>
          </div>
        )}
        {isWaitingApproval ? (
          <div className="flex gap-2 pt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDeny}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              {isProcessing ? "Denying..." : "Deny"}
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              {isProcessing ? "Approving..." : "Approve"}
            </Button>
          </div>
        ) : isProcessed ? (
          <div className="flex items-center justify-start pt-3">
            <div className="text-sm font-medium text-center">
              {status === "completed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approved
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Denied
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="pt-3">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}