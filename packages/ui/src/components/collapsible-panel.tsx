"use client";

import { useState, ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface CollapsibleTab {
  /** Tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Tab content */
  content: ReactNode;
  /** Tab icon */
  icon?: LucideIcon;
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Badge count or text */
  badge?: string | number;
}

interface CollapsiblePanelProps {
  /** Whether panel is collapsed */
  isCollapsed: boolean;
  /** Toggle collapse handler */
  onToggleCollapse: () => void;
  /** Panel title */
  title?: string;
  /** Panel subtitle */
  subtitle?: string;
  /** Panel content (when not using tabs) */
  children?: ReactNode;
  /** Tabs configuration */
  tabs?: CollapsibleTab[];
  /** Active tab */
  activeTab?: string;
  /** Tab change handler */
  onTabChange?: (tabId: string) => void;
  /** Panel width when expanded */
  expandedWidth?: string;
  /** Panel width when collapsed */
  collapsedWidth?: string;
  /** Collapse direction */
  direction?: "horizontal" | "vertical";
  /** Collapse position */
  position?: "left" | "right" | "top" | "bottom";
  /** Show border */
  showBorder?: boolean;
  /** Background variant */
  background?: "default" | "muted" | "card";
  /** Transition duration */
  transitionDuration?: string;
  /** Additional className */
  className?: string;
  /** Collapse button variant */
  collapseButtonVariant?: "ghost" | "outline" | "default";
  /** Collapse button size */
  collapseButtonSize?: "sm" | "default" | "lg";
}

export function CollapsiblePanel({
  isCollapsed,
  onToggleCollapse,
  title,
  subtitle,
  children,
  tabs,
  activeTab,
  onTabChange,
  expandedWidth = "w-1/3",
  collapsedWidth = "w-12",
  direction = "horizontal",
  position = "left",
  showBorder = true,
  background = "muted",
  transitionDuration = "duration-300",
  className,
  collapseButtonVariant = "ghost",
  collapseButtonSize = "sm",
}: CollapsiblePanelProps) {
  // Determine panel dimensions and classes
  const panelWidth = isCollapsed ? collapsedWidth : expandedWidth;
  const panelHeight = direction === "vertical" ? (isCollapsed ? "h-12" : "h-1/3") : "h-full";
  
  const backgroundClass = {
    default: "bg-background",
    muted: "bg-muted/30",
    card: "bg-card",
  }[background];

  const borderClass = showBorder ? {
    left: "border-r",
    right: "border-l", 
    top: "border-b",
    bottom: "border-t",
  }[position] : "";

  // Collapse icon based on direction and position
  const getCollapseIcon = () => {
    if (direction === "horizontal") {
      if (position === "left") {
        return isCollapsed ? ChevronRight : ChevronLeft;
      } else {
        return isCollapsed ? ChevronLeft : ChevronRight;
      }
    } else {
      if (position === "top") {
        return isCollapsed ? ChevronDown : ChevronUp;
      } else {
        return isCollapsed ? ChevronUp : ChevronDown;
      }
    }
  };

  const CollapseIcon = getCollapseIcon();

  return (
    <div 
      className={cn(
        "flex flex-col transition-all",
        direction === "horizontal" ? panelWidth : panelHeight,
        backgroundClass,
        borderClass,
        transitionDuration,
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4",
        showBorder && "border-b bg-background"
      )}>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="font-semibold truncate">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        )}
        
        <Button
          variant={collapseButtonVariant}
          size={collapseButtonSize}
          onClick={onToggleCollapse}
          className={cn(
            "flex-shrink-0",
            collapseButtonSize === "sm" && "h-6 w-6 p-0",
            !isCollapsed && "ml-4"
          )}
          title={isCollapsed ? "Expand panel" : "Collapse panel"}
        >
          <CollapseIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-auto">
          {tabs ? (
            <TabbedContent
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          ) : (
            <div className="p-4">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tabbed content component
interface TabbedContentProps {
  tabs: CollapsibleTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabsClassName?: string;
  contentClassName?: string;
}

function TabbedContent({
  tabs,
  activeTab,
  onTabChange,
  tabsClassName,
  contentClassName,
}: TabbedContentProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    activeTab || tabs[0]?.id || ""
  );

  const currentTab = activeTab || internalActiveTab;

  const handleTabChange = (tabId: string) => {
    setInternalActiveTab(tabId);
    onTabChange?.(tabId);
  };

  if (tabs.length === 0) return null;

  return (
    <Tabs 
      value={currentTab} 
      onValueChange={handleTabChange} 
      className="h-full flex flex-col"
    >
      <div className={cn("px-4 pt-4", tabsClassName)}>
        <TabsList className={cn(
          "grid w-full",
          tabs.length <= 4 && `grid-cols-${tabs.length}`
        )}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="text-xs flex items-center gap-1"
              >
                {Icon && <Icon className="h-3 w-3" />}
                <span className="truncate">{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <div className={cn("flex-1 px-4 pb-4", contentClassName)}>
        {tabs.map((tab) => (
          <TabsContent 
            key={tab.id} 
            value={tab.id} 
            className="mt-4 h-full overflow-auto"
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

// Card-based collapsible panel variant
interface CollapsibleCardProps {
  /** Whether card is collapsed */
  isCollapsed: boolean;
  /** Toggle collapse handler */
  onToggleCollapse: () => void;
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Card content */
  children: ReactNode;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional className */
  className?: string;
  /** Header actions */
  headerActions?: ReactNode;
}

export function CollapsibleCard({
  isCollapsed,
  onToggleCollapse,
  title,
  description,
  children,
  className,
  headerActions,
}: CollapsibleCardProps) {
  return (
    <Card className={className}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm flex items-center gap-2">
              {title}
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          
          {headerActions && (
            <div className="flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// Hook for managing collapsible state
export function useCollapsiblePanel(defaultCollapsed = false) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggle = () => setIsCollapsed(prev => !prev);
  const collapse = () => setIsCollapsed(true);
  const expand = () => setIsCollapsed(false);

  return {
    isCollapsed,
    setIsCollapsed,
    toggle,
    collapse,
    expand,
  };
}

// Hook for managing multi-panel layouts
export function useMultiPanelLayout(panels: string[]) {
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());

  const togglePanel = (panelId: string) => {
    setCollapsedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  };

  const collapsePanel = (panelId: string) => {
    setCollapsedPanels(prev => new Set(prev).add(panelId));
  };

  const expandPanel = (panelId: string) => {
    setCollapsedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
  };

  const collapseAll = () => {
    setCollapsedPanels(new Set(panels));
  };

  const expandAll = () => {
    setCollapsedPanels(new Set());
  };

  const isPanelCollapsed = (panelId: string) => collapsedPanels.has(panelId);

  return {
    collapsedPanels,
    togglePanel,
    collapsePanel,
    expandPanel,
    collapseAll,
    expandAll,
    isPanelCollapsed,
  };
}
