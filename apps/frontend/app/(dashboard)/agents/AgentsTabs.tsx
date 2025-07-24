"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";

export default function AgentsTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Agents",
      href: "/agents",
      current: pathname === "/agents",
    },
    {
      name: "MCPs",
      href: "/agents/mcps",
      current: pathname.startsWith("/agents/mcps"),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Sub-navigation */}
      <div className="border-b border-border bg-background">
        <div className="px-4">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors",
                  tab.current
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
