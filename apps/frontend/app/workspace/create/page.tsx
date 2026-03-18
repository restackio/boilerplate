"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Building, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { executeWorkflow } from "@/app/actions/workflow";

interface FormData {
  name: string;
  openaiApiKey: string;
}

export default function CreateWorkspacePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const { setCurrentWorkspaceId, createWorkspace } = useDatabaseWorkspace();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    openaiApiKey: "",
  });
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id) {
          setIsAuthenticated(true);
          return;
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
      }
    }

    // If not authenticated, redirect to login
    setIsAuthenticated(false);
    router.push("/login");
  }, [router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1 && formData.name.trim()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleCreateWorkspace = async (options?: { skipKey?: boolean }) => {
    const skipKey = options?.skipKey ?? false;
    const apiKey = skipKey ? "" : formData.openaiApiKey.trim();

    setIsLoading(true);
    setError("");

    try {
      // Get current user from localStorage
      const storedUser = localStorage.getItem("currentUser");
      if (!storedUser) {
        setError("User session not found");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);

      // Create the workspace and automatically add user as owner
      const createdWorkspace = await createWorkspace({
        name: formData.name.trim(),
        created_by_user_id: userData.id,
      });

      setCurrentWorkspaceId(createdWorkspace.id);

      // Save OpenAI API key to the workspace's OpenAI integration (only if provided and not skipping)
      if (apiKey) {
        const openaiMcpServerId = createdWorkspace.openai_mcp_server_id;
        if (openaiMcpServerId) {
          const tokenResult = await executeWorkflow(
            "BearerTokenCreateWorkflow",
            {
              user_id: userData.id,
              workspace_id: createdWorkspace.id,
              mcp_server_id: openaiMcpServerId,
              access_token: apiKey,
              token_name: "Workspace API key",
            },
          );
          if (!tokenResult?.success) {
            setError(
              "Workspace created but failed to save OpenAI API key. You can add it later in Integrations.",
            );
          }
        }
      }

      // Redirect to New agent so user can describe what they want or use a starter prompt
      window.location.href = "/agents/new";
    } catch (err) {
      void err;
      setError("Failed to create workspace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            New workspace
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Let&apos;s set up your agent orchestration workspace
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= 1
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-neutral-300"
              }`}
            >
              1
            </div>
            <div
              className={`w-16 h-1 ${currentStep >= 2 ? "bg-primary" : "bg-neutral-300"}`}
            ></div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= 2
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-neutral-300"
              }`}
            >
              2
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="size-5" />
                  Workspace name
                </CardTitle>
                <CardDescription>Give your workspace a name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g. My team, Acme Corp"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleNextStep}
                    disabled={!formData.name.trim()}
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  OpenAI integration
                </CardTitle>
                <CardDescription>
                  Required to create tasks and run agents. The key is encrypted
                  and never exposed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="my-6 space-y-2">
                  <Label htmlFor="openaiApiKey">API key</Label>
                  <Input
                    id="openaiApiKey"
                    type="password"
                    value={formData.openaiApiKey}
                    onChange={(e) =>
                      handleInputChange("openaiApiKey", e.target.value)
                    }
                    placeholder="sk-..."
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-red-800 dark:text-red-200 text-sm">
                      {error}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">
                    Gemini, Anthropic, and custom models are available in Early
                    Preview.{" "}
                    <a
                      href="https://www.restack.io/contact"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Contact us for access
                    </a>
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => handleCreateWorkspace({ skipKey: true })}
                      disabled={isLoading}
                    >
                      Skip for now
                    </Button>
                    <Button
                      onClick={() => handleCreateWorkspace()}
                      disabled={isLoading}
                      size="lg"
                    >
                      {isLoading ? "Creating..." : "Create workspace"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
