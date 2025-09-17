"use client";

import { cn } from "../lib/utils";

interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display name */
  name: string;
  /** Navigation href */
  href: string;
  /** Whether this tab is currently active */
  current: boolean;
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Badge count or text */
  badge?: string | number;
}

interface NavigationTabsProps {
  /** Array of tab configurations */
  tabs: TabItem[];
  /** Custom className */
  className?: string;
  /** Link component to use (defaults to 'a') */
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
  /** Tab size variant */
  size?: "sm" | "md" | "lg";
  /** Tab style variant */
  variant?: "underline" | "pills" | "background";
}

const sizeStyles = {
  sm: "py-2 px-1 text-xs",
  md: "py-4 px-1 text-sm", 
  lg: "py-6 px-2 text-base",
};

const variantStyles = {
  underline: {
    container: "border-b border-border bg-background",
    nav: "-mb-px flex space-x-8",
    tab: "border-b-2 font-medium whitespace-nowrap transition-colors",
    active: "border-primary text-foreground",
    inactive: "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
    disabled: "border-transparent text-muted-foreground/50 cursor-not-allowed",
  },
  pills: {
    container: "bg-muted p-1 rounded-lg",
    nav: "flex space-x-1",
    tab: "rounded-md font-medium whitespace-nowrap transition-colors px-3 py-1.5",
    active: "bg-background text-foreground shadow-sm",
    inactive: "text-muted-foreground hover:text-foreground hover:bg-background/50",
    disabled: "text-muted-foreground/50 cursor-not-allowed",
  },
  background: {
    container: "bg-muted/30 rounded-lg",
    nav: "flex space-x-1 p-1",
    tab: "rounded-md font-medium whitespace-nowrap transition-colors px-4 py-2",
    active: "bg-background text-foreground shadow-sm",
    inactive: "text-muted-foreground hover:text-foreground hover:bg-background/50",
    disabled: "text-muted-foreground/50 cursor-not-allowed",
  },
};

export function NavigationTabs({
  tabs,
  className = "",
  LinkComponent,
  size = "md",
  variant = "underline",
}: NavigationTabsProps) {
  const styles = variantStyles[variant];
  const sizeClass = sizeStyles[size];

  const renderTabContent = (tab: TabItem) => (
    <>
      {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
      <span>{tab.name}</span>
      {tab.badge && (
        <span className="ml-2 px-2 py-0.5 text-xs bg-muted-foreground/10 text-muted-foreground rounded-full">
          {tab.badge}
        </span>
      )}
    </>
  );

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      <div className={styles.container}>
        <div className="px-4">
          <nav className={styles.nav}>
            {tabs.map((tab) => {
              const tabClasses = cn(
                styles.tab,
                sizeClass,
                tab.disabled 
                  ? styles.disabled
                  : tab.current 
                    ? styles.active 
                    : styles.inactive,
                tab.icon && "flex items-center"
              );

              if (tab.disabled) {
                return (
                  <span key={tab.id} className={tabClasses}>
                    {renderTabContent(tab)}
                  </span>
                );
              }

              return (
                <LinkComponent
                  key={tab.id}
                  href={tab.href}
                  className={tabClasses}
                >
                  {renderTabContent(tab)}
                </LinkComponent>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

// Utility function to create tab configurations
export function createTabsFromRoutes(
  routes: Array<{
    name: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
    badge?: string | number;
  }>,
  currentPath: string
): TabItem[] {
  return routes.map((route, index) => ({
    id: route.href || index.toString(),
    name: route.name,
    href: route.href,
    current: currentPath === route.href || currentPath.startsWith(route.href + "/"),
    icon: route.icon,
    disabled: route.disabled,
    badge: route.badge,
  }));
}

