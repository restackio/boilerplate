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
import { Loader2, Trash2, Play, X, Search } from "lucide-react";
import { Slider } from "@workspace/ui/components/ui/slider";
import { updateMetric, deleteMetric, runRetroactiveEvaluation } from "@/app/actions/metrics";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface EditMetricDialogProps {
  metricId: string;
  metricName: string;
  description?: string | null;
  metricType?: string;
  isActive: boolean;
  config: Record<string, unknown> | string;
  parentAgentIds?: string[];
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMetricUpdated?: () => void;
}

export function EditMetricDialog({
  metricId,
  metricName: initialMetricName,
  description: initialDescription,
  metricType: initialMetricType,
  isActive: initialIsActive,
  config,
  parentAgentIds: initialParentAgentIds,
  workspaceId,
  open,
  onOpenChange,
  onMetricUpdated,
}: EditMetricDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Parse config
  const parsedConfig = typeof config === "string" ? JSON.parse(config) : config;
  
  // Form state
  const [name, setName] = useState(initialMetricName);
  const [description, setDescription] = useState(initialDescription || "");
  const [isActive, setIsActive] = useState(initialIsActive);
  const metricType = initialMetricType || "llm_judge";
  
  // LLM Judge config
  const [judgePrompt, setJudgePrompt] = useState(parsedConfig.judge_prompt || "");
  const [judgeModel, setJudgeModel] = useState(parsedConfig.judge_model || "gpt-5-nano");

  // Python Code config
  const [pythonCode, setPythonCode] = useState(parsedConfig.code || "");

  // Formula config
  const [formula, setFormula] = useState(parsedConfig.formula || "");
  const [formulaVariables, setFormulaVariables] = useState<string[]>(parsedConfig.variables || []);

  // Parent agents selection
  const [selectedParentAgentIds, setSelectedParentAgentIds] = useState<string[]>(initialParentAgentIds || []);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const { agents, fetchAgents } = useWorkspaceScopedActions();

  // Retroactive evaluation state
  const [retroLoading, setRetroLoading] = useState(false);
  const [runRetroactive, setRunRetroactive] = useState(false);
  const [retroactiveWeeks, setRetroactiveWeeks] = useState(2);
  const [samplePercentage, setSamplePercentage] = useState(10);

  // Fetch agents when dialog opens (published only by default)
  useEffect(() => {
    if (open) {
      fetchAgents({ publishedOnly: true });
    }
  }, [open, fetchAgents]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(initialMetricName);
      setDescription(initialDescription || "");
      setIsActive(initialIsActive);
      setJudgePrompt(parsedConfig.judge_prompt || "");
      setJudgeModel(parsedConfig.judge_model || "gpt-5-nano");
      setPythonCode(parsedConfig.code || "");
      setFormula(parsedConfig.formula || "");
      setFormulaVariables(parsedConfig.variables || []);
      setSelectedParentAgentIds(initialParentAgentIds || []);
      setError(null);
      setSuccess(null);
      setShowDeleteConfirm(false);
    }
  }, [open, initialMetricName, initialDescription, initialIsActive, initialParentAgentIds, parsedConfig]);

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
      const updatedConfig: Record<string, unknown> = {};
      if (metricType === "llm_judge") {
        updatedConfig.judge_prompt = judgePrompt;
        updatedConfig.judge_model = judgeModel;
      } else if (metricType === "python_code") {
        updatedConfig.code = pythonCode;
      } else if (metricType === "formula") {
        updatedConfig.formula = formula;
        updatedConfig.variables = formulaVariables;
      }

      const result = await updateMetric({
        metric_id: metricId,
        name,
        description: description || undefined,
        config: updatedConfig,
        is_active: isActive,
        parent_agent_ids: selectedParentAgentIds,
      });

      if (result) {
        setSuccess("Metric updated successfully");
        onMetricUpdated?.();
        
        // Close dialog after a brief delay
        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
      } else {
        setError("Failed to update metric");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update metric");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);

    try {
      const result = await deleteMetric(metricId);

      if (result) {
        setSuccess("Metric deleted successfully");
        onMetricUpdated?.();
        // Close dialogs after a brief delay
        setTimeout(() => {
          setShowDeleteConfirm(false);
          onOpenChange(false);
        }, 1000);
      } else {
        setError("Failed to delete metric");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete metric");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRunRetroactive = async () => {
    setError(null);
    setSuccess(null);
    setRetroLoading(true);

    try {
      // Calculate date range
      const now = new Date();
      const weeksAgo = new Date(now);
      weeksAgo.setDate(weeksAgo.getDate() - (retroactiveWeeks * 7));

      const result = await runRetroactiveEvaluation({
        workspace_id: workspaceId,
        metric_definition_id: metricId,
        retroactive_date_from: weeksAgo.toISOString(),
        retroactive_date_to: now.toISOString(),
        retroactive_sample_percentage: samplePercentage / 100,
      });

      if (result.success) {
        setSuccess(
          `Retroactive evaluation started on ${samplePercentage}% of traces from last ${retroactiveWeeks} weeks. Check back shortly to see results.`
        );
        setRunRetroactive(false);
        onMetricUpdated?.();
      } else {
        setError(result.error || "Failed to start retroactive evaluation");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start retroactive evaluation");
    } finally {
      setRetroLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit metric: {initialMetricName}</DialogTitle>
              <DialogDescription>
                Update metric configuration and manage its settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                  {success}
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="active-toggle" className="text-base">
                    Active Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isActive
                      ? "This metric is currently active and will evaluate new tasks"
                      : "This metric is inactive and won't evaluate new tasks"}
                  </p>
                </div>
                <Switch
                  id="active-toggle"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={loading}
                />
              </div>

              {/* Metric Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., response_helpful, tone_professional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
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
                  disabled={loading}
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
                      const agent = agents.find((a) => a.id === agentId && !a.parent_agent_id);
                      if (!agent) return null;
                      return (
                        <Badge key={agentId} className="gap-1.5 pr-1">
                          <span className="max-w-[200px] truncate">{agent.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => setSelectedParentAgentIds(selectedParentAgentIds.filter((id) => id !== agentId))}
                            disabled={loading}
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
                      disabled={loading}
                    />
                  </div>

                  {agentSearchQuery && (
                    <div className="max-h-40 overflow-y-auto rounded-md border">
                      {agents
                        .filter(
                          (agent) =>
                            // Only show parent agents (not versions)
                            !agent.parent_agent_id &&
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

              {/* Metric Type (Read-only) */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={metricType} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llm_judge">LLM as judge</SelectItem>
                    <SelectItem value="python_code">Python Code</SelectItem>
                    <SelectItem value="formula">Formula</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Metric type cannot be changed after creation
                </p>
              </div>

              {/* LLM Judge Config */}
              {metricType === "llm_judge" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="judgeModel">Model</Label>
                    <Select value={judgeModel} onValueChange={setJudgeModel} disabled={loading}>
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

                  <div className="space-y-2">
                    <Label htmlFor="judgePrompt">Prompt</Label>
                    <Textarea
                      id="judgePrompt"
                      placeholder={'Example:\n"Evaluate if this response is helpful and answers the user\'s question clearly. Consider accuracy, completeness, and tone.\n\nReturn JSON: {"passed": true/false, "score": 0-100, "reasoning": "..."}'}
                      value={judgePrompt}
                      onChange={(e) => setJudgePrompt(e.target.value)}
                      rows={6}
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      LLM will receive the task input and output, and evaluate based on your prompt.
                    </p>
                  </div>
                </>
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
                    disabled={loading}
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
                      disabled={loading}
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
                              if (!loading) {
                                setFormulaVariables((prev) =>
                                  prev.includes(variable)
                                    ? prev.filter((v) => v !== variable)
                                    : [...prev, variable]
                                );
                              }
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

              {/* Retroactive Evaluation Section */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Retroactive evaluation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Run this metric on historical tasks
                    </p>
                  </div>
                  <Switch
                    checked={runRetroactive}
                    onCheckedChange={setRunRetroactive}
                    disabled={loading || retroLoading}
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
                        Evaluate {samplePercentage}% of tasks
                        {samplePercentage < 100 && " (recommended for large datasets)"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleRunRetroactive}
                      disabled={retroLoading}
                      className="w-full"
                    >
                      {retroLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {retroLoading ? "Starting evaluation..." : "Start evaluation"}
                    </Button>

                    <div className="bg-neutral-50 dark:bg-neutral-950/20 rounded-lg p-3 text-sm">
                      <p className="text-neutral-900 dark:text-neutral-100">
                        💡 <strong>Tip:</strong> Results will be added to your analytics as they complete. This runs in the background.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              {!showDeleteConfirm ? (
                <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
                  <div>
                    <Label className="text-base text-destructive">Danger Zone</Label>
                    <p className="text-sm text-muted-foreground">
                      Deleting a metric is permanent and cannot be undone.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading || deleteLoading}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Metric
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-destructive p-4 space-y-3 bg-destructive/10">
                  <div>
                    <Label className="text-base text-destructive">Confirm Deletion</Label>
                    <p className="text-sm text-muted-foreground mt-2">
                      Are you sure you want to delete <strong>{initialMetricName}</strong>?
                      All historical evaluation data will be preserved, but no new evaluations will be performed.
                      This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex-1"
                    >
                      {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || deleteLoading}
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={loading || deleteLoading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
