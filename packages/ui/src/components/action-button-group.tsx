"use client";

import { useState, ReactNode } from "react";
import { Button } from "./ui/button";
import { Loader2, MoreHorizontal, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
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
  /** Whether button is primary */
  isPrimary?: boolean;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Loading label override */
  loadingLabel?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Whether to show in overflow menu */
  overflow?: boolean;
  /** Action handler */
  onClick?: () => void | Promise<void>;
  /** Confirmation required */
  requiresConfirmation?: boolean;
  /** Confirmation message */
  confirmationMessage?: string;
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
  /** Show overflow menu for extra actions */
  showOverflow?: boolean;
  /** Maximum visible buttons before overflow */
  maxVisible?: number;
  /** Loading states per action */
  loadingStates?: Record<string, boolean>;
  /** Global loading state */
  isLoading?: boolean;
  /** Context for conditional actions */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
  /** Additional className */
  className?: string;
  /** Custom overflow trigger */
  overflowTrigger?: ReactNode;
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
  showOverflow = true,
  maxVisible = 3,
  loadingStates = {},
  isLoading = false,
  context,
  className,
  overflowTrigger,
  statusBadge,
  showSeparator = false,
}: ActionButtonGroupProps) {
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  // Filter actions based on conditions
  const visibleActions = actions.filter(action => {
    if (action.show === false) return false;
    if (typeof action.show === 'function') return action.show(context);
    return action.show === undefined || action.show === true;
  });

  // Separate primary, visible, and overflow actions
  const primaryActions = visibleActions.filter(a => a.isPrimary && !a.overflow);
  const regularActions = visibleActions.filter(a => !a.isPrimary && !a.overflow);
  const overflowActions = visibleActions.filter(a => a.overflow);

  // Determine which actions to show directly vs in overflow
  const directActions = [...primaryActions];
  const remainingSlots = Math.max(0, maxVisible - directActions.length);
  directActions.push(...regularActions.slice(0, remainingSlots));
  
  const menuActions = [
    ...regularActions.slice(remainingSlots),
    ...overflowActions
  ];

  const hasOverflow = showOverflow && menuActions.length > 0;

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

  // Handle action click
  const handleActionClick = async (action: ActionButton) => {
    if (action.requiresConfirmation && confirmingAction !== action.key) {
      setConfirmingAction(action.key);
      return;
    }

    setConfirmingAction(null);
    await action.onClick?.();
  };

  // Render action button
  const renderButton = (action: ActionButton, inMenu = false) => {
    const Icon = action.icon;
    const actionLoading = loadingStates[action.key] || action.loading || isLoading;
    const disabled = action.disabled || isLoading;
    const isConfirming = confirmingAction === action.key;

    if (inMenu) {
      return (
        <DropdownMenuItem
          key={action.key}
          onClick={() => handleActionClick(action)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2",
            action.variant === "destructive" && "text-destructive focus:text-destructive"
          )}
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            Icon && <Icon className="h-4 w-4" />
          )}
          {isConfirming ? action.confirmationMessage || "Confirm?" : action.label}
        </DropdownMenuItem>
      );
    }

    return (
      <Button
        key={action.key}
        variant={action.variant || "outline"}
        size={action.size || size}
        onClick={() => handleActionClick(action)}
        disabled={disabled}
        className="flex items-center gap-2"
        title={action.tooltip}
      >
        {actionLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {action.loadingLabel || action.label}
          </>
        ) : (
          <>
            {Icon && <Icon className="h-4 w-4" />}
            {isConfirming ? action.confirmationMessage || "Confirm?" : action.label}
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

      {/* Direct action buttons */}
      {directActions.map(action => renderButton(action))}

      {/* Overflow menu */}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {overflowTrigger || (
              <Button variant="ghost" size={size} className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuActions.map((action, index) => (
              <div key={action.key}>
                {renderButton(action, true)}
                {index < menuActions.length - 1 && action.variant === "destructive" && (
                  <DropdownMenuSeparator />
                )}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
    isPrimary: true,
    loading,
    onClick,
  }),

  delete: (onClick: () => void, loading = false): ActionButton => ({
    key: "delete",
    label: "Delete",
    variant: "destructive",
    loading,
    requiresConfirmation: true,
    confirmationMessage: "Confirm delete",
    onClick,
    overflow: true,
  }),

  archive: (onClick: () => void, loading = false): ActionButton => ({
    key: "archive",
    label: "Archive",
    variant: "outline",
    loading,
    requiresConfirmation: true,
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
};
