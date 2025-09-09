"use client";

import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Settings, Webhook, Workflow, History } from "lucide-react";

const tabsConfig = [
  { id: "setup", label: "Setup", icon: Settings },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "flow", label: "Flow", icon: Workflow },
  { id: "versions", label: "Version history", icon: History },
];

export function AgentPageSkeleton() {
  const skeletonBreadcrumbs = [
    { label: "Agents", href: "/agents" },
    { label: "Loading..." },
  ];

  const skeletonActions = (
    <>
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-16" />
    </>
  );

  return (
    <div className="flex-1">
      <PageHeader 
        breadcrumbs={skeletonBreadcrumbs} 
        actions={skeletonActions} 
        fixed={true}
      />

      <div className="bg-primary-foreground p-4">
        <div className="space-y-6">
          <div className="bg-background rounded-lg border">
            {/* Tab Navigation Skeleton */}
            <div className="border-b bg-muted/30 rounded-t-lg px-4 py-2">
              <div className="flex gap-1">
                {tabsConfig.map((tab) => (
                  <div key={tab.id} className="flex items-center gap-2 px-4 py-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Content Skeleton */}
            <div className="p-6 space-y-6">
              <AgentSetupFormSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentSetupFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
      
      {/* Instructions */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* Model Settings */}
      <div className="space-y-4 p-4 border rounded-lg">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
