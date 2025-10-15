"use client";

import { ReactNode } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type NotificationVariant = "success" | "error" | "warning" | "info";

interface NotificationBannerProps {
  /** Visual variant */
  variant: NotificationVariant;
  /** Main message */
  title: string;
  /** Optional description */
  description?: string;
  /** Custom icon (overrides default variant icon) */
  icon?: ReactNode;
  /** Show close button */
  dismissible?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom className */
  className?: string;
  /** Additional content */
  children?: ReactNode;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    container: "bg-green-500/10 border-green-500/30 dark:bg-green-500/10 dark:border-green-500/30",
    iconColor: "text-green-600 dark:text-green-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
    actionColor: "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300",
  },
  error: {
    icon: AlertCircle,
    container: "bg-red-500/10 border-red-500/30 dark:bg-red-500/10 dark:border-red-500/30",
    iconColor: "text-red-600 dark:text-red-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
    actionColor: "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    container: "bg-yellow-500/10 border-yellow-500/30 dark:bg-yellow-500/10 dark:border-yellow-500/30",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
    actionColor: "text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300",
  },
  info: {
    icon: Info,
    container: "bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/10 dark:border-blue-500/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-foreground",
    descriptionColor: "text-muted-foreground",
    actionColor: "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
  },
};

export function NotificationBanner({
  variant,
  title,
  description,
  icon,
  dismissible = false,
  onClose,
  action,
  className,
  children,
}: NotificationBannerProps) {
  const config = variantConfig[variant];
  const IconComponent = icon ? null : config.icon;

  return (
    <div className={cn("p-4 border rounded-md", config.container, className)}>
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          {icon || (IconComponent && <IconComponent className={`h-5 w-5 ${config.iconColor}`} />)}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${config.titleColor}`}>
                {title}
              </p>
              {description && (
                <p className={`text-xs mt-1 ${config.descriptionColor}`}>
                  {description}
                </p>
              )}
              {children}
            </div>

            {/* Action and Close */}
            <div className="ml-4 flex items-center space-x-2">
              {action && (
                <button
                  onClick={action.onClick}
                  className={`text-xs underline ${config.actionColor}`}
                >
                  {action.label}
                </button>
              )}
              
              {dismissible && onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components for common notification patterns
export function SuccessNotification({ 
  count, 
  itemType = "items", 
  onDismiss,
  action 
}: { 
  count: number; 
  itemType?: string; 
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <NotificationBanner
      variant="success"
      title={`Created ${count} new ${count === 1 ? itemType.replace(/s$/, '') : itemType}`}
      description={`The ${itemType} below are filtered to show only newly created ${itemType}. Clear filters to see all ${itemType}.`}
      dismissible={!!onDismiss}
      onClose={onDismiss}
      action={action}
    />
  );
}

export function ErrorNotification({ 
  error, 
  onDismiss,
  action 
}: { 
  error: string; 
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <NotificationBanner
      variant="error"
      title="Error"
      description={error}
      dismissible={!!onDismiss}
      onClose={onDismiss}
      action={action}
    />
  );
}

export function LoadingNotification({ 
  message = "Loading...",
}: { 
  message?: string;
}) {
  return (
    <NotificationBanner
      variant="info"
      title={message}
      icon={<div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    />
  );
}

