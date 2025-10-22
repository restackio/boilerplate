"use client";

import Link from "next/link";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, ReactNode } from "react";

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  additionalElement?: ReactNode; // For things like "Forgot password?" link
}

interface AuthFormProps extends React.ComponentProps<"form"> {
  /** Form title */
  title: string;
  /** Form description */
  description: string;
  /** Demo credentials info (optional) */
  demoInfo?: string;
  /** Form fields configuration */
  fields: FormField[];
  /** Submit button text */
  submitText: string;
  /** Loading submit text */
  loadingText: string;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error?: string;
  /** Submit handler */
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  /** Footer link */
  footerLink?: {
    text: string;
    linkText: string;
    href: string;
  };
  /** Additional form content */
  children?: ReactNode;
}

export function AuthForm({
  title,
  description,
  demoInfo,
  fields,
  submitText,
  loadingText,
  isLoading,
  error,
  onSubmit,
  footerLink,
  children,
  className,
  ...props
}: AuthFormProps) {
  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {description}
        </p>
        {demoInfo && (
          <p className="text-muted-foreground text-xs text-balance">
            {demoInfo}
          </p>
        )}
      </div>
      
      <div className="grid gap-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        {fields.map((field) => (
          <div key={field.id} className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor={field.id}>{field.label}</Label>
              {field.additionalElement}
            </div>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              required={field.required}
            />
          </div>
        ))}
        
        {children}
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? loadingText : submitText}
        </Button>
      </div>
      
      {footerLink && (
        <div className="text-center text-sm">
          {footerLink.text}{" "}
          <Link
            href={footerLink.href}
            className="underline underline-offset-4 hover:text-primary"
          >
            {footerLink.linkText}
          </Link>
        </div>
      )}
    </form>
  );
}

// Helper hook for auth form state management
export function useAuthFormState() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  return {
    isLoading,
    error,
    startSubmission,
    finishSubmission,
    setSubmissionError,
  };
}
