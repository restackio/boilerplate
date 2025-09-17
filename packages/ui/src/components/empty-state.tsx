"use client";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

interface EmptyStateProps {
  /** Title message */
  title: string;
  /** Description message */
  description?: string;
  /** Primary action */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show as card */
  showCard?: boolean;
}

const sizeConfig = {
  sm: {
    container: "py-6",
    title: "text-lg",
    description: "text-sm",
  },
  md: {
    container: "py-12",
    title: "text-xl",
    description: "text-base",
  },
  lg: {
    container: "py-16",
    title: "text-2xl",
    description: "text-lg",
  },
};

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
  showCard = false,
}: EmptyStateProps) {
  const config = sizeConfig[size];

  const content = (
    <div className={cn(
      "text-center flex flex-col items-center",
      config.container,
      className
    )}>

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-foreground mb-2",
        config.title
      )}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn(
          "text-muted-foreground mb-6 max-w-md",
          config.description
        )}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              variant={action.variant || "default"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (showCard) {
    return <Card className="border-dashed">{content}</Card>;
  }

  return content;
}

// Specialized empty state variants
export function NoResultsFound({
  searchTerm,
  onClearSearch,
  onCreate,
  createLabel = "Create new",
  className,
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
  onCreate?: () => void;
  createLabel?: string;
  className?: string;
}) {
  return (
    <EmptyState
      title={searchTerm ? `No results for "${searchTerm}"` : "No results found"}
      description={searchTerm 
        ? "Try adjusting your search terms or filters"
        : "No items match your current filters"
      }
      action={onCreate ? {
        label: createLabel,
        onClick: onCreate,
      } : undefined}
      secondaryAction={onClearSearch && searchTerm ? {
        label: "Clear search",
        onClick: onClearSearch,
      } : undefined}
      className={className}
    />
  );
}

export function NoItemsYet({
  itemType = "items",
  onCreate,
  createLabel,
  description,
  className,
}: {
  itemType?: string;
  onCreate?: () => void;
  createLabel?: string;
  description?: string;
  className?: string;
}) {
  const defaultDescription = description || `You don't have any ${itemType} yet. Create your first one to get started.`;
  const defaultCreateLabel = createLabel || `Create your first ${itemType.replace(/s$/, '')}`;

  return (
    <EmptyState
      title={`No ${itemType} yet`}
      description={defaultDescription}
      action={onCreate ? {
        label: defaultCreateLabel,
        onClick: onCreate,
      } : undefined}
      className={className}
    />
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading the content.",
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={onRetry ? {
        label: retryLabel,
        onClick: onRetry,
        variant: "outline",
      } : undefined}
      className={className}
    />
  );
}

export function FileDropZone({
  title = "Drop files here",
  description = "Drag and drop files here, or click to browse",
  onFileSelect,
  className,
}: {
  title?: string;
  description?: string;
  onFileSelect?: () => void;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors",
        onFileSelect && "cursor-pointer",
        className
      )}
      onClick={onFileSelect}
    >
      <EmptyState
        title={title}
        description={description}
        size="md"
      />
    </div>
  );
}
