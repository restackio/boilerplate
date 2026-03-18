"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState, ReactNode } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
  /** Content below the footer link (e.g. terms/privacy) */
  footerBottom?: ReactNode;
  /** Additional form content (above submit button) */
  children?: ReactNode;
}

export function AuthForm({
  title,
  description,
  fields,
  submitText,
  loadingText,
  isLoading,
  error,
  onSubmit,
  footerLink,
  footerBottom,
  children,
  className,
  ...props
}: AuthFormProps) {
  const [passwordVisible, setPasswordVisible] = useState<
    Record<string, boolean>
  >({});

  const togglePasswordVisibility = (fieldId: string) => {
    setPasswordVisible((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={onSubmit}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {/* <p className="text-muted-foreground text-sm text-balance">
          {description}
        </p> */}
      </div>

      <div className="grid gap-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {fields.map((field) => {
          const isPassword = field.type === "password";
          const inputType =
            isPassword && passwordVisible[field.id] ? "text" : field.type;
          return (
            <div key={field.id} className="grid gap-3">
              <div className="flex items-center">
                <Label htmlFor={field.id}>{field.label}</Label>
                {field.additionalElement}
              </div>
              <div className="relative">
                <Input
                  id={field.id}
                  type={inputType}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  required={field.required}
                  autoComplete={field.type}
                  className={isPassword ? "pr-10" : undefined}
                />
                {isPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility(field.id)}
                    aria-label={
                      passwordVisible[field.id]
                        ? "Hide password"
                        : "Show password"
                    }
                    tabIndex={-1}
                  >
                    {passwordVisible[field.id] ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

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

      {footerBottom && (
        <div className="mt-5 pt-5 border-t border-border/40 text-center">
          {footerBottom}
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
