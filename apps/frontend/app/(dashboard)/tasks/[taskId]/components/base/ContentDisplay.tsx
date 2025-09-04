"use client";

import { ReactNode } from "react";
import { getStatusIconClass } from "../../utils/conversation-utils";
import { Button } from "@workspace/ui/components/ui/button";
import { XCircle, Check, Loader2 } from "lucide-react";

interface ContentSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ContentSection({ label, children, className = "" }: ContentSectionProps) {
  return (
    <div className={`mt-2 ${className}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}:</p>
      {children}
    </div>
  );
}

interface CodeBlockProps {
  content: string | object;
  maxHeight?: string;
  language?: "json" | "text";
}

export function CodeBlock({ content, maxHeight = "max-h-40", language = "json" }: CodeBlockProps) {
  const displayContent = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);

  return (
    <pre className={`text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded border overflow-x-auto ${maxHeight}`}>
      {displayContent}
    </pre>
  );
}

interface ToolListProps {
  tools: Array<{ name: string; description?: string; [key: string]: any }>;
  maxVisible?: number;
}

export function ToolList({ tools, maxVisible = 3 }: ToolListProps) {
  const visibleTools = tools.slice(0, maxVisible);
  const remainingCount = tools.length - maxVisible;

  return (
    <div className="space-y-1">
      {visibleTools.map((tool, index) => (
        <div key={index} className="text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded border">
          <strong>{tool.name}</strong>{tool.description ? `: ${tool.description}` : ''}
        </div>
      ))}
      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground">... and {remainingCount} more</p>
      )}
    </div>
  );
}

interface ApprovalActionsProps {
  onApprove: () => void;
  onDeny: () => void;
  isProcessing: boolean;
}

export function ApprovalActions({ onApprove, onDeny, isProcessing }: ApprovalActionsProps) {
  const handleDeny = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeny();
  };

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove();
  };

  return (
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
  );
}

interface StatusDisplayProps {
  status: string;
  isCompleted: boolean;
  isFailed: boolean;
}

export function StatusDisplay({ status: _status, isCompleted, isFailed }: StatusDisplayProps) {
  if (isCompleted) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-xs px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/20"
      >
        <Check className="h-3 w-3 mr-1" />
        Approved
      </Button>
    );
  }

  if (isFailed) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-xs px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Denied
      </Button>
    );
  }

  return null;
}

interface StatusIconProps {
  status: string;
}

export function StatusIcon({ status }: StatusIconProps) {
  const iconClass = getStatusIconClass(status);
  return <div className={iconClass} />;
}
