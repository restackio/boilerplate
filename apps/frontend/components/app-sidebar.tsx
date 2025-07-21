"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Bot,
  Home,
  CopyCheck,
} from "lucide-react";

import { NavMain } from "@workspace/ui/components/nav-main";
import { NavTeams } from "@workspace/ui/components/nav-teams";
import { NavUser } from "@workspace/ui/components/nav-user";
import { WorkspaceSwitcher } from "@workspace/ui/components/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/ui/sidebar";
import { getAllWorkspaces } from "@/lib/demo-data";
import { useWorkspace } from "@/lib/workspace-context";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme, setTheme } = useTheme();
  const { currentWorkspace, switchWorkspace } = useWorkspace();
  const allWorkspaces = getAllWorkspaces();

  // navigation data
  const data = {
    user: currentWorkspace.user,
    workspaces: allWorkspaces,
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
        isActive: true,
      },
      {
        title: "My Tasks",
        url: "/tasks?assigned=me",
        icon: CopyCheck,
      },
    ],
    navWorkspace: [
      {
        title: "Tasks",
        url: "/tasks",
        icon: CopyCheck,
        isActive: true,
      },
      {
        title: "Agents",
        url: "/agents",
        icon: Bot,
      },
    ],
    teams: currentWorkspace.navigation.teams,
  };

  const handleWorkspaceChange = (workspace: any) => {
    if (workspace.key) {
      switchWorkspace(workspace.key);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={data.workspaces}
          activeWorkspace={{
            name: currentWorkspace.workspace.name,
            logo: currentWorkspace.workspace.logo,
            plan: currentWorkspace.workspace.plan,
          }}
          onWorkspaceChange={handleWorkspaceChange}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavMain title="Workspace" items={data.navWorkspace} />
        <NavTeams teams={data.teams} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} theme={theme} setTheme={setTheme} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
