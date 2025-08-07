"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { DatabaseWorkspaceProvider } from "@/lib/database-workspace-context";
import { AuthGuard } from "@/components/auth-guard";
import { WorkspaceGuard } from "@/components/workspace-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();





  // Check if we're on a task detail page to minify sidebar by default
  const isTaskDetailPage =
    pathname.startsWith("/tasks/") && pathname.split("/").length === 3;

  // Controlled sidebar state that responds to pathname changes
  const [sidebarOpen, setSidebarOpen] = useState(!isTaskDetailPage);

  // Update sidebar state when pathname changes
  useEffect(() => {
    const shouldBeOpen = !isTaskDetailPage;
    setSidebarOpen(shouldBeOpen);
  }, [isTaskDetailPage]);

  return (
    <AuthGuard>
      <DatabaseWorkspaceProvider>
        <WorkspaceGuard>
          <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <AppSidebar />
            <SidebarInset>
              <div className="flex flex-1 flex-col gap-4">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </WorkspaceGuard>
      </DatabaseWorkspaceProvider>
    </AuthGuard>
  );
}
