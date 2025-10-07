"use client";

import { useState, ReactNode } from "react";
import { Button } from "./ui/button";
import { Loader2, Archive, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

export interface ActionButton {
  /** Action key */
  key: string;
  /** Button label */
  label: string;
  /** Button icon */
  icon?: LucideIcon;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Whether button is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Loading label override */
  loadingLabel?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Show icon only without label */
  iconOnly?: boolean;
  /** Action handler */
  onClick?: () => void | Promise<void>;
  /** Conditional display */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  show?: boolean | ((context: any) => boolean);
}

interface ActionButtonGroupProps {
  /** Action buttons */
  actions: ActionButton[];
  /** Button alignment */
  align?: "left" | "center" | "right";
  /** Button spacing */
  spacing?: "tight" | "normal" | "loose";
  /** Group size */
  size?: "sm" | "default" | "lg";
  /** Loading states per action */
  loadingStates?: Record<string, boolean>;
  /** Global loading state */
  isLoading?: boolean;
  /** Context for conditional actions */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
  /** Additional className */
  className?: string;
  /** Custom status badge */
  statusBadge?: ReactNode;
  /** Show separator before actions */
  showSeparator?: boolean;
}

export function ActionButtonGroup({
  actions,
  align = "right",
  spacing = "normal",
  size = "default",
  loadingStates = {},
  isLoading = false,
  context,
  className,
  statusBadge,
  showSeparator = false,
}: ActionButtonGroupProps) {
  // Filter actions based on conditions
  const visibleActions = actions.filter(action => {
    if (action.show === false) return false;
    if (typeof action.show === 'function') return action.show(context);
    return action.show === undefined || action.show === true;
  });

  // Spacing classes
  const spacingClasses = {
    tight: "gap-1",
    normal: "gap-2", 
    loose: "gap-3",
  };

  // Alignment classes
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  // Render action button
  const renderButton = (action: ActionButton) => {
    const Icon = action.icon;
    const actionLoading = loadingStates[action.key] || action.loading || isLoading;
    const disabled = action.disabled || isLoading;

    return (
      <Button
        key={action.key}
        variant={action.variant || "outline"}
        size={action.iconOnly ? "icon" : action.size || size}
        onClick={action.onClick}
        disabled={disabled}
        className={cn(
          action.iconOnly ? "h-8 w-8" : "flex items-center gap-2"
        )}
        title={action.tooltip || action.label}
      >
        {actionLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {!action.iconOnly && (action.loadingLabel || action.label)}
          </>
        ) : (
          <>
            {Icon && <Icon className="h-4 w-4" />}
            {!action.iconOnly && action.label}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className={cn(
      "flex items-center",
      spacingClasses[spacing],
      alignClasses[align],
      showSeparator && "border-l pl-4 ml-4",
      className
    )}>
      {/* Status badge */}
      {statusBadge}

      {/* Action buttons */}
      {visibleActions.map(action => renderButton(action))}
    </div>
  );
}

// Entity header component that combines title, status, and actions
interface EntityHeaderProps {
  /** Entity title */
  title: string;
  /** Entity subtitle */
  subtitle?: string;
  /** Status badge */
  statusBadge?: ReactNode;
  /** Additional info badges */
  badges?: ReactNode[];
  /** Action buttons */
  actions?: ActionButton[];
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Back handler */
  onBack?: () => void;
  /** Custom icon */
  icon?: LucideIcon;
  /** Loading state */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
  /** Header size */
  size?: "sm" | "default" | "lg";
}

export function EntityHeader({
  title,
  subtitle,
  statusBadge,
  badges = [],
  actions = [],
  breadcrumbs = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBack: _onBack,
  icon: Icon,
  isLoading = false,
  className,
  size = "default",
}: EntityHeaderProps) {
  const sizeClasses = {
    sm: "p-3",
    default: "p-4",
    lg: "p-6",
  };

  const titleSizeClasses = {
    sm: "text-lg",
    default: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn(
      "border-b bg-background",
      sizeClasses[size],
      className
    )}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="mb-2">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header content */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          {Icon && (
            <div className="flex-shrink-0">
              <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {/* Title and info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className={cn(
                "font-semibold truncate",
                titleSizeClasses[size]
              )}>
                {title}
              </h1>
              
              {/* Status badge */}
              {statusBadge}

              {/* Additional badges */}
              {badges.map((badge, index) => (
                <div key={index}>{badge}</div>
              ))}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <ActionButtonGroup
            actions={actions}
            isLoading={isLoading}
            size={size === "lg" ? "default" : "sm"}
            showSeparator={true}
          />
        )}
      </div>
    </div>
  );
}

// Hook for managing action states
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useActionStates(_actionKeys: string[]) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const setError = (key: string, error: string | null) => {
    setErrors(prev => 
      error ? { ...prev, [key]: error } : 
      { ...prev, [key]: undefined } as Record<string, string>
    );
  };

  const executeAction = async (key: string, action: () => Promise<void>) => {
    try {
      setLoading(key, true);
      setError(key, null);
      await action();
    } catch (error) {
      setError(key, error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(key, false);
    }
  };

  const reset = () => {
    setLoadingStates({});
    setErrors({});
  };

  return {
    loadingStates,
    errors,
    setLoading,
    setError,
    executeAction,
    reset,
  };
}

// Common action configurations
export const commonActions = {
  save: (onClick: () => void, loading = false): ActionButton => ({
    key: "save",
    label: "Save",
    variant: "default",
    loading,
    onClick,
  }),

  delete: (onClick: () => void, loading = false): ActionButton => ({
    key: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "ghost",
    loading,
    iconOnly: true,
    onClick,
  }),

  archive: (onClick: () => void, loading = false): ActionButton => ({
    key: "archive",
    label: "Archive",
    icon: Archive,
    variant: "ghost",
    loading,
    iconOnly: true,
    onClick,
  }),

  edit: (onClick: () => void): ActionButton => ({
    key: "edit",
    label: "Edit",
    variant: "outline",
    onClick,
  }),

  test: (onClick: () => void): ActionButton => ({
    key: "test",
    label: "Test",
    variant: "outline",
    onClick,
  }),

  publish: (onClick: () => void, loading = false): ActionButton => ({
    key: "publish",
    label: "Publish",
    variant: "default",
    loading,
    onClick,
  }),
};
