"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Badge } from "@workspace/ui/components/ui/badge";
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
import { Plus, Loader2, X, Search } from "lucide-react";
import { createMetricWithRetroactive } from "@/app/actions/metrics";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface CreateMetricDialogProps {
  workspaceId: string;
  userId?: string;
  onMetricCreated?: () => void;
  feedbackContext?: {
    isPositive: boolean;
    feedbackText: string | null | undefined;
  };
  defaultParentAgentIds?: string[];
  trigger?: React.ReactNode;
}

export function CreateMetricDialog({
  workspaceId,
  userId,
  onMetricCreated,
  feedbackContext,
  defaultParentAgentIds,
  trigger,
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

  // Python Code config
  const [pythonCode, setPythonCode] = useState("");

  // Formula config
  const [formula, setFormula] = useState("");
  const [formulaVariables, setFormulaVariables] = useState<string[]>([]);

  // Parent agents selection
  const [selectedParentAgentIds, setSelectedParentAgentIds] = useState<string[]>([]);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const { agents, fetchAgents } = useWorkspaceScopedActions();

  // Retroactive options
  const [runRetroactive, setRunRetroactive] = useState(false);
  const [retroactiveWeeks, setRetroactiveWeeks] = useState(2);
  const [samplePercentage, setSamplePercentage] = useState(10);

  // Fetch agents when dialog opens (published parent agents only)
  useEffect(() => {
    if (open) {
      fetchAgents({ publishedOnly: true, parentOnly: true });
    }
  }, [open, fetchAgents]);

  // Pre-fill form based on feedback context when dialog opens
  useEffect(() => {
    if (open && feedbackContext) {
      const feedbackType = feedbackContext.isPositive ? "positive" : "negative";
      const feedbackText = feedbackContext.feedbackText;
      
      const suggestedPrompt = feedbackText
        ? `Evaluate if the response addresses the following concern from user feedback: "${feedbackText}"\n\nThis feedback was marked as ${feedbackType}.\n\nReturn JSON: {"passed": true/false, "score": 0-100, "reasoning": "..."}`
        : `Evaluate if the response would receive ${feedbackType} feedback from users.\n\nReturn JSON: {"passed": true/false, "score": 0-100, "reasoning": "..."}`;
      
      setJudgePrompt(suggestedPrompt);
      setName(`feedback_${feedbackType}_check`);
      setDescription(`Metric based on ${feedbackType} user feedback`);
    }
    
    // Pre-fill associated agents when provided
    if (open && defaultParentAgentIds && defaultParentAgentIds.length > 0) {
      setSelectedParentAgentIds(defaultParentAgentIds);
    }
  }, [open, feedbackContext, defaultParentAgentIds]);

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

    if (metricType === "python_code" && !pythonCode.trim()) {
      setError("Python code is required for Python code metrics");
      return;
    }

    if (metricType === "formula" && !formula.trim()) {
      setError("Formula is required for formula metrics");
      return;
    }

    setLoading(true);

    try {
      // Build config based on metric type
      const config: Record<string, unknown> = {};
      if (metricType === "llm_judge") {
        config.judge_prompt = judgePrompt;
        config.judge_model = judgeModel;
      } else if (metricType === "python_code") {
        config.code = pythonCode;
      } else if (metricType === "formula") {
        config.formula = formula;
        config.variables = formulaVariables;
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
        parent_agent_ids: selectedParentAgentIds.length > 0 ? selectedParentAgentIds : undefined,
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
          setSelectedParentAgentIds([]);
          setAgentSearchQuery("");
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
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create metric
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create metric</DialogTitle>
            <DialogDescription>
              Create a new metric to evaluate agent responses. Optionally run it on historical data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Feedback Context Banner */}
            {feedbackContext && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm border">
                <p className="font-semibold mb-1">Based on feedback:</p>
                <p className="text-muted-foreground">
                  {feedbackContext.isPositive ? "Positive" : "Negative"} feedback
                  {feedbackContext.feedbackText && `: "${feedbackContext.feedbackText}"`}
                </p>
              </div>
            )}

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

              {/* Parent Agents Selection */}
              <div className="space-y-2">
                <Label>Associated agents</Label>
                <p className="text-xs text-muted-foreground">
                  Select parent agents to evaluate. The metric will run on all versions of these agents. Leave empty to run for all agents.
                </p>
                
                {/* Selected agents badges */}
                {selectedParentAgentIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedParentAgentIds.map((agentId) => {
                      // Since we're fetching parent agents only, find the agent directly
                      const agent = agents.find((a) => a.id === agentId);
                      if (!agent) return null;
                      return (
                        <Badge key={agentId} className="gap-1.5 pr-1">
                          <span className="max-w-[200px] truncate">{agent.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => setSelectedParentAgentIds(selectedParentAgentIds.filter((id) => id !== agentId))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Agent search and selection */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search agents to add..."
                      value={agentSearchQuery}
                      onChange={(e) => setAgentSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>

                  {agentSearchQuery && (
                    <div className="max-h-40 overflow-y-auto rounded-md border">
                      {agents
                        .filter(
                          (agent) =>
                            // Since we're fetching parent agents only, no need to filter by parent_agent_id
                            !selectedParentAgentIds.includes(agent.id) &&
                            (agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                              agent.description?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                        )
                        .map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              setSelectedParentAgentIds([...selectedParentAgentIds, agent.id]);
                              setAgentSearchQuery("");
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">{agent.name}</p>
                              {agent.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {agent.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      {agents.filter(
                        (agent) =>
                          // Only show parent agents (not versions)
                          !agent.parent_agent_id &&
                          !selectedParentAgentIds.includes(agent.id) &&
                          (agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                            agent.description?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                      ).length === 0 && (
                        <p className="p-2 text-sm text-muted-foreground">No agents found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            <div className="grid grid-cols-2 gap-4">
            {/* Metric Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={metricType} onValueChange={(v: "llm_judge" | "python_code" | "formula") => setMetricType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llm_judge">LLM as judge</SelectItem>
                  <SelectItem value="python_code">Python Code</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {metricType === "llm_judge" && (
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
            )}
            </div>

            {/* LLM Judge Config */}
            {metricType === "llm_judge" && (
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
            )}

            {/* Python Code Config */}
            {metricType === "python_code" && (
              <div className="space-y-2">
                <Label htmlFor="pythonCode">Python Code</Label>
                <Textarea
                  id="pythonCode"
                  placeholder={'def evaluate(task_input, task_output, performance):\n    # Your evaluation logic here\n    # Available variables:\n    # - task_input: str\n    # - task_output: str\n    # - performance: dict with duration_ms, input_tokens, output_tokens, status\n    \n    # Return boolean or dict:\n    return {\n        "passed": True,\n        "score": 85.0,  # optional\n        "reasoning": "Response meets criteria"  # optional\n    }'}
                  value={pythonCode}
                  onChange={(e) => setPythonCode(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Define an <code className="bg-muted px-1 rounded">evaluate(task_input, task_output, performance)</code> function. 
                  Return a boolean or dict with <code className="bg-muted px-1 rounded">passed</code>, <code className="bg-muted px-1 rounded">score</code>, and <code className="bg-muted px-1 rounded">reasoning</code>.
                </p>
              </div>
            )}

            {/* Formula Config */}
            {metricType === "formula" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="formula">Formula</Label>
                  <Input
                    id="formula"
                    placeholder="duration_ms < 1000 and input_tokens < 2000"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Boolean expression using performance variables. Available: <code className="bg-muted px-1 rounded">duration_ms</code>, <code className="bg-muted px-1 rounded">input_tokens</code>, <code className="bg-muted px-1 rounded">output_tokens</code>, <code className="bg-muted px-1 rounded">cost_usd</code>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="formulaVariables">Variables</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["duration_ms", "input_tokens", "output_tokens", "cost_usd"].map((variable) => {
                      const isSelected = formulaVariables.includes(variable);
                      const variant = isSelected ? "default" : "outline";
                      return (
                        <Badge
                          key={variable}
                          variant={variant as "default" | "secondary" | "destructive" | "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setFormulaVariables((prev) =>
                              prev.includes(variable)
                                ? prev.filter((v) => v !== variable)
                                : [...prev, variable]
                            );
                          }}
                        >
                          {variable}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which performance variables your formula uses
                  </p>
                </div>
              </div>
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
