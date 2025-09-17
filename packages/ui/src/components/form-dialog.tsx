"use client";

import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface FormDialogProps {
  /** Dialog trigger element */
  trigger?: ReactNode;
  /** Whether dialog is open (controlled mode) */
  open?: boolean;
  /** Open change handler (controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Form content */
  children: ReactNode;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Loading submit text */
  loadingText?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Submit handler */
  onSubmit?: () => void | Promise<void>;
  /** Cancel handler */
  onCancel?: () => void;
  /** Success handler (called after successful submit) */
  onSuccess?: () => void;
  /** Custom footer */
  customFooter?: ReactNode;
  /** Dialog size */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Hide default footer */
  hideFooter?: boolean;
  /** Additional submit button props */
  submitButtonProps?: {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    disabled?: boolean;
  };
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md", 
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  full: "sm:max-w-full",
};

export function FormDialog({
  trigger,
  open,
  onOpenChange,
  title,
  children,
  submitText = "Submit",
  cancelText = "Cancel",
  loadingText,
  isLoading = false,
  onSubmit,
  onCancel,
  onSuccess,
  customFooter,
  size = "lg",
  hideFooter = false,
  submitButtonProps = {},
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled mode
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleSubmit = async () => {
    if (onSubmit) {
      try {
        await onSubmit();
        onSuccess?.();
        // Close dialog on success if in uncontrolled mode
        if (open === undefined) {
          setIsOpen(false);
        }
      } catch (error) {
        // Error handling is left to the parent component
        console.error('Form submission error:', error);
      }
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  const displayLoadingText = loadingText || `${submitText}...`;
  const isSubmitDisabled = isLoading || submitButtonProps.disabled;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className={cn(sizeClasses[size])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {children}
        </div>

        {!hideFooter && (customFooter || (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              {...submitButtonProps}
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {displayLoadingText}
                </>
              ) : (
                submitText
              )}
            </Button>
          </DialogFooter>
        ))}
      </DialogContent>
    </Dialog>
  );
}

// Specialized form dialog variants
export function CreateDialog({
  trigger,
  itemType = "item",
  ...props
}: Omit<FormDialogProps, 'title' | 'submitText' | 'loadingText'> & {
  itemType?: string;
  trigger?: ReactNode;
}) {
  return (
    <FormDialog
      trigger={trigger}
      title={`Create ${itemType}`}
      submitText={`Create ${itemType}`}
      loadingText="Creating..."
      {...props}
    />
  );
}

export function EditDialog({
  itemType = "item",
  ...props
}: Omit<FormDialogProps, 'title' | 'submitText' | 'loadingText'> & {
  itemType?: string;
}) {
  return (
    <FormDialog
      title={`Edit ${itemType}`}
      submitText="Save changes"
      loadingText="Saving..."
      {...props}
    />
  );
}

export function SetupDialog({
  itemType = "setup",
  ...props
}: Omit<FormDialogProps, 'title' | 'submitText' | 'loadingText'> & {
  itemType?: string;
}) {
  return (
    <FormDialog
      title={`${itemType} setup`}
      submitText="Complete setup"
      loadingText="Setting up..."
      size="xl"
      {...props}
    />
  );
}

// Hook for form dialog state management
export function useFormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => {
    setIsOpen(false);
    setError("");
  };

  const startSubmission = () => {
    setIsLoading(true);
    setError("");
  };

  const finishSubmission = () => {
    setIsLoading(false);
  };

  const setSubmissionError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleSuccess = () => {
    setIsLoading(false);
    setError("");
    setIsOpen(false);
  };

  return {
    isOpen,
    isLoading,
    error,
    openDialog,
    closeDialog,
    startSubmission,
    finishSubmission,
    setSubmissionError,
    handleSuccess,
  };
}

