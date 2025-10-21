import {
  CheckCircle,
  CircleDashed,
  CirclePause,
  CircleX,
  Clock,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/ui/badge";

// Status options for tasks
export const taskStatusOptions = [
  { label: "In progress", value: "in_progress", icon: CircleDashed },
  { label: "In review", value: "in_review", icon: CirclePause },
  { label: "Closed", value: "closed", icon: CircleX },
  { label: "Completed", value: "completed", icon: CheckCircle },
  { label: "Failed", value: "failed", icon: XCircle },
];

// Get status color classes
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
    case "in_review":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
    case "closed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
  }
};

// Get status icon component
export const getStatusIcon = (status: string, className: string = "w-4 h-4") => {
  switch (status) {
    case "completed":
    case "closed":
      return <CheckCircle className={`${className} text-green-600`} />;
    case "failed":
      return <XCircle className={`${className} text-red-600`} />;
    case "in_progress":
      return <CircleDashed className={`${className} text-blue-600`} />;
    case "in_review":
      return <CirclePause className={`${className} text-orange-600`} />;
    case "open":
    case "waiting":
      return <Clock className={`${className} text-muted-foreground/60`} />;
    case "active":
    case "running":
      return <PlayCircle className={`${className} text-blue-600 animate-pulse`} />;
    default:
      return <Clock className={`${className} text-muted-foreground/60`} />;
  }
};

// Get status label
export const getStatusLabel = (status: string): string => {
  const option = taskStatusOptions.find(opt => opt.value === status);
  if (option) return option.label;

  // Handle additional statuses not in main options
  switch (status) {
    case "failed":
      return "Failed";
    case "active":
    case "running":
      return "Running";
    case "open":
    case "waiting":
      return "Waiting";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  }
};

// Get status badge component
export const getStatusBadge = (
  status: string,
  variant: "default" | "outline" = "outline",
  size: "default" | "sm" | "xs" = "xs"
) => {
  const sizeClass = size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : "";
  
  switch (status) {
    case "completed":
    case "closed":
      return (
        <Badge 
          variant={variant} 
          className={`${sizeClass} bg-green-50 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800`}
        >
          {getStatusLabel(status)}
        </Badge>
      );
    case "failed":
      return (
        <Badge 
          variant={variant} 
          className={`${sizeClass} bg-red-50 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800`}
        >
          Failed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge 
          variant={variant} 
          className={`${sizeClass} bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800`}
        >
          In progress
        </Badge>
      );
    case "in_review":
      return (
        <Badge 
          variant={variant} 
          className={`${sizeClass} bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-800`}
        >rReview
        </Badge>
      );
    case "open":
    case "waiting":
      return (
        <Badge 
          variant={variant} 
          className={`${sizeClass} bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/50 dark:text-gray-200 dark:border-gray-800`}
        >
          Waiting
        </Badge>
      );
    case "active":
    case "running":
      return (
        <Badge 
          variant={variant} 
          className={`${sizeClass} bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800`}
        >
          Running
        </Badge>
      );
    default:
      return (
        <Badge variant={variant} className={sizeClass}>
          {getStatusLabel(status)}
        </Badge>
      );
  }
};
