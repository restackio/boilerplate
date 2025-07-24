"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Loader2, Play, Square, Send } from "lucide-react";
import { useAgentState } from "@/hooks/use-agent-state";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface AgentStateManagerProps {
  taskId: string;
  agentTaskId?: string;
  runId?: string;
  taskDescription: string;
}

export function AgentStateManager({ taskId, agentTaskId, runId, taskDescription }: AgentStateManagerProps) {
  const [message, setMessage] = useState("");
  const { updateTask } = useWorkspaceScopedActions();
  const { state, loading, error, sendMessageToAgent, startAgent, stopAgent } = useAgentState({
    taskId,
    agentTaskId,
    runId,
    onStateChange: (newState) => {
      console.log("Agent state changed:", newState);
    },
  });

  const handleStartAgent = async () => {
    try {
      const result = await startAgent(taskDescription);
      if (result && result.runId) {
        // Update the task with the new agent task ID and run ID
        await updateTask(taskId, { agentTaskId: result.runId });
      }
    } catch (error) {
      console.error("Failed to start agent:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      await sendMessageToAgent(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleStopAgent = async () => {
    try {
      await stopAgent();
    } catch (error) {
      console.error("Failed to stop agent:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      case "waiting":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  // Extract state data from the subscription
  const agentStateData = state?.data || state;
  const status = agentStateData?.status || "waiting";
  const messages = agentStateData?.messages || [];
  const progress = agentStateData?.progress;
  const agentError = agentStateData?.error;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Agent State
            <Badge className={getStatusColor(status)}>
              {status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading agent state...</span>
            </div>
          )}

          {agentStateData && (
            <div className="space-y-4">
              {progress !== undefined && (
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Messages</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {messages.map((msg: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium capitalize">
                            {msg.role}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">Error: {agentError}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {!agentTaskId ? (
              <Button onClick={handleStartAgent} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                Start Agent
              </Button>
            ) : (
              <>
                <Button onClick={handleStopAgent} disabled={loading} variant="outline">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Agent
                </Button>
              </>
            )}
          </div>

          {agentTaskId && runId && status === "running" && (
            <div className="mt-4 space-y-2">
              <Textarea
                placeholder="Send a message to the agent..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={!message.trim() || loading}>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 