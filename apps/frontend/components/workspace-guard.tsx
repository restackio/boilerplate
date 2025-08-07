"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { isReady, loading } = useDatabaseWorkspace();
  const router = useRouter();

  useEffect(() => {
    // Simple logic: if there's an error, redirect to login
    if (loading.error) {
      console.log("🚫 Workspace error, redirecting to login:", loading.error);
      router.push("/login");
    }
  }, [loading.error, router]);

  // Show loading state while checking workspace
  if (loading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (loading.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Workspace Error</h2>
          <p className="text-sm text-gray-600 mt-2">{loading.error}</p>
          <button 
            onClick={() => router.push("/login")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
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