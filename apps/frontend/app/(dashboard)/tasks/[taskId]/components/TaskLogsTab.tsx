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
}

// Mock log data - in a real app, this would come from the backend
const mockLogs: LogEntry[] = [
  {
    timestamp: "14:15:32",
    agent: "System",
    action: "Task Initialization",
    type: "system",
    details: "Task created and assigned to agent pool",
    metadata: {
      taskId: "TSK-001",
      priority: "Medium",
      assignedAgents: ["GitHub Support Agent"],
    },
  },
  {
    timestamp: "14:15:45",
    agent: "GitHub Support Agent",
    action: "Repository Analysis",
    type: "analysis",
    details: "Analyzing repository structure and identifying issues",
    metadata: {
      repository: "user-service",
      filesAnalyzed: 45,
      issuesFound: 3,
    },
  },
  {
    timestamp: "14:16:02",
    agent: "GitHub Support Agent",
    action: "Issue Creation",
    type: "action",
    details: "Creating GitHub issue for database performance optimization",
    metadata: {
      issueNumber: 123,
      labels: ["performance", "database"],
      assignee: "philippe",
    },
  },
  {
    timestamp: "14:16:18",
    agent: "GitHub Support Agent",
    action: "Code Review",
    type: "review",
    details: "Reviewing existing database queries for optimization opportunities",
    metadata: {
      queriesReviewed: 12,
      optimizationOpportunities: 5,
      estimatedImprovement: "45% faster",
    },
  },
  {
    timestamp: "14:16:35",
    agent: "GitHub Support Agent",
    action: "Pull Request Creation",
    type: "git",
    details: "Creating pull request with database optimizations",
    metadata: {
      branch: "fix/db-performance-optimization",
      commits: 1,
      filesChanged: 3,
    },
  },
  {
    timestamp: "14:17:12",
    agent: "System",
    action: "Status Update",
    type: "system",
    details: "Task status updated to 'active'",
    metadata: {
      previousStatus: "open",
      newStatus: "active",
    },
  },
];

export function TaskLogsTab({ taskId }: TaskLogsTabProps) {
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Task Logs
        </CardTitle>
        <CardDescription>
          Detailed trace of agent actions and task execution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockLogs.map((log, index) => (
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
      </CardContent>
    </Card>
  );
} 