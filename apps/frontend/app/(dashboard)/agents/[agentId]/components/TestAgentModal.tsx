"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { ArrowUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { Agent } from "@/hooks/use-workspace-scoped-actions";

interface TestAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
}

export function TestAgentModal({ isOpen, onClose, agent }: TestAgentModalProps) {
  const [taskDescription, setTaskDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createTask } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!taskDescription.trim()) return;

    setIsCreating(true);
    try {
      const taskData = {
        title: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : ""),
        description: taskDescription,
        status: "open" as const,
        agent_id: agent.id,
        assigned_to_id: currentUser?.id || "",
      };

      const result = await createTask(taskData);

      if (result.success && result.data) {
        // Clear form and close modal
        setTaskDescription("");
        onClose();
        // Navigate to the new task
        router.push(`/tasks/${result.data.id}`);
      } else {
        console.error(" Failed to create test task:", result.error);
      }
    } catch (error) {
      console.error("Error creating test task:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setTaskDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Test Agent</DialogTitle>
              <DialogDescription>
                Create a test task for {agent.name} {agent.version}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isCreating}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              rows={8}
              placeholder="Describe what you want to test with this agent..."
              value={taskDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setTaskDescription(e.target.value)
              }
              className="min-h-[120px] max-h-[200px]"
              onKeyDown={handleKeyDown}
              disabled={isCreating}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!taskDescription.trim() || isCreating}
              className="flex items-center space-x-2"
            >
              {isCreating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4" />
                  <span>Create Test Task</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
