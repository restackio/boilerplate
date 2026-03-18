"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthForm, useAuthFormState } from "@workspace/ui/components";
import { executeWorkflow } from "@/app/actions/workflow";

export function ResetPasswordForm({
  token,
  className,
  ...props
}: React.ComponentProps<"form"> & { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    isLoading,
    error,
    startSubmission,
    finishSubmission,
    setSubmissionError,
  } = useAuthFormState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setSubmissionError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setSubmissionError("Password must be at least 6 characters.");
      return;
    }
    startSubmission();

    try {
      const result = await executeWorkflow("ResetPasswordWorkflow", {
        token,
        new_password: password,
      });

      if (result?.success) {
        setSuccess(true);
      } else {
        setSubmissionError(result?.error ?? "Something went wrong.");
      }
    } catch {
      setSubmissionError("Something went wrong. Please try again.");
    } finally {
      finishSubmission();
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Password reset</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Your password has been updated. You can now sign in with your new
            password.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const fields = [
    {
      id: "password",
      label: "New password",
      type: "password",
      placeholder: "••••••••",
      value: password,
      onChange: setPassword,
      required: true,
    },
    {
      id: "confirmPassword",
      label: "Confirm password",
      type: "password",
      placeholder: "••••••••",
      value: confirmPassword,
      onChange: setConfirmPassword,
      required: true,
    },
  ];

  return (
    <AuthForm
      title="Set new password"
      description="Enter your new password below."
      fields={fields}
      submitText="Reset password"
      loadingText="Resetting..."
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
