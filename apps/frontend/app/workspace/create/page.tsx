"use client";

import { useState, useEffect } from "react";
// MultiStepWizard component would need to be implemented for future wizard functionality
// CenteredLoading available for enhanced loading states
// NotificationBanner available for enhanced error handling
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Building, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { executeWorkflow } from "@/app/actions/workflow";

interface FormData {
  companyName: string;
  companySize: string;
  industry: string;
  contactRole: string;
  useCase: string;
  description: string;
}

export default function CreateWorkspacePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    companySize: "",
    industry: "",
    contactRole: "",
    useCase: "",
    description: "",
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
    if (currentStep === 1) {
      // Basic validation
      if (
        !formData.companyName ||
        !formData.companySize ||
        !formData.industry
      ) {
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
      // Get current user from localStorage
      const storedUser = localStorage.getItem("currentUser");
      if (!storedUser) {
        setError("User session not found");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);

      // Create the workspace and automatically add user as owner
      const workspaceData = await executeWorkflow("WorkspacesCreateWorkflow", {
        name: formData.companyName,
        created_by_user_id: userData.id,
      });

      if (!workspaceData.success || !workspaceData.data) {
        setError("Failed to create workspace");
        setIsLoading(false);
        return;
      }

      // Store the new workspace ID in sessionStorage so we can navigate to it after reload
      if (workspaceData.data.id) {
        sessionStorage.setItem("newWorkspaceId", workspaceData.data.id);
      } else {
        console.error("No workspace ID found in response!");
      }

      // Force a page reload to refresh workspace data
      // The dashboard will check for newWorkspaceId and switch to it
      window.location.href = "/dashboard";
    } catch (error) {
      void error; // Suppress unused warning
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

        <div className="max-w-4xl mx-auto">
          {currentStep === 1 && (
            <Card className="space-y-4">
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
                    <Label htmlFor="companyName">Company name *</Label>
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
                    <Label htmlFor="companySize">Company size *</Label>
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
                    <Label htmlFor="contactRole">Your role</Label>
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
                  <Label htmlFor="useCase">Primary use case</Label>
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
                  Review and create workspace
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
                    {isLoading ? "Creating..." : "Create"}
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
