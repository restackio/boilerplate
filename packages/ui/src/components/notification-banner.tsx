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
    container: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    titleColor: "text-green-800",
    descriptionColor: "text-green-700",
    actionColor: "text-green-600 hover:text-green-800",
  },
  error: {
    icon: AlertCircle,
    container: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    titleColor: "text-red-800",
    descriptionColor: "text-red-700",
    actionColor: "text-red-600 hover:text-red-800",
  },
  warning: {
    icon: AlertTriangle,
    container: "bg-yellow-50 border-yellow-200",
    iconColor: "text-yellow-600",
    titleColor: "text-yellow-800",
    descriptionColor: "text-yellow-700",
    actionColor: "text-yellow-600 hover:text-yellow-800",
  },
  info: {
    icon: Info,
    container: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    descriptionColor: "text-blue-700",
    actionColor: "text-blue-600 hover:text-blue-800",
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

