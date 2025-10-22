"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenteredLoading } from "@workspace/ui/components/loading-states";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id) {
          setIsAuthenticated(true);
          return;
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
      }
    }
    
    // If not authenticated, redirect to login
    setIsAuthenticated(false);
    router.push("/login");
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <CenteredLoading 
        message="Checking authentication..."
        height="min-h-screen"
      />
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
} 