"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthForm, useAuthFormState } from "@workspace/ui/components";
import { executeWorkflow } from "@/app/actions/workflow";
import { posthog } from "@/lib/posthog";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {
    isLoading,
    error,
    startSubmission,
    finishSubmission,
    setSubmissionError,
  } = useAuthFormState();
  const rawReturnTo = searchParams.get("returnTo");
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/dashboard";
  const signupHref = `/signup${returnTo !== "/dashboard" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startSubmission();

    try {
      const workflowResult = await executeWorkflow("UserLoginWorkflow", {
        email,
        password,
      });

      if (
        workflowResult &&
        workflowResult.success &&
        workflowResult.data &&
        workflowResult.data.user
      ) {
        const user = workflowResult.data.user as { id: string; email?: string; name?: string };
        // Identify user in PostHog for analytics
        posthog.identify(user.id, {
          email: user.email,
          name: user.name,
        });
        // Store user info in localStorage
        localStorage.setItem(
          "currentUser",
          JSON.stringify(workflowResult.data.user),
        );
        window.location.href = returnTo;
      } else {
        setSubmissionError(
          workflowResult?.error ||
            workflowResult?.data?.error ||
            "Invalid email or password",
        );
      }
    } catch (error) {
      void error; // Suppress unused warning
      setSubmissionError("Login failed. Please try again.");
    } finally {
      finishSubmission();
    }
  };

  const forgotPasswordLink = (
    <Link
      href="/forgot-password"
      className="ml-auto text-sm text-primary underline underline-offset-4 hover:text-primary/80"
    >
      Forgot password?
    </Link>
  );

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
    {
      id: "password",
      label: "Password",
      type: "password",
      placeholder: "********",
      value: password,
      onChange: setPassword,
      required: true,
      additionalElement: forgotPasswordLink,
    },
  ];

  return (
    <AuthForm
      title="Log in"
      description="Enter details below to log in."
      fields={fields}
      submitText="Log in"
      loadingText="Logging in..."
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
      footerLink={{
        text: "Don't have an account?",
        linkText: "Sign up",
        href: signupHref,
      }}
      className={className}
      {...props}
    />
  );
}
