"use client";

import { useEffect } from "react";
import { NotificationBanner } from "@workspace/ui/components/notification-banner";
import { Button } from "@workspace/ui/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        <NotificationBanner
          variant="error"
          title="Something went wrong"
          description={error.message || "An unexpected error occurred"}
          dismissible={false}
        />
        
        <div className="text-center">
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
        
        {error.digest && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
