"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */

import * as React from "react";
import { ChevronsUpDown, Plus, Building } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/ui/sidebar";

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onWorkspaceChange,
}: {
  workspaces: {
    name: string;
    logo: React.ElementType;
    key?: string;
    id?: string;
  }[];
  activeWorkspace?: {
    name: string;
    logo: React.ElementType;
    key?: string;
    id?: string;
  };
  onWorkspaceChange?: (workspace: {
    name: string;
    logo: React.ElementType;
    key?: string;
    id?: string;
  }) => void;
}) {
  const { isMobile } = useSidebar();
  const [localActiveWorkspace, setLocalActiveWorkspace] = React.useState(
    workspaces[0]
  );

  const currentActiveWorkspace = activeWorkspace || localActiveWorkspace;

  if (!currentActiveWorkspace) {
    return null;
  }

  const handleWorkspaceClick = (workspace: any) => {
    if (onWorkspaceChange) {
      onWorkspaceChange(workspace);
    } else {
      setLocalActiveWorkspace(workspace);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <currentActiveWorkspace.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentActiveWorkspace.name}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id || workspace.name}
                onClick={() => handleWorkspaceClick(workspace)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <workspace.logo className="size-3.5 shrink-0" />
                </div>
                {workspace.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <a href="/workspace/create" className="flex items-center">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Add workspace
                </div>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
