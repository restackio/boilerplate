"use client";

import { CenteredLoading } from "./loading-states";

export interface EntityLoadingStateProps {
  /** Entity ID being loaded */
  entityId: string;
  /** Entity type (e.g., "task", "agent", "workspace") */
  entityType?: string;
  /** Custom loading message */
  message?: string;
  /** Loading container height */
  height?: string;
  /** Loading spinner size */
  size?: "sm" | "md" | "lg";
}

export function EntityLoadingState({ 
  entityId, 
  entityType = "item",
  message,
  height = "h-64",
  size = "lg"
}: EntityLoadingStateProps) {
  const loadingMessage = message || `Loading ${entityType} ${entityId}...`;
  
  return (
    <CenteredLoading 
      message={loadingMessage}
      height={height}
      size={size}
    />
  );
}
