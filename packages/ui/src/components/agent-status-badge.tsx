"use client";

import { CheckCircle, FileText, Archive } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export type AgentStatus = "published" | "draft" | "archived";

interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const getStatusConfig = (status: AgentStatus) => {
  switch (status) {
    case "published":
      return {
        label: "Published",
        icon: CheckCircle,
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        variant: "default" as const,
      };
    case "draft":
      return {
        label: "Draft",
        icon: FileText,
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        variant: "outline" as const,
      };
    case "archived":
      return {
        label: "Archived",
        icon: Archive,
        color: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
        variant: "secondary" as const,
      };
    default:
      return {
        label: "Unknown",
        icon: FileText,
        color: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
        variant: "secondary" as const,
      };
  }
};

export function AgentStatusBadge({ 
  status, 
  className, 
  showIcon = true, 
  size = "md" 
}: AgentStatusBadgeProps) {
  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "border-0 flex items-center gap-1 w-fit",
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <IconComponent className={iconSizeClasses[size]} />}
      <span className="capitalize">{config.label}</span>
    </Badge>
  );
}
