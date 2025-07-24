"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Building,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

export default function CreateWorkspacePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: "",
    companySize: "",
    industry: "",
    useCase: "",
    timeline: "",
    contactName: "",
    contactEmail: "",
    contactRole: "",
  });

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
    if (currentStep === 1) {
      // Basic validation
      if (
        !formData.companyName ||
        !formData.companySize ||
        !formData.industry
      ) {
        alert("Please fill in all required fields");
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleCreateWorkspace = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Create the workspace
      const workspaceResult = await runWorkflow({
        workflowName: "WorkspacesCreateWorkflow",
        input: {
          name: formData.companyName,
        },
      });

      const workspaceData = await getWorkflowResult({
        workflowId: workspaceResult.workflowId,
        runId: workspaceResult.runId,
      });

      if (!workspaceData?.success || !workspaceData.data) {
        setError("Failed to create workspace");
        setIsLoading(false);
        return;
      }

      // Get current user from localStorage
      const storedUser = localStorage.getItem("currentUser");
      if (!storedUser) {
        setError("User session not found");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);

      // Add user to the new workspace
      const userWorkspaceResult = await runWorkflow({
        workflowName: "UserWorkspacesCreateWorkflow",
        input: {
          user_id: userData.id,
          workspace_id: workspaceData.data.id,
          role: "owner",
        },
      });

      const userWorkspaceData = await getWorkflowResult({
        workflowId: userWorkspaceResult.workflowId,
        runId: userWorkspaceResult.runId,
      });

      if (!userWorkspaceData?.success) {
        setError("Failed to add user to workspace");
        setIsLoading(false);
        return;
      }

      // Update user data with new workspace
      const updatedUser = {
        ...userData,
        workspace_ids: [...(userData.workspace_ids || []), workspaceData.data.id],
      };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      // Force a page reload to refresh workspace data
      window.location.href = "/dashboard";
    } catch (error) {
      setError("Failed to create workspace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const companySizes = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-1000 employees",
    "1000+ employees",
  ];

  const industries = [
    "Technology",
    "Financial Services",
    "Healthcare",
    "E-commerce",
    "Manufacturing",
    "Education",
    "Government",
    "Other",
  ];

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
            Create Your Workspace
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Let's set up your agent orchestration workspace
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

        <div className="max-w-4xl mx-auto">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="size-5" />
                  Tell us about your organization
                </CardTitle>
                <CardDescription>
                  Help us understand your needs so we can customize your
                  workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                      placeholder="Enter your company name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) =>
                        handleInputChange("companySize", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) =>
                        handleInputChange("industry", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">Your Role</Label>
                    <Input
                      id="contactRole"
                      value={formData.contactRole}
                      onChange={(e) =>
                        handleInputChange("contactRole", e.target.value)
                      }
                      placeholder="e.g., CTO, Head of Support"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCase">Primary Use Case</Label>
                  <Textarea
                    id="useCase"
                    value={formData.useCase}
                    onChange={(e) =>
                      handleInputChange("useCase", e.target.value)
                    }
                    placeholder="What do you hope to achieve in this workspace? (e.g., automate tier-1 support, reduce response times, scale customer support, etc.)"
                    rows={4}
                    className="min-h-40"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNextStep} size="lg">
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
                  <CheckCircle className="size-5" />
                  Review and Create Workspace
                </CardTitle>
                <CardDescription>
                  Review your workspace details and create your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <h3 className="font-semibold mb-2">Workspace Details:</h3>
                  <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <p><strong>Company Name:</strong> {formData.companyName}</p>
                    <p><strong>Company Size:</strong> {formData.companySize}</p>
                    <p><strong>Industry:</strong> {formData.industry}</p>
                    {formData.contactRole && <p><strong>Your Role:</strong> {formData.contactRole}</p>}
                    {formData.useCase && <p><strong>Use Case:</strong> {formData.useCase}</p>}
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handlePrevStep}>
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleCreateWorkspace} 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? "Creating Workspace..." : "Create Workspace"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
