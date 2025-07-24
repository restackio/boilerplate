"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Bot,
  Home,
  CopyCheck,
  Building,
  Users,
  Briefcase,
  Target,
  Zap,
  Shield,
  Globe,
  type LucideIcon,
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
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

// Helper function to format workspace data for UI components
function formatWorkspaceForUI(workspace: any) {
  return {
    id: workspace.id,
    name: workspace.name,
    logo: Building, // Use the Building icon from lucide-react
  };
}

// Helper function to format user data for UI components
function formatUserForUI(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar_url || `/avatars/${user.name.toLowerCase()}.jpg`,
  };
}

// Helper function to get icon component by name
function getIconByName(iconName?: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    Building,
    Users,
    Briefcase,
    Target,
    Zap,
    Shield,
    Globe,
  };
  
  return iconMap[iconName || 'Building'] || Building;
}

// Helper function to format team data for UI components
function formatTeamForUI(team: any) {
  return {
    name: team.name,
    url: `/teams/${team.id}`,
    icon: getIconByName(team.icon),
    items: [
      {
        title: "Tasks",
        url: `/teams/${team.id}/tasks`,
      },
      {
        title: "Agents",
        url: `/teams/${team.id}/agents`,
      },
    ],
  };
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme, setTheme } = useTheme();
  const { workspaces, currentWorkspaceId, currentUser, loading, setCurrentWorkspaceId } = useDatabaseWorkspace();
  const { teams, fetchTeams } = useWorkspaceScopedActions();

  // Format workspaces for UI
  const formattedWorkspaces = workspaces.map(formatWorkspaceForUI);
  const formattedUser = currentUser ? formatUserForUI(currentUser) : null;
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;

  // Fetch teams when workspace changes, but only if we don't have teams for this workspace
  React.useEffect(() => {
    if (currentWorkspaceId && teams.length === 0) {
      fetchTeams();
    }
  }, [currentWorkspaceId, fetchTeams, teams.length]);

  if (loading.isLoading) {
    return <div>Loading...</div>;
  }

  if (loading.error) {
    return <div>Error: {loading.error}</div>;
  }

  // navigation data
  const data = {
    user: formattedUser || { name: "Loading...", email: "loading@example.com", avatar: "" },
    workspaces: formattedWorkspaces,
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
    teams: teams.map(formatTeamForUI),
  };

  const handleWorkspaceChange = (workspace: any) => {
    if (workspace.id) {
      setCurrentWorkspaceId(workspace.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={data.workspaces}
          activeWorkspace={currentWorkspace ? formatWorkspaceForUI(currentWorkspace) : undefined}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavMain title="Workspace" items={data.navWorkspace} />
        <NavTeams teams={data.teams} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} theme={theme} setTheme={setTheme} onLogout={handleLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
