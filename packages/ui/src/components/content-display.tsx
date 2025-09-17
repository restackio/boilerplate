"use client";

import { ReactNode } from "react";
import { Button } from "./ui/button";
import { XCircle, Check, Loader2 } from "lucide-react";

export interface ContentSectionProps {
  /** Label for the content section */
  label: string;
  /** Content to display */
  children: ReactNode;
  /** Additional CSS classes */
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

export interface CodeBlockProps {
  /** Content to display - string or object */
  content: string | object;
  /** Maximum height of the code block */
  maxHeight?: string;
  /** Programming language for syntax highlighting */
  language?: "json" | "text" | "javascript" | "typescript" | "python";
  /** Additional CSS classes */
  className?: string;
  /** Whether to style as error content */
  isError?: boolean;
  /** Whether content is loading */
  isLoading?: boolean;
}

export function CodeBlock({ 
  content, 
  maxHeight = "max-h-40", 
  className = "",
  isError = false,
  isLoading = false
}: CodeBlockProps) {
  const displayContent = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);

  const baseClasses = "text-xs p-2 rounded border overflow-x-auto font-mono";
  
  const getVariantClasses = () => {
    if (isError) {
      return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
    }
    if (isLoading) {
      return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
    }
    return "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700";
  };
  
  const finalClassName = `${baseClasses} ${getVariantClasses()} ${maxHeight} ${className}`.trim();

  if (isLoading) {
    return (
      <div className={finalClassName}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading content...</span>
        </div>
      </div>
    );
  }

  return (
    <pre className={finalClassName}>
      {displayContent}
    </pre>
  );
}

export interface ToolListProps {
  /** Array of tools to display */
  tools: Array<{ 
    name: string; 
    description?: string; 
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>;
  /** Maximum number of tools to show before truncating */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ToolList({ tools, maxVisible = 3, className = "" }: ToolListProps) {
  const visibleTools = tools.slice(0, maxVisible);
  const remainingCount = tools.length - maxVisible;

  return (
    <div className={`space-y-1 ${className}`}>
      {visibleTools.map((tool, index) => (
        <div key={index} className="text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded border">
          <strong>{tool.name}</strong>
          {tool.description && <span>: {tool.description}</span>}
        </div>
      ))}
      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          ... and {remainingCount} more tool{remainingCount === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

export interface ApprovalActionsProps {
  /** Callback when approved */
  onApprove: () => void;
  /** Callback when denied */
  onDeny: () => void;
  /** Whether approval is being processed */
  isProcessing?: boolean;
  /** Custom approve button text */
  approveText?: string;
  /** Custom deny button text */
  denyText?: string;
  /** Additional CSS classes */
  className?: string;
}

export function ApprovalActions({ 
  onApprove, 
  onDeny, 
  isProcessing = false,
  approveText = "Approve",
  denyText = "Deny",
  className = ""
}: ApprovalActionsProps) {
  const handleDeny = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeny();
  };

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove();
  };

  return (
    <div className={`flex gap-2 pt-3 ${className}`}>
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
        {isProcessing ? "Denying..." : denyText}
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
        {isProcessing ? "Approving..." : approveText}
      </Button>
    </div>
  );
}

export interface StatusDisplayProps {
  /** Current status */
  status: string;
  /** Whether the action completed successfully */
  isCompleted: boolean;
  /** Whether the action failed */
  isFailed: boolean;
  /** Custom completed text */
  completedText?: string;
  /** Custom failed text */
  failedText?: string;
  /** Additional CSS classes */
  className?: string;
}

export function StatusDisplay({ 
  isCompleted, 
  isFailed, 
  completedText = "Approved",
  failedText = "Denied",
  className = ""
}: StatusDisplayProps) {
  if (isCompleted) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`text-xs px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/20 ${className}`}
      >
        <Check className="h-3 w-3 mr-1" />
        {completedText}
      </Button>
    );
  }

  if (isFailed) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`text-xs px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 ${className}`}
      >
        <XCircle className="h-3 w-3 mr-1" />
        {failedText}
      </Button>
    );
  }

  return null;
}

