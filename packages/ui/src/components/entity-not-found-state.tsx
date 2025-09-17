"use client";

import { Button } from "./ui/button";
import { PageHeader } from "./page-header";
import { EmptyState } from "./empty-state";
import { ArrowLeft } from "lucide-react";

export interface EntityNotFoundStateProps {
  /** Entity ID that was not found */
  entityId: string;
  /** Entity type (e.g., "task", "agent", "workspace") */
  entityType?: string;
  /** Back navigation handler */
  onBack: () => void;
  /** Custom back button text */
  backText?: string;
  /** Custom not found title */
  notFoundTitle?: string;
  /** Custom not found description */
  notFoundDescription?: string;
  /** Custom breadcrumbs */
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function EntityNotFoundState({ 
  entityId, 
  entityType = "item",
  onBack,
  backText,
  notFoundTitle,
  notFoundDescription,
  breadcrumbs
}: EntityNotFoundStateProps) {
  const defaultBreadcrumbs = breadcrumbs || [
    { label: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s`, href: `/${entityType}s` }, 
    { label: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Not Found` }
  ];
  
  const defaultBackText = backText || `Back to ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}s`;
  const defaultNotFoundTitle = notFoundTitle || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Not Found`;
  const defaultNotFoundDescription = notFoundDescription || 
    `The requested ${entityType} could not be found. ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ID: ${entityId}`;

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
      <div className="flex items-center justify-center h-64">
        <EmptyState
          title={defaultNotFoundTitle}
          description={defaultNotFoundDescription}
          action={{
            label: defaultBackText,
            onClick: onBack,
          }}
        />
      </div>
    </div>
  );
}
