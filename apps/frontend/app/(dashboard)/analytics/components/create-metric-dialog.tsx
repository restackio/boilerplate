"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Plus } from "lucide-react";
import { createMetricDefinition } from "@/app/actions/metrics";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export default function CreateMetricDialog() {
  const { currentWorkspaceId } = useDatabaseWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "quality",
    metricType: "llm_judge" as "llm_judge" | "python_code" | "formula",
    judgePrompt: "",
    judgeModel: "gpt-4o-mini",
    pythonCode: "",
    formula: "",
    variables: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentWorkspaceId) {
      alert("No workspace selected");
      return;
    }

    setLoading(true);
    try {
      // Build config based on metric type
      let config: any = {};
      
      if (formData.metricType === "llm_judge") {
        config = {
          judge_prompt: formData.judgePrompt,
          judge_model: formData.judgeModel,
        };
      } else if (formData.metricType === "python_code") {
        config = {
          code: formData.pythonCode,
        };
      } else if (formData.metricType === "formula") {
        config = {
          formula: formData.formula,
          variables: formData.variables.split(",").map(v => v.trim()).filter(Boolean),
        };
      }

      await createMetricDefinition({
        workspaceId: currentWorkspaceId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        metricType: formData.metricType,
        config,
      });

      alert("Metric created successfully!");
      setOpen(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "quality",
        metricType: "llm_judge",
        judgePrompt: "",
        judgeModel: "gpt-4o-mini",
        pythonCode: "",
        formula: "",
        variables: "",
      });
    } catch (error) {
      console.error("Failed to create metric:", error);
      alert("Failed to create metric");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Metric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Metric</DialogTitle>
          <DialogDescription>
            Add a new metric to evaluate agent performance and quality
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Response Helpfulness"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this metric measure?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metricType">Metric Type *</Label>
              <Select
                value={formData.metricType}
                onValueChange={(value: any) => setFormData({ ...formData, metricType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llm_judge">LLM Judge</SelectItem>
                  <SelectItem value="python_code">Python Code</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type-specific fields */}
          {formData.metricType === "llm_judge" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="judgePrompt">Judge Prompt *</Label>
              <Textarea
                id="judgePrompt"
                value={formData.judgePrompt}
                onChange={(e) => setFormData({ ...formData, judgePrompt: e.target.value })}
                placeholder="Evaluate if the response is helpful and addresses the user's needs. Return true if it passes, false if it fails."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                The prompt used to evaluate task input/output. Returns pass/fail (boolean). 
                <strong> Advanced:</strong> Can also return a score (0-100) for granular tracking.
              </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="judgeModel">Judge Model</Label>
                <Select
                  value={formData.judgeModel}
                  onValueChange={(value) => setFormData({ ...formData, judgeModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formData.metricType === "python_code" && (
            <div className="space-y-2">
              <Label htmlFor="pythonCode">Python Code *</Label>
              <Textarea
                id="pythonCode"
                value={formData.pythonCode}
                onChange={(e) => setFormData({ ...formData, pythonCode: e.target.value })}
                placeholder={`def evaluate(task_input, task_output, performance):\n    # Your evaluation logic here\n    length = len(task_output)\n    passed = 10 < length < 5000\n    return {"passed": passed, "reasoning": f"Length: {length}"}`}
                rows={6}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Define an <code className="bg-muted px-1 py-0.5 rounded">evaluate()</code> function that returns a dict with "passed" (boolean) and optional "reasoning".
                <strong> Advanced:</strong> Can also include "score" (0-100).
              </p>
            </div>
          )}

          {formData.metricType === "formula" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="formula">Formula *</Label>
                <Input
                  id="formula"
                  value={formData.formula}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  placeholder="(input_tokens * 0.0025 / 1000 + output_tokens * 0.01 / 1000) < 0.10"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Boolean expression using performance data (evaluates to True/False)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variables">Variables (comma-separated) *</Label>
                <Input
                  id="variables"
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  placeholder="input_tokens, output_tokens, duration_ms"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Available: input_tokens, output_tokens, duration_ms, status
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Metric"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
