"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavigationTabs, createTabsFromRoutes } from "@workspace/ui/components";

export default function TasksTabs() {
  const pathname = usePathname();

  const routes = [
    {
      name: "Tasks",
      href: "/tasks",
    },
    {
      name: "Schedules",
      href: "/tasks/schedules",
    },
  ];

  const tabs = createTabsFromRoutes(routes, pathname);

  return (
    <NavigationTabs
      tabs={tabs}
      LinkComponent={Link}
      variant="underline"
      size="md"
    />
  );
}
