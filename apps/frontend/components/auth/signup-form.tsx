"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm, useAuthFormState } from "@workspace/ui/components";
import { executeWorkflow } from "@/app/actions/workflow";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { isLoading, error, startSubmission, finishSubmission, setSubmissionError } = useAuthFormState();
  const router = useRouter();

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
      // Create a temporary workspace for the user (they'll create their own later)
      const workspaceData = await executeWorkflow("WorkspacesCreateWorkflow", {
        name: "My Workspace",
      });

      if (!workspaceData.success || !workspaceData.data) {
        setSubmissionError("Failed to create initial workspace");
        return;
      }

      const workspace = workspaceData.data;

      // Create the user with the temporary workspace
      const workflowResult = await executeWorkflow("UserSignupWorkflow", {
        workspace_id: workspace.id,
        name,
        email,
        password,
      });

      if (workflowResult && workflowResult.success && workflowResult.data) {
        // Store user info in localStorage
        localStorage.setItem("currentUser", JSON.stringify(workflowResult.data));
        // Redirect to workspace creation page
        router.push("/workspace/create");
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
      id: "name",
      label: "Name",
      type: "text",
      placeholder: "John Doe",
      value: name,
      onChange: setName,
      required: true,
    },
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
      placeholder: "Enter your password",
      value: password,
      onChange: setPassword,
      required: true,
    },
    {
      id: "confirmPassword",
      label: "Confirm Password",
      type: "password",
      placeholder: "Confirm your password",
      value: confirmPassword,
      onChange: setConfirmPassword,
      required: true,
    },
  ];

  return (
    <AuthForm
      title="Create your account"
      description="Enter your details below to create your account"
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
      className={className}
      {...props}
    />
  );
}
