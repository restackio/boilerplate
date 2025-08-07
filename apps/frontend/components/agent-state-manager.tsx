"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Loader2, Play, Square, Send } from "lucide-react";
import { useAgentState } from "@/hooks/use-agent-state";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

interface TextContent {
  type: string;
  text: string;
}

interface MessageOutput {
  type: string;
  role?: string;
  content: TextContent[];
  created_at?: string;
}

interface ResponseOutput {
  output: MessageOutput[];
}

interface Tool {
  name: string;
  [key: string]: unknown;
}

interface ToolList {
  tools: Tool[];
  [key: string]: unknown;
}

interface ParsedMessage {
  role: string;
  content: string;
  timestamp: string;
  type: string;
}

interface AgentResponse {
  type: string;
  response?: ResponseOutput;
  item?: ToolList;
  [key: string]: unknown;
}

interface AgentStateManagerProps {
  taskId: string;
  agentTaskId?: string;
  runId?: string;
  taskDescription: string;
}

export function AgentStateManager({ taskId, agentTaskId, runId, taskDescription }: AgentStateManagerProps) {
  const [message, setMessage] = useState("");
  const { updateTask } = useWorkspaceScopedActions();
  const { responseState, agentResponses, loading, error, sendMessageToAgent, startAgent, stopAgent } = useAgentState({
    taskId,
    agentTaskId,
    runId,
    onStateChange: (newState) => {
      console.log("Agent state changed:", newState);
    },
  });

  // Debug logging for raw state data
  console.log("=== AGENT STATE DEBUG ===");
  console.log("Raw agent state:", responseState);
  console.log("Agent responses:", agentResponses);
  console.log("State type:", typeof responseState);
  console.log("State keys:", responseState ? Object.keys(responseState) : "no state");
  if (responseState && typeof responseState === 'object') {
    console.log("State.data type:", typeof responseState.data);
    console.log("State.data keys:", responseState.data ? Object.keys(responseState.data) : "no data");
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
      case "processing":
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
  const agentStateData = responseState?.data || responseState;
  
  // Handle the streamed data format: "data: data: [{"content":"...","role":"system",...}]"
  let parsedMessages = [];
  let status = "waiting";
  let progress;
  let agentError;
  
  // First, try to extract messages from agent responses
  if (agentResponses && Array.isArray(agentResponses)) {
    // Process agent responses to extract messages
    const messageMap = new Map(); // Track messages by item_id
    
    agentResponses.forEach((response: AgentResponse) => {
      if (response.type === "response.completed" && response.response?.output) {
        response.response.output.forEach((output: MessageOutput) => {
          if (output.type === "message" && output.content) {
            // Extract text content from the message
            const textContent = output.content.find((content: TextContent) => content.type === "output_text");
            if (textContent && textContent.text) {
              parsedMessages.push({
                role: output.role || "assistant",
                content: textContent.text,
                timestamp: new Date(output.created_at || Date.now()).toISOString(),
                type: "response"
              });
            }
          }
        });
      } else if (response.type === "response.output_text.delta" && response.delta) {
        // Handle streaming text deltas
        const itemId = response.item_id;
        if (!messageMap.has(itemId)) {
          messageMap.set(itemId, {
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            type: "streaming"
          });
        }
        messageMap.get(itemId).content += response.delta;
      } else if (response.type === "response.output_text.done" && response.text) {
        // Finalize streaming message
        const itemId = response.item_id;
        if (messageMap.has(itemId)) {
          const message = messageMap.get(itemId);
          message.content = response.text; // Use the complete text
          message.timestamp = new Date().toISOString();
          parsedMessages.push(message);
          messageMap.delete(itemId);
        }
      } else if (response.type === "response.mcp_call.completed" && response.item) {
        // Handle MCP tool calls
        const mcpCall = response.item;
        if (mcpCall.output) {
          parsedMessages.push({
            role: "assistant",
            content: `Tool call: ${mcpCall.name}(${mcpCall.arguments})\n\nOutput: ${mcpCall.output}`,
            timestamp: new Date().toISOString(),
            type: "tool_call",
            toolName: mcpCall.name,
            toolOutput: mcpCall.output
          });
        }
      } else if (response.type === "response.mcp_list_tools.completed" && response.item) {
        // Handle MCP tool listing
        const toolList = response.item;
        if (toolList.tools && toolList.tools.length > 0) {
          const toolNames = toolList.tools.map((tool: Tool) => tool.name).join(", ");
          parsedMessages.push({
            role: "system",
            content: `Available tools: ${toolNames}`,
            timestamp: new Date().toISOString(),
            type: "tool_list"
          });
        }
      }
    });
    
    // Add any remaining incomplete messages
    messageMap.forEach((message) => {
      if (message.content.trim()) {
        parsedMessages.push(message);
      }
    });
  }
  
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
            parsedMessages = [...parsedMessages, ...parsed.flat()];
          } else {
            parsedMessages = [...parsedMessages, ...parsed];
          }
        } else if (parsed.messages) {
          parsedMessages = [...parsedMessages, ...parsed.messages];
          status = parsed.status || "running";
          progress = parsed.progress;
          agentError = parsed.error;
        }
      } catch (parseError) {
        console.error("Failed to parse streamed data:", parseError);
        // If parsing fails, treat the entire string as a single message
        parsedMessages.push({
          role: "assistant",
          content: agentStateData,
          timestamp: new Date().toISOString()
        });
      }
    } else if (agentStateData.messages) {
      // Handle structured data
      parsedMessages = [...parsedMessages, ...agentStateData.messages];
      status = agentStateData.status || "running";
      progress = agentStateData.progress;
      agentError = agentStateData.error;
    } else if (Array.isArray(agentStateData)) {
      // Handle array of messages directly - check for nested arrays
      if (agentStateData.length > 0 && Array.isArray(agentStateData[0])) {
        parsedMessages = [...parsedMessages, ...agentStateData.flat()];
      } else {
        parsedMessages = [...parsedMessages, ...agentStateData];
      }
      status = "running";
    }
  }
  
  // Deduplicate messages based on content and role to avoid showing duplicates
      const messages = parsedMessages.filter((message: ParsedMessage, index: number, self: ParsedMessage[]) => {
    const firstIndex = self.findIndex(m => 
      m.content === message.content && 
      m.role === message.role
    );
    return firstIndex === index;
  });

  // Check if agent is actively processing (has streaming messages)
      const hasStreamingMessages = messages.some((msg: ParsedMessage) => msg.type === "streaming");
  const isProcessing = hasStreamingMessages || status === "running";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Agent State
            <Badge className={getStatusColor(isProcessing ? "processing" : status)}>
              {isProcessing ? "Processing" : status}
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
                    {JSON.stringify(responseState, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Agent State Data:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(agentStateData, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Subscribe Response Data:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(agentResponses, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Parsed Messages:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(messages, null, 2)}
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
                  <div className="space-y-2 overflow-y-auto">
                    {messages.map((msg: ParsedMessage, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-50 border border-blue-200"
                            : msg.role === "system"
                            ? "bg-purple-50 border border-purple-200"
                            : msg.type === "tool_call"
                            ? "bg-orange-50 border border-orange-200"
                            : msg.type === "tool_list"
                            ? "bg-indigo-50 border border-indigo-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium capitalize">
                            {msg.type === "tool_call" ? "Tool Call" : 
                             msg.type === "tool_list" ? "Tool List" : 
                             msg.role}
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
                        {msg.toolName && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Tool:</strong> {msg.toolName}
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

          {agentTaskId && (status === "running" || isProcessing) && (
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