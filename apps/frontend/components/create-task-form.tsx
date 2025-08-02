"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { ArrowUp } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

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
  const { agents, fetchAgents } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();

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

    console.log("🔄 [CreateTaskForm] Starting task creation...");
    const startTime = Date.now();

    try {
      const taskData = {
        title: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : ""),
        description: taskDescription,
        status: "open" as const,
        agent_id: selectedAgentId,
        assigned_to_id: currentUser?.id || "", // Use current user's ID
      };
      
      console.log("🔄 [CreateTaskForm] Calling onSubmit with task data:", taskData);
      const onSubmitStartTime = Date.now();
      
      const result = await onSubmit(taskData);
      
      const onSubmitEndTime = Date.now();
      console.log(`✅ [CreateTaskForm] onSubmit completed in ${onSubmitEndTime - onSubmitStartTime}ms`);
      console.log("✅ [CreateTaskForm] onSubmit result:", result);
      
      if (result.success && result.data) {
        console.log("🔄 [CreateTaskForm] Task created successfully, calling onTaskCreated...");
        const onTaskCreatedStartTime = Date.now();
        
        setTaskDescription("");
        setSelectedAgentId("");
        onTaskCreated?.(result.data);
        
        const onTaskCreatedEndTime = Date.now();
        console.log(`✅ [CreateTaskForm] onTaskCreated completed in ${onTaskCreatedEndTime - onTaskCreatedStartTime}ms`);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [CreateTaskForm] Total task creation flow completed in ${totalTime}ms`);
    } catch (error) {
      console.error("❌ [CreateTaskForm] Failed to create task:", error);
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