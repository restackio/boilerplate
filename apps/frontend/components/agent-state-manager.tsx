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

  // Debug logging for raw state data
  console.log("=== AGENT STATE DEBUG ===");
  console.log("Raw agent state:", state);
  console.log("Agent state data:", state?.data || state);
  console.log("State type:", typeof state);
  console.log("State keys:", state ? Object.keys(state) : "no state");
  if (state && typeof state === 'object') {
    console.log("State.data type:", typeof state.data);
    console.log("State.data keys:", state.data ? Object.keys(state.data) : "no data");
  }
  console.log("agentTaskId:", agentTaskId);
  console.log("runId:", runId);
  console.log("taskId:", taskId);
  console.log("=== END DEBUG ===");

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
  
  // Handle the streamed data format: "data: data: [{"content":"...","role":"system",...}]"
  let parsedMessages = [];
  let status = "waiting";
  let progress;
  let agentError;
  
  if (agentStateData) {
    // If the data is a string, try to parse it
    if (typeof agentStateData === 'string') {
      try {
        // Remove the "data: data: " prefix if present
        let dataString = agentStateData;
        if (dataString.startsWith('data: data: ')) {
          dataString = dataString.substring(12); // Remove "data: data: "
        } else if (dataString.startsWith('data: ')) {
          dataString = dataString.substring(6); // Remove "data: "
        }
        
        const parsed = JSON.parse(dataString);
        if (Array.isArray(parsed)) {
          // Handle nested arrays - flatten them
          if (parsed.length > 0 && Array.isArray(parsed[0])) {
            parsedMessages = parsed.flat();
          } else {
            parsedMessages = parsed;
          }
        } else if (parsed.messages) {
          parsedMessages = parsed.messages;
          status = parsed.status || "running";
          progress = parsed.progress;
          agentError = parsed.error;
        }
      } catch (parseError) {
        console.error("Failed to parse streamed data:", parseError);
        // If parsing fails, treat the entire string as a single message
        parsedMessages = [{
          role: "assistant",
          content: agentStateData,
          timestamp: new Date().toISOString()
        }];
      }
    } else if (agentStateData.messages) {
      // Handle structured data
      parsedMessages = agentStateData.messages;
      status = agentStateData.status || "running";
      progress = agentStateData.progress;
      agentError = agentStateData.error;
    } else if (Array.isArray(agentStateData)) {
      // Handle array of messages directly - check for nested arrays
      if (agentStateData.length > 0 && Array.isArray(agentStateData[0])) {
        parsedMessages = agentStateData.flat();
      } else {
        parsedMessages = agentStateData;
      }
      status = "running";
    }
  }
  
  // Deduplicate messages based on content and role to avoid showing duplicates
  const messages = parsedMessages.filter((message: any, index: number, self: any[]) => {
    const firstIndex = self.findIndex(m => 
      m.content === message.content && 
      m.role === message.role
    );
    return firstIndex === index;
  });

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

          {/* Always show debug section for now */}
          <div className="space-y-4">
            {/* Debug section - Raw Data */}
            <details className="text-xs" open>
              <summary className="cursor-pointer text-muted-foreground font-medium">🔍 Raw Data Debug</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>State object:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(state, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Agent State Data:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(agentStateData, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Props:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify({ taskId, agentTaskId, runId, taskDescription }, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
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
                  <h4 className="font-medium mb-2">Messages ({messages.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {messages.map((msg: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-50 border border-blue-200"
                            : msg.role === "system"
                            ? "bg-purple-50 border border-purple-200"
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.tool_calls && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Tool calls:</strong> {JSON.stringify(msg.tool_calls)}
                          </div>
                        )}
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

          {agentTaskId && status === "running" && (
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