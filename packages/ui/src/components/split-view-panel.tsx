"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

interface SplitViewTab {
  /** Unique tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Tab content */
  content: ReactNode;
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Badge count or text */
  badge?: string | number;
}

interface SplitViewPanelProps {
  /** Whether split view is shown */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Panel title */
  title?: string;
  /** Panel subtitle */
  subtitle?: string;
  /** Tabs configuration */
  tabs?: SplitViewTab[];
  /** Active tab */
  activeTab?: string;
  /** Tab change handler */
  onTabChange?: (tabId: string) => void;
  /** Panel content (when not using tabs) */
  children?: ReactNode;
  /** Panel width */
  width?: string;
  /** Custom className */
  className?: string;
  /** Panel position */
  position?: "left" | "right";
  /** Header actions */
  headerActions?: ReactNode;
  /** Show as overlay */
  overlay?: boolean;
}

export function SplitViewPanel({
  isOpen,
  onClose,
  tabs,
  activeTab,
  onTabChange,
  children,
  width = "w-4/5",
  className,
  position = "right",
  headerActions,
  overlay = false,
}: SplitViewPanelProps) {
  if (!isOpen) return null;

  const panelContent = (
    <div className={cn(
      "bg-muted/50 min-h-screen border-l",
      width,
      position === "left" && "border-r border-l-0",
      overlay && "absolute inset-y-0 right-0 z-40 shadow-lg",
      className
    )}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-start">
          
          <div className="flex items-end gap-2">
            {headerActions}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
              Close panel
            </Button>
          </div>
        </div>

        {/* Content */}
        {tabs ? (
          <Tabs
            value={activeTab}
            onValueChange={onTabChange}
            className="w-full"
          >
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={tab.disabled}
                  className="flex items-center gap-2"
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded">
                      {tab.badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          children
        )}
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        {panelContent}
      </div>
    );
  }

  return panelContent;
}

// Specialized split view variants
export function DetailPanel({
  isOpen,
  onClose,
  item,
  title,
  detailsRenderer,
  tabs,
  ...props
}: Omit<SplitViewPanelProps, 'tabs' | 'children'> & {
  item?: any;
  detailsRenderer?: (item: any) => ReactNode;
  tabs?: SplitViewTab[];
}) {
  const detailsTab: SplitViewTab = {
    id: 'details',
    label: 'Details',
    content: item ? (
      detailsRenderer ? detailsRenderer(item) : (
        <DetailCard item={item} />
      )
    ) : (
      <div />
    )
  };

  const allTabs = [detailsTab, ...(tabs || [])];

  return (
    <SplitViewPanel
      isOpen={isOpen}
      onClose={onClose}
      tabs={allTabs}
      {...props}
    />
  );
}

// Helper components for common detail patterns
function DetailCard({ item }: { item: any }) {
  if (!item) return <div />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Item Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        <DetailField label="Type" value={item.type} />
        <DetailField label="Status" value={item.status} />
        <DetailField label="ID" value={item.id} className="font-mono text-xs" />
        
        {/* Timestamp */}
        {item.timestamp && (
          <DetailField 
            label="Created" 
            value={new Date(item.timestamp).toLocaleString()} 
          />
        )}

        {/* Raw Data */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Raw Data
          </summary>
          <pre className="text-xs overflow-auto max-h-64 bg-muted p-2 rounded mt-2 whitespace-pre-wrap break-words">
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

function DetailField({ 
  label, 
  value, 
  className 
}: { 
  label: string; 
  value: any; 
  className?: string;
}) {
  if (value === undefined || value === null) return null;

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <p className={cn("text-sm mt-1", className)}>
        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
      </p>
    </div>
  );
}

// Hook for split view state management
export function useSplitView() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('details');

  const openPanel = (item?: any) => {
    if (item) setSelectedItem(item);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setSelectedItem(null);
  };

  const selectItem = (item: any) => {
    setSelectedItem(item);
    if (!isOpen) setIsOpen(true);
  };

  return {
    isOpen,
    selectedItem,
    activeTab,
    setActiveTab,
    openPanel,
    closePanel,
    selectItem,
  };
}
