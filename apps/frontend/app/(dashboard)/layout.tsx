"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceGuard } from "@/components/auth/workspace-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Check if we're on a detail page or playground page to minify sidebar by default
  const isTaskDetailPage =
    pathname.startsWith("/tasks/") && pathname.split("/").length === 3;
  const isDatasetDetailPage =
    pathname.startsWith("/datasets/") && pathname.split("/").length === 3 && pathname.split("/")[2] !== "new";
  const isPlaygroundPage = pathname === "/playground";
  
  const shouldMinimizeSidebar = isTaskDetailPage || isDatasetDetailPage || isPlaygroundPage;

  // Controlled sidebar state that responds to pathname changes
  const [sidebarOpen, setSidebarOpen] = useState(!shouldMinimizeSidebar);

  // Update sidebar state when pathname changes
  useEffect(() => {
    const shouldBeOpen = !shouldMinimizeSidebar;
    setSidebarOpen(shouldBeOpen);
  }, [shouldMinimizeSidebar]);

  return (
    <AuthGuard>
      <WorkspaceGuard>
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceGuard>
    </AuthGuard>
  );
}
