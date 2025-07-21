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
      <div className="border-b border-neutral-200 bg-white">
        <div className="px-4">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap",
                  tab.current
                    ? "border-neutral-500 text-neutral-600"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
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
