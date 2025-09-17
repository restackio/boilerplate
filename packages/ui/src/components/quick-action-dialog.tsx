"use client";

import React, { useState, ReactNode } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ArrowUp, X, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface QuickActionField {
  /** Field key */
  key: string;
  /** Field label */
  label: string;
  /** Field type */
  type: "text" | "textarea" | "email" | "url";
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Field description */
  description?: string;
  /** Default value */
  defaultValue?: string;
  /** Minimum rows for textarea */
  rows?: number;
  /** Maximum rows for textarea */
  maxRows?: number;
  /** Custom validation */
  validate?: (value: string) => string | null;
}

export interface QuickActionButton {
  /** Button key */
  key: string;
  /** Button label */
  label: string;
  /** Button icon */
  icon?: LucideIcon;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "destructive";
  /** Whether button is primary action */
  isPrimary?: boolean;
  /** Whether button requires form validation */
  requiresValidation?: boolean;
  /** Custom action handler */
  onClick?: (formData: Record<string, string>) => void | Promise<void>;
}

interface QuickActionDialogProps {
  /** Dialog open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description?: string;
  /** Form fields */
  fields?: QuickActionField[];
  /** Action buttons */
  actions?: QuickActionButton[];
  /** Primary action handler (for simple dialogs) */
  onPrimaryAction?: (formData: Record<string, string>) => void | Promise<void>;
  /** Primary action label */
  primaryActionLabel?: string;
  /** Primary action icon */
  primaryActionIcon?: LucideIcon;
  /** Whether dialog is loading */
  isLoading?: boolean;
  /** Loading state per action */
  loadingStates?: Record<string, boolean>;
  /** Custom content */
  children?: ReactNode;
  /** Dialog size */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether to close on success */
  closeOnSuccess?: boolean;
  /** Success callback */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (result?: any) => void;
  /** Error callback */
  onError?: (error: string) => void;
  /** Custom footer */
  footer?: ReactNode;
}

export function QuickActionDialog({
  isOpen,
  onClose,
  title,
  description,
  fields = [],
  actions = [],
  onPrimaryAction,
  primaryActionLabel = "Submit",
  primaryActionIcon = ArrowUp,
  isLoading = false,
  loadingStates = {},
  children,
  size = "md",
  closeOnSuccess = true,
  onSuccess,
  onError,
  footer,
}: QuickActionDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach(field => {
      initial[field.key] = field.defaultValue || "";
    });
    return initial;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [internalLoading, setInternalLoading] = useState(false);

  // Dialog size classes
  const sizeClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  };

  // Field change handler
  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear field error if it exists
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.key] || "";
      
      // Required field validation
      if (field.required && !value.trim()) {
        errors[field.key] = `${field.label} is required`;
        return;
      }

      // Custom validation
      if (field.validate && value.trim()) {
        const error = field.validate(value);
        if (error) {
          errors[field.key] = error;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Action handler
  const handleAction = async (action: QuickActionButton) => {
    if (action.requiresValidation && !validateForm()) {
      return;
    }

    try {
      setInternalLoading(true);
      await action.onClick?.(formData);
      
      if (closeOnSuccess) {
        handleClose();
      }
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Action failed";
      onError?.(errorMessage);
    } finally {
      setInternalLoading(false);
    }
  };

  // Primary action handler
  const handlePrimaryAction = async () => {
    if (!validateForm()) return;

    try {
      setInternalLoading(true);
      await onPrimaryAction?.(formData);
      
      if (closeOnSuccess) {
        handleClose();
      }
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Action failed";
      onError?.(errorMessage);
    } finally {
      setInternalLoading(false);
    }
  };

  // Keyboard handler for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (onPrimaryAction) {
        handlePrimaryAction();
      } else if (actions.length > 0) {
        const primaryAction = actions.find(a => a.isPrimary) || actions[0];
        handleAction(primaryAction);
      }
    }
  };

  // Close handler
  const handleClose = () => {
    if (!isLoading && !internalLoading) {
      // Reset form data
      const initial: Record<string, string> = {};
      fields.forEach(field => {
        initial[field.key] = field.defaultValue || "";
      });
      setFormData(initial);
      setFieldErrors({});
      onClose();
    }
  };

  const isFormLoading = isLoading || internalLoading;
  const primaryAction = actions.find(a => a.isPrimary);
  const secondaryActions = actions.filter(a => !a.isPrimary);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(sizeClasses[size], "max-h-[90vh] flex flex-col")}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isFormLoading}
              className="h-6 w-6 p-0 flex-shrink-0 ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4">
            {/* Custom content */}
            {children}

            {/* Form fields */}
            {fields.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={formData[field.key] || ""}
                onChange={(value) => handleFieldChange(field.key, value)}
                error={fieldErrors[field.key]}
                disabled={isFormLoading}
                onKeyDown={field.type === "textarea" ? handleKeyDown : undefined}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t">
          {footer || (
            <div className="flex justify-between">
              {/* Secondary actions */}
              <div className="flex space-x-2">
                {secondaryActions.map((action) => {
                  const Icon = action.icon;
                  const isActionLoading = loadingStates[action.key] || isFormLoading;
                  
                  return (
                    <Button
                      key={action.key}
                      variant={action.variant || "outline"}
                      onClick={() => handleAction(action)}
                      disabled={isActionLoading}
                      className="flex items-center space-x-2"
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        Icon && <Icon className="h-4 w-4" />
                      )}
                      <span>{action.label}</span>
                    </Button>
                  );
                })}
              </div>
              
              {/* Primary actions */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isFormLoading}
                >
                  Cancel
                </Button>
                
                {primaryAction ? (
                  <Button
                    onClick={() => handleAction(primaryAction)}
                    disabled={loadingStates[primaryAction.key] || isFormLoading}
                    className="flex items-center space-x-2"
                  >
                    {loadingStates[primaryAction.key] || isFormLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      primaryAction.icon && <primaryAction.icon className="h-4 w-4" />
                    )}
                    <span>{primaryAction.label}</span>
                  </Button>
                ) : onPrimaryAction && (
                  <Button
                    onClick={handlePrimaryAction}
                    disabled={isFormLoading}
                    className="flex items-center space-x-2"
                  >
                    {isFormLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      primaryActionIcon && React.createElement(primaryActionIcon, { className: "h-4 w-4" })
                    )}
                    <span>{primaryActionLabel}</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Form field component
interface FormFieldProps {
  field: QuickActionField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

function FormField({
  field,
  value,
  onChange,
  error,
  disabled,
  onKeyDown,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {field.type === "textarea" ? (
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(
            "resize-none",
            error && "border-destructive",
            field.maxRows && "max-h-[200px]"
          )}
          rows={field.rows || 4}
          disabled={disabled}
          onKeyDown={onKeyDown}
        />
      ) : (
        <Input
          id={field.key}
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={error ? "border-destructive" : ""}
          disabled={disabled}
        />
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {field.description && !error && (
        <p className="text-xs text-muted-foreground">
          {field.description}
        </p>
      )}
    </div>
  );
}

// Hook for managing quick action dialog state
export function useQuickActionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setIsOpen(true);
    setError(null);
  };

  const close = () => {
    setIsOpen(false);
    setError(null);
    setIsLoading(false);
  };

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleSuccess = () => {
    setError(null);
    setIsLoading(false);
  };

  return {
    isOpen,
    isLoading,
    error,
    open,
    close,
    startLoading,
    stopLoading,
    handleError,
    handleSuccess,
  };
}

// Common field configurations
export const commonFields = {
  title: (required = true): QuickActionField => ({
    key: "title",
    label: "Title",
    type: "text",
    placeholder: "Enter a title...",
    required,
  }),
  
  description: (required = false): QuickActionField => ({
    key: "description",
    label: "Description", 
    type: "textarea",
    placeholder: "Enter a description...",
    required,
    rows: 4,
  }),

  message: (required = true): QuickActionField => ({
    key: "message",
    label: "Message",
    type: "textarea", 
    placeholder: "Enter your message...",
    required,
    rows: 6,
  }),

  email: (required = true): QuickActionField => ({
    key: "email",
    label: "Email",
    type: "email",
    placeholder: "user@example.com",
    required,
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : "Please enter a valid email address";
    },
  }),

  url: (required = true): QuickActionField => ({
    key: "url",
    label: "URL",
    type: "url",
    placeholder: "https://example.com",
    required,
    validate: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return "Please enter a valid URL";
      }
    },
  }),
};
