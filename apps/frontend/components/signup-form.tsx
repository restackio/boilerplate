"use client"

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      // Create a temporary workspace for the user (they'll create their own later)
      const workspaceResult = await runWorkflow({
        workflowName: "WorkspacesCreateWorkflow",
        input: {
          name: "My Workspace",
        },
      });

      const workspaceData = await getWorkflowResult({
        workflowId: workspaceResult.workflowId,
        runId: workspaceResult.runId,
      });

      if (!workspaceData?.success || !workspaceData.data) {
        setError("Failed to create initial workspace");
        setIsLoading(false);
        return;
      }

      const workspace = workspaceData.data;

      // Create the user with the temporary workspace
      const result = await runWorkflow({
        workflowName: "UserSignupWorkflow",
        input: {
          workspace_id: workspace.id,
          name,
          email,
          password,
        },
      });

      const workflowResult = await getWorkflowResult({
        workflowId: result.workflowId,
        runId: result.runId,
      });

      if (workflowResult && workflowResult.success && workflowResult.user) {
        // Store user info in localStorage
        localStorage.setItem("currentUser", JSON.stringify(workflowResult.user));
        // Redirect to workspace creation page
        router.push("/workspace/create");
      } else {
        setError(workflowResult?.error || "Signup failed");
      }
    } catch (error) {
      void error; // Suppress unused warning
      setError("Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your details below to create your account
        </p>
      </div>
      <div className="grid gap-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        <div className="grid gap-3">
          <Label htmlFor="name">Name</Label>
          <Input 
            id="name" 
            type="text" 
            placeholder="John Doe" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required 
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="john@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input 
            id="confirmPassword" 
            type="password" 
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Log in
          </Link>
        </div>
      </div>
    </form>
  );
}
