"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { ArrowUp } from "lucide-react";
import { useAgentActions } from "@/hooks/use-workflow-actions";
import { useWorkspace } from "@/lib/workspace-context";

interface CreateTaskFormProps {
  onSubmit: (taskData: {
    title: string;
    description: string;
    status: "open" | "active" | "waiting" | "closed" | "completed";
    agent_id: string;
    assigned_to_id: string;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;
  onTaskCreated?: (taskData: any) => void;
  placeholder?: string;
  buttonText?: string;
}

export function CreateTaskForm({
  onSubmit,
  onTaskCreated,
  placeholder = "Describe a task",
  buttonText = "Create Task",
}: CreateTaskFormProps) {
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const { agents, fetchAgents } = useAgentActions();
  const { currentWorkspace } = useWorkspace();

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSubmit = async () => {
    if (!taskDescription.trim()) return;
    if (!selectedAgentId) {
      alert("Please select an agent first");
      return;
    }

    try {
      const result = await onSubmit({
        title: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : ""),
        description: taskDescription,
        status: "open" as const,
        agent_id: selectedAgentId,
        assigned_to_id: currentWorkspace.user.email, // Use current user's email as ID
      });
      
      if (result.success && result.data) {
        setTaskDescription("");
        setSelectedAgentId("");
        onTaskCreated?.(result.data);
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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

      <div className="flex items-center space-x-4">
        <div className="flex-1">
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
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={!taskDescription.trim() || !selectedAgentId}
          className="flex items-center space-x-2"
        >
          <ArrowUp className="h-4 w-4" />
          <span>{buttonText}</span>
        </Button>
      </div>
    </div>
  );
} 