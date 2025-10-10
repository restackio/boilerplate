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
} from "@workspace/ui/components/ui/dialog";
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
import { Loader2, Trash2, Play } from "lucide-react";
import { Slider } from "@workspace/ui/components/ui/slider";
import { toggleMetricStatus, deleteMetric, runRetroactiveEvaluation } from "@/app/actions/metrics";

interface EditMetricDialogProps {
  metricId: string;
  metricName: string;
  isActive: boolean;
  config: Record<string, unknown> | string;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMetricUpdated?: () => void;
}

export function EditMetricDialog({
  metricId,
  metricName,
  isActive: initialIsActive,
  config,
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
  const [isActive, setIsActive] = useState(initialIsActive);
  const judgePrompt = parsedConfig.judge_prompt || "";
  const judgeModel = parsedConfig.judge_model || "gpt-5-nano";

  // Retroactive evaluation state
  const [retroLoading, setRetroLoading] = useState(false);
  const [runRetroactive, setRunRetroactive] = useState(false);
  const [retroactiveWeeks, setRetroactiveWeeks] = useState(2);
  const [samplePercentage, setSamplePercentage] = useState(10);

  const handleToggleActive = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const newActiveState = !isActive;
      const result = await toggleMetricStatus(metricId, newActiveState);

      if (result) {
        setIsActive(newActiveState);
        setSuccess(`Metric ${newActiveState ? "activated" : "deactivated"} successfully`);
        onMetricUpdated?.();
      } else {
        setError("Failed to update metric status");
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Metric: {metricName}</DialogTitle>
            <DialogDescription>
              View metric configuration and manage its status.
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
                onCheckedChange={handleToggleActive}
                disabled={loading}
              />
            </div>

            {/* Metric Configuration (Read-only) */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <Label className="text-base">Configuration</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Metric configuration is read-only. Create a new version to change settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Judge Model</Label>
                <Select value={judgeModel} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Judge Prompt</Label>
                <Textarea
                  value={judgePrompt}
                  disabled
                  className="min-h-[120px] font-mono text-sm"
                  placeholder="Judge prompt..."
                />
              </div>
            </div>

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
                    Are you sure you want to delete <strong>{metricName}</strong>?
                    All historical evaluation data will be preserved, but no new evaluations will be performed.
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
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
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleteLoading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

