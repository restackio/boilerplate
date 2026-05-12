"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm, useAuthFormState } from "@workspace/ui/components";
import { executeWorkflow } from "@/app/actions/workflow";
import { posthog } from "@/lib/posthog";

const TERMS_URL = "https://www.restack.io/terms";
const PRIVACY_URL = "https://www.restack.io/privacy";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const {
    isLoading,
    error,
    startSubmission,
    finishSubmission,
    setSubmissionError,
  } = useAuthFormState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get("returnTo");
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startSubmission();

    // Validate passwords match
    if (password !== confirmPassword) {
      setSubmissionError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setSubmissionError("Password must be at least 6 characters long");
      return;
    }

    try {
      // Create the user (without workspace)
      const workflowResult = await executeWorkflow("UserSignupWorkflow", {
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
        // Redirect back to invite flow when provided; otherwise go create workspace.
        router.push(returnTo ?? "/workspace/create");
      } else {
        setSubmissionError(workflowResult?.error || "Signup failed");
      }
    } catch (error) {
      void error; // Suppress unused warning
      setSubmissionError("Signup failed. Please try again.");
    } finally {
      finishSubmission();
    }
  };

  const fields = [
    {
      id: "email",
      label: "Email",
      type: "email",
      placeholder: "john@example.com",
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
    },
    {
      id: "confirmPassword",
      label: "Confirm password",
      type: "password",
      placeholder: "********",
      value: confirmPassword,
      onChange: setConfirmPassword,
      required: true,
    },
  ];

  return (
    <AuthForm
      title="Sign up"
      description="Enter details below to create an account."
      fields={fields}
      submitText="Create account"
      loadingText="Creating account..."
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
      footerLink={{
        text: "Already have an account?",
        linkText: "Log in",
        href: "/login",
      }}
      footerBottom={
        <p className="text-xs text-muted-foreground">
          By signing up, I acknowledge I read and agree to Restack{" "}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </a>
          .
        </p>
      }
      className={className}
      {...props}
    />
  );
}
