"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import { NotificationBanner } from "@workspace/ui/components/notification-banner";
import { Button } from "@workspace/ui/components/ui/button";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { isReady, loading, workspaces } = useDatabaseWorkspace();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Simple logic: if there's an error, redirect to login
    if (loading.error) {
      router.push("/login");
    }
  }, [loading.error, router]);

  useEffect(() => {
    // Only check for empty workspaces once after loading completes
    // This prevents redirect loops after workspace creation
    if (!loading.isLoading && !loading.error && workspaces.length === 0 && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.push("/workspace/create");
    }
  }, [loading.isLoading, loading.error, workspaces.length, router]);

  // Show loading state while checking workspace
  if (loading.isLoading) {
    return (
      <CenteredLoading 
        message="Loading workspace..."
        height="min-h-screen"
      />
    );
  }

  // Show error state if there's an error
  if (loading.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <NotificationBanner
            variant="error"
            title="Workspace Error"
            description={loading.error}
            dismissible={false}
          />
          <div className="text-center">
            <Button onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not ready (will redirect)
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
} 