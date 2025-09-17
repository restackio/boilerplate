"use client";

import { ReactNode } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";

type ConfirmationVariant = "destructive" | "warning" | "info";

interface WarningBox {
  title?: string;
  description: string;
  variant?: "muted" | "warning";
}

interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm action handler */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Main description */
  description: string | ReactNode;
  /** Visual variant */
  variant?: ConfirmationVariant;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Loading button text */
  loadingText?: string;
  /** Warning boxes to display */
  warnings?: WarningBox[];
  /** Custom icon */
  icon?: ReactNode;
}

const variantConfig = {
  destructive: {
    icon: AlertTriangle,
    iconColor: "text-destructive",
    confirmVariant: "destructive" as const,
  },
  warning: {
    icon: ShieldAlert,
    iconColor: "text-yellow-600",
    confirmVariant: "default" as const,
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600",
    confirmVariant: "default" as const,
  },
};

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = "info",
  cancelText = "Cancel",
  confirmText = "Confirm",
  isLoading = false,
  loadingText,
  warnings = [],
  icon,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = icon ? null : config.icon;
  const displayLoadingText = loadingText || `${confirmText}...`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon || (IconComponent && <IconComponent className={`h-5 w-5 ${config.iconColor}`} />)}
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <div>{description}</div>
              
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md ${
                    warning.variant === "warning" 
                      ? "bg-yellow-50 border border-yellow-200" 
                      : "bg-muted"
                  }`}
                >
                  {warning.title && (
                    <p className="text-sm font-medium mb-1">{warning.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {warning.description}
                  </p>
                </div>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {displayLoadingText}
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to create common confirmation dialog configurations
export const createConfirmationConfig = {
  delete: (itemName: string, itemType: string = "item") => ({
    title: `Delete ${itemType}`,
    description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    variant: "destructive" as const,
    confirmText: `Delete ${itemType}`,
    loadingText: "Deleting...",
  }),
  
  archive: (itemName: string, itemType: string = "item") => ({
    title: `Archive ${itemType}`,
    description: `Are you sure you want to archive "${itemName}"?`,
    variant: "warning" as const,
    confirmText: "Archive",
    loadingText: "Archiving...",
    warnings: [
      {
        description: `Archived ${itemType}s are hidden from the main list but can be restored later. No data is permanently lost.`,
      },
    ],
  }),
  
  discard: (itemType: string = "changes") => ({
    title: `Discard ${itemType}`,
    description: `Are you sure you want to discard your ${itemType}? This action cannot be undone.`,
    variant: "warning" as const,
    confirmText: "Discard",
    loadingText: "Discarding...",
  }),
};

