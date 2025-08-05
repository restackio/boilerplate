"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Badge } from "@workspace/ui/components/ui/badge";
import {
  Bot,
  GitBranch,
  Mail,
  Code,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  agent: string;
  action: string;
  type: string;
  details: string;
  metadata?: Record<string, any>;
}

interface TaskLogsTabProps {
  taskId: string;
  agentResponses?: any[];
}

export function TaskLogsTab({ taskId, agentResponses }: TaskLogsTabProps) {
  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case "system":
        return <Bot className="h-4 w-4 text-purple-500" />;
      case "analysis":
        return <Activity className="h-4 w-4 text-orange-500" />;
      case "action":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "review":
        return <FileText className="h-4 w-4 text-indigo-500" />;
      case "git":
        return <GitBranch className="h-4 w-4 text-gray-500" />;
      case "communication":
        return <Mail className="h-4 w-4 text-pink-500" />;
      case "tool-call":
        return <Code className="h-4 w-4 text-blue-500" />;
      case "tool-list":
        return <FileText className="h-4 w-4 text-cyan-500" />;
      case "assistant":
        return <Bot className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "system":
        return "bg-purple-100 text-purple-800";
      case "analysis":
        return "bg-orange-100 text-orange-800";
      case "action":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-indigo-100 text-indigo-800";
      case "git":
        return "bg-gray-100 text-gray-800";
      case "communication":
        return "bg-pink-100 text-pink-800";
      case "tool-call":
        return "bg-blue-100 text-blue-800";
      case "tool-list":
        return "bg-cyan-100 text-cyan-800";
      case "assistant":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Convert agent responses to log entries
  const realLogs: LogEntry[] = [];
  
  if (agentResponses && Array.isArray(agentResponses)) {
    agentResponses.forEach((response: any) => {
      if (response.type === "response.output_item.added" && response.item) {
        const item = response.item;
        if (item.type === "mcp_call") {
          realLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            agent: "Agent",
            action: "Tool Call Started",
            type: "tool-call",
            details: `Started tool call: ${item.name}`,
            metadata: {
              toolName: item.name,
              arguments: item.arguments || "none",
            },
          });
        } else if (item.type === "mcp_list_tools") {
          realLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            agent: "Agent",
            action: "Tool Discovery",
            type: "tool-list",
            details: "Fetching available tools",
            metadata: {
              serverLabel: item.server_label,
            },
          });
        }
      } else if (response.type === "response.output_item.done" && response.item) {
        const item = response.item;
        if (item.type === "mcp_call") {
          realLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            agent: "Agent",
            action: "Tool Call Completed",
            type: "tool-call",
            details: `Completed tool call: ${item.name}`,
            metadata: {
              toolName: item.name,
              outputLength: item.output ? item.output.length : 0,
            },
          });
        } else if (item.type === "mcp_list_tools") {
          realLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            agent: "Agent",
            action: "Tools Listed",
            type: "tool-list",
            details: `Found ${item.tools?.length || 0} available tools`,
            metadata: {
              toolCount: item.tools?.length || 0,
              serverLabel: item.server_label,
            },
          });
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Agent Activity Log
        </CardTitle>
        <CardDescription>
          Real-time trace of agent actions and tool executions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {realLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agent activity yet</p>
            <p className="text-sm">Agent responses will appear here as they happen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {realLogs.map((log, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex-shrink-0 mt-1">
                  {getLogTypeIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {log.agent}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getLogTypeColor(log.type)}`}>
                        {log.type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                  </div>
                  <div className="text-sm font-medium mb-1">
                    {log.action}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{log.details}</div>
                  {log.metadata && (
                    <div className="text-xs p-2 rounded border bg-background">
                      <div className="font-mono">
                        {Object.entries(log.metadata).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between"
                            >
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-right ml-2">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 