"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 1 && segments[0] === "dashboard") {
      return { title: "Dashboard", subtitle: "Overview" };
    } else if (segments[0] === "tasks" && segments.length === 1) {
      return { title: "Tasks", subtitle: "Task Management" };
    } else if (segments[0] === "tasks" && segments.length === 2) {
      return { title: "Tasks", subtitle: `Task ${segments[1]}` };
    } else if (segments[0] === "agents") {
      return { title: "Agents", subtitle: "Agent Management" };
    } else {
      return { title: "Boilerplate", subtitle: "Support Automation" };
    }
  };

  const breadcrumbs = getBreadcrumbs();

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
    <WorkspaceProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
