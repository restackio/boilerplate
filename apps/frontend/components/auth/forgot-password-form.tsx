"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthForm, useAuthFormState } from "@workspace/ui/components";
import { executeWorkflow } from "@/app/actions/workflow";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const {
    isLoading,
    error,
    startSubmission,
    finishSubmission,
    setSubmissionError,
  } = useAuthFormState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startSubmission();

    try {
      const result = await executeWorkflow("RequestPasswordResetWorkflow", {
        email,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      });

      if (result?.success) {
        setSubmitted(true);
      } else {
        setSubmissionError(result?.error ?? "Something went wrong.");
      }
    } catch {
      setSubmissionError("Something went wrong. Please try again.");
    } finally {
      finishSubmission();
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground text-sm text-balance">
            If an account exists for {email}, we&apos;ve sent a link to reset
            your password.
          </p>
        </div>
        <div className="text-center text-sm">
          <Link href="/login" className="text-primary underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  const fields = [
    {
      id: "email",
      label: "Email",
      type: "email",
      placeholder: "user@example.com",
      value: email,
      onChange: setEmail,
      required: true,
    },
  ];

  return (
    <AuthForm
      title="Forgot password?"
      description="Enter your email and we'll send you a link to reset your password."
      fields={fields}
      submitText="Send reset link"
      loadingText="Sending..."
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
      footerLink={{
        text: "Remember password?",
        linkText: "Back to log in",
        href: "/login",
      }}
      className={className}
      {...props}
    />
  );
}
