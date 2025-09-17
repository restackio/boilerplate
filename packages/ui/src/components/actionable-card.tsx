"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface ActionableCardProps {
  /** Card title */
  title: string;
  /** Card subtitle (optional) */
  subtitle?: string;
  /** Card content */
  children?: ReactNode;
  /** Action buttons */
  actions?: ReactNode;
  /** Footer timestamp */
  timestamp?: string;
  /** Status information */
  status?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  };
  /** Loading state */
  isLoading?: boolean;
  /** Processing state (shows spinner, disables interaction) */
  isProcessing?: boolean;
  /** Show chevron icon */
  showChevron?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom className */
  className?: string;
  /** Card variant */
  variant?: "default" | "interactive" | "highlighted";
  /** Custom header icon */
  headerIcon?: ReactNode;
  /** Show card as selected */
  selected?: boolean;
}

const variantStyles = {
  default: "border-border",
  interactive: "border-border hover:bg-muted/50 transition-colors cursor-pointer",
  highlighted: "border-primary/50 bg-primary/5",
};

export function ActionableCard({
  title,
  subtitle,
  children,
  actions,
  timestamp,
  status,
  isLoading = false,
  isProcessing = false,
  showChevron = false,
  onClick,
  className,
  variant = "default",
  headerIcon,
  selected = false,
}: ActionableCardProps) {
  const isInteractive = onClick || variant === "interactive";
  const isDisabled = isProcessing || isLoading;

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className={cn(
        "w-full",
        variantStyles[variant],
        isInteractive && "cursor-pointer",
        isDisabled && "opacity-75 pointer-events-none",
        selected && "ring-2 ring-primary ring-offset-2",
        className
      )}
      onClick={isInteractive ? handleClick : undefined}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {headerIcon}
          <div className="flex-1">
            <div>{title}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground font-normal mt-1">
                {subtitle}
              </div>
            )}
          </div>
          
          {/* Loading/Processing indicators */}
          {(isLoading || isProcessing) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {/* Chevron */}
          {showChevron && !isLoading && !isProcessing && (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      
      {/* Main content */}
      {children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
      
      {/* Actions */}
      {actions && (
        <CardContent className="pt-0">
          {actions}
        </CardContent>
      )}

      {/* Footer */}
      {(timestamp || status) && (
        <CardFooter className="pt-3">
          <div className="flex items-center justify-between w-full">
            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {timestamp}
              </span>
            )}
            {status && (
              <Badge 
                variant={status.variant || "secondary"} 
                className={cn("text-xs", status.className)}
              >
                {status.label}
              </Badge>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// Helper components for common card patterns
export function LoadingCard({ title = "Loading...", className }: { title?: string; className?: string }) {
  return (
    <ActionableCard
      title={title}
      isLoading={true}
      className={className}
    />
  );
}

export function ErrorCard({ 
  title = "Error", 
  error, 
  onRetry,
  className 
}: { 
  title?: string; 
  error: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ActionableCard
      title={title}
      status={{ label: "Error", variant: "destructive" }}
      className={className}
      actions={onRetry && (
        <button 
          onClick={onRetry}
          className="text-sm text-primary hover:text-primary/80 underline"
        >
          Try again
        </button>
      )}
    >
      <div className="text-sm text-destructive">{error}</div>
    </ActionableCard>
  );
}

export function EmptyCard({ 
  title = "No items", 
  description,
  action,
  className 
}: { 
  title?: string; 
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <ActionableCard
      title={title}
      className={cn("text-center py-8", className)}
    >
      {description && (
        <div className="text-sm text-muted-foreground mb-4">
          {description}
        </div>
      )}
      {action}
    </ActionableCard>
  );
}

