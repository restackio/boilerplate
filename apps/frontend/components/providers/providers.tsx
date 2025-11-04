"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PostHogProvider } from "./posthog-provider";
import { DatabaseWorkspaceProvider } from "@/lib/database-workspace-context";

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <PostHogProvider>
      <DatabaseWorkspaceProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          {children}
        </NextThemesProvider>
      </DatabaseWorkspaceProvider>
    </PostHogProvider>
  );
}
