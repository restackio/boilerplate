"use client";

import { Textarea } from "@workspace/ui/components/ui/textarea";
import { useState } from "react";
import { TasksTable, type Task } from "@workspace/ui/components/tasks-table";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace-context";

export default function DashboardPage() {
  const [chatMessage, setChatMessage] = useState("");
  const [, setChatHistory] = useState([
    {
      role: "system",
      message:
        "Hello! I'm here to help you create tasks for our support automation system. Describe what you need help with.",
    },
  ]);

  // Get current workspace data and show only first 3 tasks for dashboard
  const { currentWorkspace } = useWorkspace();
  const tasksData: Task[] = currentWorkspace.tasks.slice(0, 3);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    setChatHistory((prev) => [
      ...prev,
      { role: "user", message: chatMessage },
      {
        role: "system",
        message:
          "I'll help you create a task for that. Let me analyze the requirements and assign the appropriate agents.",
      },
    ]);
    setChatMessage("");
  };

  const router = useRouter();

  const handleViewTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  return (
    <div className="space-y-10 max-w-screen-lg mx-auto p-4 pt-20">
      <div className="flex justify-center items-center ">
        <h1 className="text-3xl font-semibold">What are we doing next?</h1>
      </div>

      <div className="flex space-x-2">
        <Textarea
          rows={10}
          placeholder="Describe a task"
          value={chatMessage}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setChatMessage(e.target.value)
          }
          className="flex-1 !min-h-[150px] !max-h-[200px]"
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
      </div>

      {/* My Tasks */}

      <TasksTable
        data={tasksData}
        withFilters={false}
        onViewTask={handleViewTask}
      />
    </div>
  );
}
