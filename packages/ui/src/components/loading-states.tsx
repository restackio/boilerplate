"use client";

import { ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { cn } from "../lib/utils";

interface LoadingSpinnerProps {
  /** Loading message */
  message?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show as overlay */
  overlay?: boolean;
  /** Custom className */
  className?: string;
}

const sizeConfig = {
  sm: { spinner: "h-4 w-4", text: "text-sm" },
  md: { spinner: "h-6 w-6", text: "text-base" },
  lg: { spinner: "h-8 w-8", text: "text-lg" },
};

export function LoadingSpinner({
  message = "Loading...",
  size = "md",
  overlay = false,
  className,
}: LoadingSpinnerProps) {
  const config = sizeConfig[size];
  
  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", config.spinner)} />
      {message && <span className={cn("text-muted-foreground", config.text)}>{message}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
        {content}
      </div>
    );
  }

  return content;
}

interface CenteredLoadingProps {
  /** Loading message */
  message?: string;
  /** Container height */
  height?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show refresh icon instead of spinner */
  showRefresh?: boolean;
  /** Custom className */
  className?: string;
}

export function CenteredLoading({
  message = "Loading...",
  height = "h-64",
  size = "md",
  showRefresh = false,
  className,
}: CenteredLoadingProps) {
  const config = sizeConfig[size];
  const IconComponent = showRefresh ? RefreshCw : Loader2;
  
  return (
    <div className={cn("flex items-center justify-center", height, className)}>
      <div className="text-center">
        <IconComponent className={cn("mx-auto mb-2 text-muted-foreground animate-spin", config.spinner)} />
        {message && <p className={cn("text-muted-foreground", config.text)}>{message}</p>}
      </div>
    </div>
  );
}

interface SkeletonGroupProps {
  /** Number of skeleton items */
  count?: number;
  /** Height of each skeleton */
  height?: string;
  /** Space between skeletons */
  spacing?: string;
  /** Custom className for container */
  className?: string;
  /** Custom className for each skeleton */
  itemClassName?: string;
}

export function SkeletonGroup({
  count = 3,
  height = "h-10",
  spacing = "space-y-2",
  className,
  itemClassName,
}: SkeletonGroupProps) {
  return (
    <div className={cn(spacing, className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn("w-full", height, itemClassName)} />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show header row */
  showHeader?: boolean;
  /** Custom className */
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && (
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex space-x-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton 
                key={`row-${rowIndex}-col-${colIndex}`} 
                className={cn(
                  "h-8",
                  colIndex === 0 ? "w-16" : "flex-1" // First column smaller
                )} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Alias for backward compatibility
export const TableLoading = TableSkeleton;

interface FormSkeletonProps {
  /** Number of fields */
  fields?: number;
  /** Show submit button */
  showSubmit?: boolean;
  /** Custom className */
  className?: string;
}

export function FormSkeleton({
  fields = 4,
  showSubmit = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
      ))}
      {showSubmit && (
        <div className="pt-2">
          <Skeleton className="h-10 w-32" /> {/* Submit button */}
        </div>
      )}
    </div>
  );
}

interface CardSkeletonProps {
  /** Number of cards */
  count?: number;
  /** Show card header */
  showHeader?: boolean;
  /** Show card footer */
  showFooter?: boolean;
  /** Card content lines */
  contentLines?: number;
  /** Custom className */
  className?: string;
}

export function CardSkeleton({
  count = 1,
  showHeader = true,
  showFooter = true,
  contentLines = 2,
  className,
}: CardSkeletonProps) {
  const renderCard = (index: number) => (
    <div key={index} className="border rounded-lg p-4 space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: contentLines }, (_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-4",
              i === contentLines - 1 ? "w-3/4" : "w-full"
            )} 
          />
        ))}
      </div>
      {showFooter && (
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      )}
    </div>
  );

  if (count === 1) {
    return <div className={className}>{renderCard(0)}</div>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }, (_, i) => renderCard(i))}
    </div>
  );
}

// Higher-order component for loading states
interface WithLoadingProps {
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error?: string;
  /** Empty state */
  isEmpty?: boolean;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Error component */
  errorComponent?: ReactNode;
  /** Empty component */
  emptyComponent?: ReactNode;
  /** Children to render when loaded */
  children: ReactNode;
}

export function WithLoading({
  isLoading,
  error,
  isEmpty = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}: WithLoadingProps) {
  if (isLoading) {
    return <>{loadingComponent || <CenteredLoading />}</>;
  }

  if (error) {
    return <>{errorComponent || (
      <CenteredLoading 
        message={`Error: ${error}`} 
        showRefresh={false}
        size="md"
      />
    )}</>;
  }

  if (isEmpty) {
    return <>{emptyComponent || (
      <CenteredLoading 
        message="No items found" 
        showRefresh={false}
        size="md"
      />
    )}</>;
  }

  return <>{children}</>;
}

