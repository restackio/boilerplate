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
import { Switch } from "@workspace/ui/components/ui/switch";
import { Slider } from "@workspace/ui/components/ui/slider";
import { Plus, Loader2 } from "lucide-react";
import { createMetricWithRetroactive } from "@/app/actions/metrics";

interface CreateMetricDialogProps {
  workspaceId: string;
  userId?: string;
  onMetricCreated?: () => void;
}

export function CreateMetricDialog({
  workspaceId,
  userId,
  onMetricCreated,
}: CreateMetricDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Metric definition
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category] = useState("quality");
  const [metricType, setMetricType] = useState<"llm_judge" | "python_code" | "formula">("llm_judge");

  // LLM Judge config
  const [judgePrompt, setJudgePrompt] = useState("");
  const [judgeModel, setJudgeModel] = useState("gpt-5-nano");

  // Retroactive options
  const [runRetroactive, setRunRetroactive] = useState(false);
  const [retroactiveWeeks, setRetroactiveWeeks] = useState(2);
  const [samplePercentage, setSamplePercentage] = useState(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Metric name is required");
      return;
    }

    if (metricType === "llm_judge" && !judgePrompt.trim()) {
      setError("Judge prompt is required for LLM judge metrics");
      return;
    }

    setLoading(true);

    try {
      // Build config based on metric type
      const config: Record<string, unknown> = {};
      if (metricType === "llm_judge") {
        config.judge_prompt = judgePrompt;
        config.judge_model = judgeModel;
      }

      // Calculate date range if retroactive
      let retroactiveDateFrom: string | undefined;
      let retroactiveDateTo: string | undefined;
      if (runRetroactive) {
        const now = new Date();
        const weeksAgo = new Date(now);
        weeksAgo.setDate(weeksAgo.getDate() - (retroactiveWeeks * 7));
        retroactiveDateFrom = weeksAgo.toISOString();
        retroactiveDateTo = now.toISOString();
      }

      const result = await createMetricWithRetroactive({
        workspace_id: workspaceId,
        name,
        description: description || undefined,
        category,
        metric_type: metricType,
        config,
        is_active: true,
        created_by: userId || undefined,
        run_retroactive: runRetroactive,
        retroactive_date_from: retroactiveDateFrom,
        retroactive_date_to: retroactiveDateTo,
        retroactive_sample_percentage: runRetroactive ? samplePercentage / 100 : undefined,
      });

      if (result.success) {
        setSuccess(
          runRetroactive
            ? `${name} created and retroactive evaluation started on ${samplePercentage}% of traces from last ${retroactiveWeeks} weeks`
            : `${name} created successfully. It will run on all new tasks.`
        );

        // Reset form after a brief delay to show success message
        setTimeout(() => {
          setName("");
          setDescription("");
          setJudgePrompt("");
          setRunRetroactive(false);
          setRetroactiveWeeks(2);
          setSamplePercentage(10);
          setOpen(false);
          setSuccess(null);

          // Notify parent
          onMetricCreated?.();
        }, 2000);
      } else {
        setError(result.error || "Failed to create metric");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create metric");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create metric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create metric</DialogTitle>
            <DialogDescription>
              Create a new metric to evaluate agent responses. Optionally run it on historical data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Metric Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., response_helpful, tone_professional"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this metric evaluate?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Metric Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={metricType} onValueChange={(v: "llm_judge" | "python_code" | "formula") => setMetricType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llm_judge">LLM as judge</SelectItem>
                  <SelectItem aria-disabled={true} value="python_code" disabled>Python Code</SelectItem>
                  <SelectItem aria-disabled={true} value="formula" disabled>Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* LLM Judge Config */}
            {metricType === "llm_judge" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="judgePrompt">Prompt</Label>
                  <Textarea
                    id="judgePrompt"
                    placeholder={'Example:\n"Evaluate if this response is helpful and answers the user\'s question clearly. Consider accuracy, completeness, and tone.\n\nReturn JSON: {"passed": true/false, "score": 0-100, "reasoning": "..."}'}
                    value={judgePrompt}
                    onChange={(e) => setJudgePrompt(e.target.value)}
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    LLM will receive the task input and output, and evaluate based on your prompt.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="judgeModel">Model</Label>
                  <Select value={judgeModel} onValueChange={setJudgeModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5">GPT-5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Retroactive evaluation section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    Retroactive evaluation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Test this metric on historical tasks
                  </p>
                </div>
                <Switch
                  checked={runRetroactive}
                  onCheckedChange={setRunRetroactive}
                />
              </div>

              {runRetroactive && (
                <div className="space-y-4 ml-6 border-l-2 border-neutral-200 pl-4">
                  {/* Time Range */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Time range</Label>
                      <span className="text-sm font-medium">
                        Last {retroactiveWeeks} {retroactiveWeeks === 1 ? "week" : "weeks"}
                      </span>
                    </div>
                    <Slider
                      value={[retroactiveWeeks]}
                      onValueChange={(v) => setRetroactiveWeeks(v[0])}
                      min={1}
                      max={12}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Evaluate tasks from the last {retroactiveWeeks} {retroactiveWeeks === 1 ? "week" : "weeks"}
                    </p>
                  </div>

                  {/* Sample Percentage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sample size</Label>
                      <span className="text-sm font-medium">
                        {samplePercentage}% of tasks
                      </span>
                    </div>
                    <Slider
                      value={[samplePercentage]}
                      onValueChange={(v) => setSamplePercentage(v[0])}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Randomly sample {samplePercentage}% of tasks
                      {samplePercentage < 100 && " (recommended for large datasets)"}
                    </p>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-950/20 rounded-lg p-3 text-sm">
                    <p className="text-neutral-900 dark:text-neutral-100">
                      💡 <strong>Tip:</strong> Start with a small sample (10-20%) to validate your metric works correctly before running on 100%.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-3 text-sm">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg p-3 text-sm">
              <p className="font-semibold">Success</p>
              <p>{success}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : runRetroactive ? (
                <>
                  Create & evaluate
                </>
              ) : ( 
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
