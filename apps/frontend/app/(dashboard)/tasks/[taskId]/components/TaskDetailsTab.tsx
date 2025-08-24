"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  Bot,
  User,
  Calendar,
  Edit,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";
import { Task } from "@/hooks/use-workspace-scoped-actions";

interface TaskDetailsTabProps {
  task: Task;
  onUpdateTask: (updates: Partial<Task>) => Promise<void>;
  isLoading?: boolean;
}

export function TaskDetailsTab({ task, onUpdateTask, isLoading = false }: TaskDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>(task);

  const handleSave = async () => {
    try {
      // Only send the fields that have actually changed (excluding agent and user assignments)
      const changes: Partial<Task> = {};
      
      if (editedTask.title !== task.title) changes.title = editedTask.title;
      if (editedTask.description !== task.description) changes.description = editedTask.description;
      if (editedTask.status !== task.status) changes.status = editedTask.status;
      // Note: agent_id and assigned_to_id are not included as they cannot be edited
      
      // Only update if there are actual changes
      if (Object.keys(changes).length > 0) {
        await onUpdateTask(changes);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "open":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Task</CardTitle>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Task ID */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">ID</Label>
          <div className="mt-1 text-sm font-mono bg-muted p-2 rounded">
            {task.id}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-medium">Title</Label>
          {isEditing ? (
            <Textarea
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="mt-1"
              rows={2}
            />
          ) : (
            <div className="mt-1 text-sm">{task.title}</div>
          )}
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-medium">Description</Label>
          {isEditing ? (
            <Textarea
              value={editedTask.description || ""}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="mt-1"
              rows={4}
              placeholder="Enter task description..."
            />
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              {task.description || "No description provided"}
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <Label className="text-sm font-medium">Status</Label>
          {isEditing ? (
            <Select
              value={editedTask.status}
              onValueChange={(value) => setEditedTask({ ...editedTask, status: value as "open" | "active" | "waiting" | "closed" | "completed" })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1">
              <Badge className={`${getStatusColor(task.status)} border-0`}>
                {task.status}
              </Badge>
            </div>
          )}
        </div>

        {/* Agent */}
        <div>
          <Label className="text-sm font-medium">Assigned Agent</Label>
          <div className="mt-1 flex items-center space-x-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{task.agent_name}</span>
          </div>
          {isEditing && (
            <p className="mt-1 text-xs text-muted-foreground">
              Agent assignment cannot be changed from this interface
            </p>
          )}
        </div>

        {/* Assigned To */}
        <div>
          <Label className="text-sm font-medium">Assigned To</Label>
          <div className="mt-1 flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{task.assigned_to_name}</span>
          </div>
          {isEditing && (
            <p className="mt-1 text-xs text-muted-foreground">
              User assignment cannot be changed from this interface
            </p>
          )}
        </div>

        {/* Created/Updated */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Created</Label>
            <div className="mt-1 flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{task.created_at ? new Date(task.created_at).toLocaleDateString() : "Unknown"}</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
            <div className="mt-1 flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : "Unknown"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 