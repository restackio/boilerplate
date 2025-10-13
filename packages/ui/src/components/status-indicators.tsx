"use client";

import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  Pause, 
  Square as Stop, 
  AlertTriangle,
  Activity,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Generic status definitions
export type StatusVariant = 
  | "success" 
  | "error" 
  | "warning" 
  | "info" 
  | "pending" 
  | "active" 
  | "inactive" 
  | "paused"
  | "stopped"
  | "completed"
  | "failed"
  | "waiting"
  | "in-progress"
  | "cancelled"
  | "open"
  | "closed";

// Status configuration
interface StatusConfig {
  icon: LucideIcon;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

const statusConfigs: Record<StatusVariant, StatusConfig> = {
  success: {
    icon: CheckCircle,
    label: "Success",
    variant: "default",
    className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    variant: "default",
    className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  },
  error: {
    icon: XCircle,
    label: "Error",
    variant: "destructive",
    className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    variant: "destructive",
    className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    variant: "outline",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  },
  waiting: {
    icon: Clock,
    label: "Waiting",
    variant: "outline",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  },
  info: {
    icon: AlertTriangle,
    label: "Info",
    variant: "outline",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    variant: "secondary",
    className: "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300",
  },
  active: {
    icon: Activity,
    label: "Active",
    variant: "default",
    className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  },
  "in-progress": {
    icon: Loader2,
    label: "In progress",
    variant: "outline",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  },
  inactive: {
    icon: Stop,
    label: "Inactive",
    variant: "secondary",
    className: "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300",
  },
  paused: {
    icon: Pause,
    label: "Paused",
    variant: "outline",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  },
  stopped: {
    icon: Stop,
    label: "Stopped",
    variant: "secondary",
    className: "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300",
  },
  cancelled: {
    icon: XCircle,
    label: "Cancelled",
    variant: "outline",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
  },
  open: {
    icon: Play,
    label: "Open",
    variant: "outline",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
  },
  closed: {
    icon: Stop,
    label: "Closed",
    variant: "secondary",
    className: "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-300",
  },
};

// Status Badge Component
interface StatusBadgeProps {
  /** Status variant */
  status: StatusVariant;
  /** Custom label (overrides default) */
  label?: string;
  /** Badge size */
  size?: "sm" | "default" | "lg";
  /** Show icon */
  showIcon?: boolean;
  /** Animate icon (useful for in-progress states) */
  animateIcon?: boolean;
  /** Additional className */
  className?: string;
  /** Custom icon */
  icon?: LucideIcon;
}

export function StatusBadge({
  status,
  label,
  size = "default",
  showIcon = true,
  animateIcon = false,
  className,
  icon: customIcon,
}: StatusBadgeProps) {
  const config = statusConfigs[status];
  const Icon = customIcon || config.icon;
  const displayLabel = label || config.label;

  // Auto-animate certain statuses
  const shouldAnimate = animateIcon || status === "in-progress" || status === "pending";

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "flex items-center gap-1",
        config.className,
        size === "sm" && "text-xs px-2 py-0.5",
        size === "lg" && "text-sm px-3 py-1",
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            shouldAnimate && "animate-spin"
          )} 
        />
      )}
      {displayLabel}
    </Badge>
  );
}

// Status Icon Component (just the icon, no badge)
interface StatusIconProps {
  /** Status variant */
  status: StatusVariant;
  /** Icon size */
  size?: "sm" | "default" | "lg";
  /** Animate icon */
  animate?: boolean;
  /** Additional className */
  className?: string;
  /** Custom icon */
  icon?: LucideIcon;
}

export function StatusIcon({
  status,
  size = "default",
  animate = false,
  className,
  icon: customIcon,
}: StatusIconProps) {
  const config = statusConfigs[status];
  const Icon = customIcon || config.icon;

  const sizeClasses = {
    sm: "h-3 w-3",
    default: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const shouldAnimate = animate || status === "in-progress" || status === "pending";

  return (
    <Icon 
      className={cn(
        sizeClasses[size],
        shouldAnimate && "animate-spin",
        getStatusIconColor(status),
        className
      )} 
    />
  );
}

// Helper function to get status icon colors
export function getStatusIconColor(status: StatusVariant): string {
  switch (status) {
    case "success":
    case "completed":
    case "active":
      return "text-green-600 dark:text-green-400";
    case "error":
    case "failed":
      return "text-red-600 dark:text-red-400";
    case "warning":
    case "waiting":
    case "paused":
      return "text-yellow-600 dark:text-yellow-400";
    case "info":
    case "in-progress":
      return "text-blue-600 dark:text-blue-400";
    case "cancelled":
    case "open":
      return "text-orange-600 dark:text-orange-400";
    case "pending":
    case "inactive":
    case "stopped":
    case "closed":
    default:
      return "text-neutral-600 dark:text-neutral-400";
  }
}

// Status Color Helper (for custom styling)
export function getStatusColor(status: StatusVariant): string {
  const config = statusConfigs[status];
  return config.className || "";
}

// Progress indicator with status
interface StatusProgressProps {
  /** Status variant */
  status: StatusVariant;
  /** Progress value (0-100) */
  progress?: number;
  /** Custom label */
  label?: string;
  /** Show percentage */
  showPercentage?: boolean;
  /** Additional className */
  className?: string;
}

export function StatusProgress({
  status,
  progress = 0,
  label,
  showPercentage = false,
  className,
}: StatusProgressProps) {
  const config = statusConfigs[status];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <StatusBadge status={status} label={label} size="sm" />
        {showPercentage && progress !== undefined && (
          <span className="text-sm text-muted-foreground">{progress}%</span>
        )}
      </div>
      {progress !== undefined && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              config.className?.includes("green") && "bg-green-500",
              config.className?.includes("red") && "bg-red-500",
              config.className?.includes("yellow") && "bg-yellow-500",
              config.className?.includes("blue") && "bg-blue-500",
              config.className?.includes("orange") && "bg-orange-500",
              config.className?.includes("neutral") && "bg-neutral-500"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Status summary for displaying multiple statuses
interface StatusSummaryProps {
  /** Array of status counts */
  statuses: Array<{
    status: StatusVariant;
    count: number;
    label?: string;
  }>;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Additional className */
  className?: string;
}

export function StatusSummary({
  statuses,
  direction = "horizontal",
  className,
}: StatusSummaryProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        direction === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className
      )}
    >
      {statuses.map(({ status, count, label }) => (
        <div key={status} className="flex items-center gap-2">
          <StatusIcon status={status} size="sm" />
          <span className="text-sm">
            {label || statusConfigs[status].label}: {count}
          </span>
        </div>
      ))}
    </div>
  );
}
