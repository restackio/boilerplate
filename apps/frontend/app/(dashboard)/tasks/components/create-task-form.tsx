"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@workspace/ui/components/ui/dropdown-menu";
import { ArrowUp, ChevronDown, Settings, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { Agent } from "@/hooks/use-workspace-scoped-actions";
import { ScheduleSetupDialog, ScheduleSpec } from "./schedule-setup-dialog";
import { executeWorkflow } from "@/app/actions/workflow";
import Link from "next/link";
import { AgentStatusBadge } from "@workspace/ui/components/agent-status-badge";

interface CreateTaskFormProps {
  onSubmit: (taskData: {
    title: string;
    description: string;
    status: "in_progress" | "in_review" | "closed" | "completed";
    agent_id: string;
    assigned_to_id: string;
    // Schedule-related fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schedule_spec?: any;
    is_scheduled?: boolean;
    schedule_status?: string;
  }) => Promise<{ success: boolean; data?: { id: string; title: string; description: string }; error?: string }>;
  onTaskCreated?: (taskData: { id: string; title: string; description: string }) => void;
  placeholder?: string;
  buttonText?: string;
}

export function CreateTaskForm({
  onSubmit,
  onTaskCreated,
  placeholder = "Describe a task",
  buttonText = "Create task",
}: CreateTaskFormProps) {
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [allAgentVersions, setAllAgentVersions] = useState<Agent[]>([]);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const { agents, fetchAgents, getAgentVersions, fetchTeams, teams } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();
  const router = useRouter();
  // Fetch agents on component mount (published only)
  useEffect(() => {
    fetchAgents({ publishedOnly: true, parentOnly: true });
  }, [fetchAgents]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Fetch all versions when an agent is selected
  useEffect(() => {
    const fetchAllVersions = async () => {
      if (!selectedAgentId) {
        setAllAgentVersions([]);
        setSelectedVersionIds([]);
        setShowVersionSelector(false);
        return;
      }

      try {
        // Find the selected agent
        const selectedAgent = agents.find(agent => agent.id === selectedAgentId);
        if (!selectedAgent) return;

        // Get the parent_agent_id (or use current id if it's a parent)
        const parentId = selectedAgent.parent_agent_id || selectedAgent.id;
        
        // Fetch all versions for this agent group
        const result = await getAgentVersions(parentId);
        if (result.success && result.data) {
          // Sort versions by updated_at descending (latest first)
          const sortedVersions = result.data.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || '1970-01-01').getTime();
            const dateB = new Date(b.updated_at || b.created_at || '1970-01-01').getTime();
            return dateB - dateA;
          });
          setAllAgentVersions(sortedVersions);
          
          // Auto-select the published version (default), or fall back to originally selected agent
          const publishedVersion = sortedVersions.find(v => v.status === 'published');
          const defaultVersionId = publishedVersion ? publishedVersion.id : selectedAgentId;
          setSelectedVersionIds([defaultVersionId]);
          setShowVersionSelector(true);
        }
      } catch (error) {
        console.error("Failed to fetch agent versions:", error);
        setAllAgentVersions([]);
        setSelectedVersionIds([]);
        setShowVersionSelector(false);
      }
    };

    fetchAllVersions();
  }, [selectedAgentId, agents, getAgentVersions]);

  const handleVersionToggle = (versionId: string) => {
    setSelectedVersionIds(prev => 
      prev.includes(versionId)
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId]
    );
  };

  const handleSelectAllVersions = () => {
    setSelectedVersionIds(allAgentVersions.map(v => v.id));
  };

  const handleClearAllVersions = () => {
    setSelectedVersionIds([]);
  };

  const handleSubmit = async () => {
    if (!taskDescription.trim()) return;
    if (!selectedAgentId) {
      return;
    }

    // Determine which agent IDs to use
    const agentIdsToUse = showVersionSelector && selectedVersionIds.length > 0 
      ? selectedVersionIds 
      : [selectedAgentId];

    if (agentIdsToUse.length === 0) {
      return;
    }

    // const startTime = Date.now(); // Unused for now

    try {
      const baseTaskData = {
        title: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : ""),
        description: taskDescription,
        status: "in_progress" as const,
        assigned_to_id: currentUser?.id || "",
        team_id: selectedTeamId,
      };

      const results = [];
      const createdTaskIds: string[] = [];
      
      // Create tasks for each selected agent version
      for (let i = 0; i < agentIdsToUse.length; i++) {
        const agentId = agentIdsToUse[i];
        const agent = allAgentVersions.find(a => a.id === agentId) || agents.find(a => a.id === agentId);
        
        const taskData = {
          ...baseTaskData,
          agent_id: agentId,
          // Add version info to title if multiple versions are selected
          title: agentIdsToUse.length > 1
            ? `${baseTaskData.title} (${agent?.name || 'Unknown'})`
            : baseTaskData.title,
          team_id: selectedTeamId,
        };
        
        const result = await onSubmit(taskData);
        
        results.push(result);
        
        if (result.success && result.data) {
          createdTaskIds.push(result.data.id);
          // Only call onTaskCreated for single task creation
          if (agentIdsToUse.length === 1) {
            onTaskCreated?.(result.data);
          }
        }
      }
      
      // Clear form if all tasks were created successfully
      const allSuccessful = results.every(r => r.success);
      if (allSuccessful) {
        setTaskDescription("");
        setSelectedAgentId("");
        setSelectedVersionIds([]);
        setAllAgentVersions([]);
        setShowVersionSelector(false);
      }
      
      // Handle navigation for multiple tasks
      if (agentIdsToUse.length > 1 && createdTaskIds.length > 0) {
        // For multiple tasks, redirect to /tasks with the created task IDs as query params
        const taskIdsParam = createdTaskIds.join(',');
        const queryParams = new URLSearchParams({
          tasks: taskIdsParam,
          highlight: 'true',
          created: new Date().toISOString()
        });
        router.push(`/tasks?${queryParams.toString()}`);
      }
      
    } catch (error) {
      console.error("Failed to create tasks:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleScheduleSubmit = async (scheduleSpec: ScheduleSpec) => {
    if (!taskDescription.trim()) {
      alert("Please enter a task description");
      return;
    }
    if (!selectedAgentId) {
      alert("Please select an agent");
      return;
    }

    try {
      const baseTaskData = {
        title: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : ""),
        description: taskDescription,
        status: "in_progress" as const,
        assigned_to_id: currentUser?.id || "",
        agent_id: selectedAgentId,
        // Schedule-related fields
        schedule_spec: scheduleSpec,
        is_scheduled: true,
        schedule_status: "inactive", // Will be set to active when the schedule is created
      };

      // First create the task
      const taskResult = await onSubmit(baseTaskData);
      
      if (taskResult.success && taskResult.data) {
        // Then create the schedule using the task ID
        const scheduleResult = await executeWorkflow("ScheduleCreateWorkflow", {
          task_id: taskResult.data.id,
          schedule_spec: scheduleSpec,
        });

        if (scheduleResult.success) {
          // Clear form
          setTaskDescription("");
          setSelectedAgentId("");
          setSelectedVersionIds([]);
          setAllAgentVersions([]);
          setShowVersionSelector(false);
          
          // Navigate to the created schedule page
          router.push(`/tasks/schedules/${taskResult.data.id}`);
        } else {
          alert("Task created but failed to create schedule. Please try again.");
        }
      } else {
        alert("Failed to create task. Please try again.");
      }
    } catch (error) {
      console.error("Failed to create scheduled task:", error);
      alert("Failed to create scheduled task. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Textarea
          rows={10}
          placeholder={placeholder}
          value={taskDescription}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setTaskDescription(e.target.value)
          }
          className="flex-1 !min-h-[150px] !max-h-[200px]"
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex items-center space-x-3">
          <div className="flex-1 flex flex-row space-x-2">
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                  {agents.length > 0 && (
                    <>
                      <div className="border-t my-1"></div>
                      <div 
                        className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-neutral-100 rounded-sm"
                        onClick={() => router.push('/agents')}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage agents
                      </div>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        

        {/* Version Selection Dropdown */}
        {showVersionSelector && allAgentVersions.length > 1 && (
          <div className="w-48">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {selectedVersionIds.length === 0 
                      ? "Select version" 
                      : selectedVersionIds.length === 1 
                        ? "1 version"
                        : `${selectedVersionIds.length} versions`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Select versions</span>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      onClick={handleSelectAllVersions}
                      variant="link"
                      className="text-xs text-foreground h-auto p-0"
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      onClick={handleClearAllVersions}
                      variant="link"
                      className="text-xs text-neutral-500 h-auto p-0"
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                  {allAgentVersions.map((version) => (
                    <div key={version.id} className="flex items-center space-x-2 px-2 py-1 hover:bg-muted rounded">
                      <Checkbox
                        id={`dropdown-${version.id}`}
                        checked={selectedVersionIds.includes(version.id)}
                        onCheckedChange={() => handleVersionToggle(version.id)}
                      />
                      <label 
                        htmlFor={`dropdown-${version.id}`} 
                        className="text-sm flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              ID: {version.id.slice(version.id.length - 5, version.id.length)}
                            </span>
                            <div className="flex items-center space-x-2 text-xs text-neutral-500 mt-0.5">
                              <span>
                                {version.updated_at 
                                  ? new Date(version.updated_at).toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Unknown date'
                                }
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                           <AgentStatusBadge status={version.status} size="sm" />
                            <Link className="text-xs text-neutral-600 hover:text-neutral-800" href={`/agents/${version.id}`} target="_blank">
                              Open in new tab
                            </Link>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                {selectedVersionIds.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <p className="text-xs text-neutral-600">
                        Will create {selectedVersionIds.length} tasks
                      </p>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Schedule Task Button */}
        <ScheduleSetupDialog
          trigger={
            <Button 
              variant="outline"
              disabled={!taskDescription.trim() || !selectedAgentId || selectedVersionIds.length > 1}
              className="flex items-center space-x-2 whitespace-nowrap"
            >
              <Clock className="h-4 w-4" />
              <span>Schedule</span>
            </Button>
          }
          onScheduleSubmit={handleScheduleSubmit}
          title="Schedule task"
          submitLabel="Create schedule"
        />

        {/* Create Task Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!taskDescription.trim() || !selectedAgentId || (showVersionSelector && selectedVersionIds.length === 0)}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <ArrowUp className="h-4 w-4" />
          <span>{showVersionSelector && selectedVersionIds.length > 1 ? 'Create tasks' : buttonText}</span>
        </Button>

      </div>
    </div>
  );
} 
