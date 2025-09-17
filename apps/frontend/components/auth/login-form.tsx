"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm, useAuthFormState } from "@workspace/ui/components";
import { executeWorkflow } from "@/app/actions/workflow";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { isLoading, error, startSubmission, finishSubmission, setSubmissionError } = useAuthFormState();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startSubmission();

    try {
      const workflowResult = await executeWorkflow("UserLoginWorkflow", {
        email,
        password,
      });

      console.log("Login workflow result:", workflowResult);

      if (workflowResult && workflowResult.success && workflowResult.data && workflowResult.data.user) {
        // Store user info in localStorage
        localStorage.setItem("currentUser", JSON.stringify(workflowResult.data.user));
        router.push("/dashboard");
      } else {
        console.log("Login failed - checking conditions:", {
          hasWorkflowResult: !!workflowResult,
          workflowSuccess: workflowResult?.success,
          hasData: !!workflowResult?.data,
          hasUser: !!workflowResult?.data?.user,
          error: workflowResult?.error || workflowResult?.data?.error
        });
        setSubmissionError(workflowResult?.error || workflowResult?.data?.error || "Invalid email or password");
      }
    } catch (error) {
      void error; // Suppress unused warning
      setSubmissionError("Login failed. Please try again.");
    } finally {
      finishSubmission();
    }
  };

  const forgotPasswordLink = (
    <a
      href="#"
      className="ml-auto text-sm underline-offset-4 hover:underline"
    >
      Forgot your password?
    </a>
  );

  const fields = [
    {
      id: "email",
      label: "Email",
      type: "email",
      placeholder: "demo@example.com",
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
      additionalElement: forgotPasswordLink,
    },
  ];

  return (
    <AuthForm
      title="Login to your account"
      description="Enter your email below to login to your account"
      demoInfo="Demo: demo@example.com / password"
      fields={fields}
      submitText="Login"
      loadingText="Logging in..."
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
      footerLink={{
        text: "Don't have an account?",
        linkText: "Sign up",
        href: "/signup",
      }}
      className={className}
      {...props}
    />
  );
}
