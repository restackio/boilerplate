"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
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
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

interface EnrichDialogProps {
  datasetId: string;
  availableColumns?: string[]; // Available column names from the dataset
  onEnrichSuccess?: () => void;
}

interface Agent {
  id: string;
  name: string;
  type: string;
}

export function EnrichDialog({
  datasetId,
  availableColumns = [],
  onEnrichSuccess,
}: EnrichDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [columnName, setColumnName] = useState<string>("");
  const [selectedSourceColumns, setSelectedSourceColumns] = useState<Set<string>>(new Set());
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [rowLimit, setRowLimit] = useState<string>("");
  const [enrichOnlyMissing, setEnrichOnlyMissing] = useState<boolean>(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspaceId, isReady } = useDatabaseWorkspace();
  const { executeWorkflow, fetchAgents } = useWorkspaceScopedActions();

  // Load pipeline agents when dialog opens
  useEffect(() => {
    if (open && currentWorkspaceId && isReady) {
      loadPipelineAgents();
    }
  }, [open, currentWorkspaceId, isReady]);

  const loadPipelineAgents = async () => {
    setLoading(true);
    try {
      const result = await fetchAgents();
      if (result.success && result.data) {
        // Filter to only pipeline agents
        const pipelineAgents = (result.data as Agent[]).filter(
          (agent) => agent.type === "pipeline"
        );
        setAgents(pipelineAgents);
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrich = async () => {
    if (!selectedAgentId || !columnName.trim() || !userPrompt.trim() || !currentWorkspaceId || !isReady) {
      setError("Please fill in all required fields");
      return;
    }

    setEnriching(true);
    setError(null);

    try {
      // Parse row limit - if empty or invalid, pass null to enrich all rows
      const limit = rowLimit.trim() ? parseInt(rowLimit.trim(), 10) : null;
      if (limit !== null && (isNaN(limit) || limit <= 0)) {
        setError("Row limit must be a positive number");
        setEnriching(false);
        return;
      }

      const result = await executeWorkflow("EnrichContextSpecWorkflow", {
        workspace_id: currentWorkspaceId,
        dataset_id: datasetId,
        agent_id: selectedAgentId,
        column_name: columnName.trim(),
        source_columns: Array.from(selectedSourceColumns),
        user_prompt: userPrompt.trim(),
        limit: limit,
        enrich_only_missing: enrichOnlyMissing,
      });

      if (result.success && result.data) {
        const data = result.data as { started: boolean; run_id: string };
        setOpen(false);
        setSelectedAgentId("");
        setColumnName("");
        setSelectedSourceColumns(new Set());
        setUserPrompt("");
        setRowLimit("");
        setEnrichOnlyMissing(false);
        onEnrichSuccess?.();
      } else {
        setError(result.error || "Failed to start enrichment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start enrichment");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Enrich
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enrich Dataset</DialogTitle>
          <DialogDescription>
            Add a new enrichment column to your dataset. Select an agent, specify the column name, and provide instructions for what to extract or transform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading agents...</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="agent-select">Pipeline Agent</Label>
                <Select
                  value={selectedAgentId}
                  onValueChange={setSelectedAgentId}
                  disabled={enriching}
                >
                  <SelectTrigger id="agent-select">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {agents.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No pipeline agents found. Create a pipeline agent first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="column-name">Column Name</Label>
                <Input
                  id="column-name"
                  placeholder="e.g., linkedin_profile_json, ai_relevant"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  disabled={enriching}
                />
                <p className="text-xs text-muted-foreground">
                  Name of the column to add with enrichment results
                </p>
              </div>

              {availableColumns.length > 0 && (
                <div className="space-y-2">
                  <Label>Source Columns (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which columns to pass to the agent. Leave empty to pass all columns.
                  </p>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {availableColumns.map((col) => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-col-${col}`}
                          checked={selectedSourceColumns.has(col)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedSourceColumns);
                            if (checked) {
                              newSet.add(col);
                            } else {
                              newSet.delete(col);
                            }
                            setSelectedSourceColumns(newSet);
                          }}
                          disabled={enriching}
                        />
                        <Label
                          htmlFor={`source-col-${col}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {col}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="user-prompt">User Prompt</Label>
                <Textarea
                  id="user-prompt"
                  placeholder='e.g., "take the column LinkedIn Contact Profile URL" or "check linkedin_profile_json and analyse if profile is relevant for AI"'
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={enriching}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Describe what to extract or transform. Reference column names from your data.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="row-limit">Row Limit (Optional)</Label>
                <Input
                  id="row-limit"
                  type="number"
                  min="1"
                  placeholder="Leave empty to enrich all rows"
                  value={rowLimit}
                  onChange={(e) => setRowLimit(e.target.value)}
                  disabled={enriching}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of rows to enrich. If not specified, all rows will be enriched.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enrich-only-missing"
                  checked={enrichOnlyMissing}
                  onCheckedChange={setEnrichOnlyMissing}
                  disabled={enriching}
                />
                <Label
                  htmlFor="enrich-only-missing"
                  className="text-sm font-normal cursor-pointer"
                >
                  Enrich only missing data
                </Label>
                <p className="text-xs text-muted-foreground">
                  Skip rows that already have data in the target column
                </p>
              </div>
            </>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={enriching}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnrich}
            disabled={!selectedAgentId || !columnName.trim() || !userPrompt.trim() || enriching || agents.length === 0}
          >
            {enriching ? "Starting..." : "Start Enrichment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

