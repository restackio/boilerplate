"use client";

import { Button } from "./ui/button";
import { PageHeader } from "./page-header";
import { NotificationBanner } from "./notification-banner";
import { ArrowLeft } from "lucide-react";

export interface EntityErrorStateProps {
  /** Error message to display */
  error: string;
  /** Entity ID that failed to load */
  entityId: string;
  /** Entity type (e.g., "task", "agent", "workspace") */
  entityType?: string;
  /** Back navigation handler */
  onBack: () => void;
  /** Custom back button text */
  backText?: string;
  /** Custom error title */
  errorTitle?: string;
  /** Custom breadcrumbs */
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function EntityErrorState({ 
  error, 
  entityId, 
  entityType = "item",
  onBack,
  backText,
  errorTitle,
  breadcrumbs
}: EntityErrorStateProps) {
  const defaultBreadcrumbs = breadcrumbs || [
    { label: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s`, href: `/${entityType}s` }, 
    { label: "Error" }
  ];
  
  const defaultBackText = backText || `Back to ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s`;
  const defaultErrorTitle = errorTitle || `Error Loading ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;

  return (
    <div>
      <PageHeader 
        breadcrumbs={defaultBreadcrumbs} 
        actions={
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {defaultBackText}
          </Button>
        } 
        fixed={true} 
      />
      <div className="p-6 space-y-4">
        <NotificationBanner
          variant="error"
          title={defaultErrorTitle}
          description={`${error} (${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ID: ${entityId})`}
          dismissible={false}
        />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">{entityType.charAt(0).toUpperCase() + entityType.slice(1)} Not Available</h2>
          <p className="text-muted-foreground">
            The {entityType} you&apos;re looking for couldn&apos;t be loaded. Please check the {entityType} ID and try again.
          </p>
        </div>
      </div>
    </div>
  );
}
