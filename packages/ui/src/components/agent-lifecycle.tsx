"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Progress } from "./ui/progress";
import {
  Target,
  Shield,
  TestTube,
  GitBranch,
  Eye,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  TrendingUp,
  MessageSquare,
  Star,
} from "lucide-react";

export interface AgentLifecycleProps {
  agentId: string;
  agentName: string;
  currentVersion: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  priority: "high" | "medium" | "low";
}

interface Guardrail {
  id: string;
  type: "safety" | "compliance" | "performance" | "behavior";
  rule: string;
  severity: "critical" | "warning" | "info";
  enabled: boolean;
}

interface TestCase {
  id: string;
  conversation: string;
  expectedBehavior: string;
  status: "passed" | "failed" | "pending";
  score: number;
}

interface QAMetric {
  name: string;
  current: number;
  target: number;
  trend: "up" | "down" | "stable";
}

interface Approval {
  team: string;
  status: "pending" | "approved" | "rejected";
  reviewer: string;
  timestamp?: string;
  notes?: string;
}

export function AgentLifecycle({
  agentId,
  agentName,
  currentVersion,
}: AgentLifecycleProps) {
  const [activeTab, setActiveTab] = useState("goals");
  const [newVersion, setNewVersion] = useState("");

  const [goals] = useState<Goal[]>([
    {
      id: "1",
      title: "Response Accuracy",
      description: "Maintain high accuracy in technical responses",
      metric: "Approval Rate",
      target: 85,
      priority: "high",
    },
    {
      id: "2",
      title: "Response Speed",
      description: "Respond to user queries quickly",
      metric: "Response Time",
      target: 30,
      priority: "medium",
    },
  ]);

  const [guardrails] = useState<Guardrail[]>([
    {
      id: "1",
      type: "safety",
      rule: "Never share sensitive customer data",
      severity: "critical",
      enabled: true,
    },
    {
      id: "2",
      type: "compliance",
      rule: "Follow GDPR data handling guidelines",
      severity: "critical",
      enabled: true,
    },
    {
      id: "3",
      type: "behavior",
      rule: "Maintain professional tone in all interactions",
      severity: "warning",
      enabled: true,
    },
  ]);

  const [testCases] = useState<TestCase[]>([
    {
      id: "1",
      conversation: "User asks about password reset procedure",
      expectedBehavior: "Provide clear steps without asking for sensitive info",
      status: "passed",
      score: 92,
    },
    {
      id: "2",
      conversation: "User reports critical system outage",
      expectedBehavior: "Escalate immediately with proper urgency",
      status: "passed",
      score: 88,
    },
    {
      id: "3",
      conversation: "User asks for competitor information",
      expectedBehavior:
        "Politely decline and redirect to appropriate resources",
      status: "failed",
      score: 65,
    },
  ]);

  const [qaMetrics] = useState<QAMetric[]>([
    { name: "Approval Rate", current: 89.2, target: 85, trend: "up" },
    { name: "Response Time", current: 28, target: 30, trend: "down" },
    { name: "User Satisfaction", current: 4.2, target: 4.0, trend: "up" },
    { name: "Escalation Rate", current: 12, target: 15, trend: "down" },
  ]);

  const [approvals] = useState<Approval[]>([
    {
      team: "Product",
      status: "approved",
      reviewer: "Sarah Chen",
      timestamp: "2024-01-15 14:30",
      notes: "Goals align with product roadmap",
    },
    {
      team: "Engineering",
      status: "pending",
      reviewer: "Mike Johnson",
    },
    {
      team: "Compliance",
      status: "pending",
      reviewer: "Lisa Rodriguez",
    },
    {
      team: "QA",
      status: "approved",
      reviewer: "Alex Kim",
      timestamp: "2024-01-15 16:45",
      notes: "Regression tests look good",
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
      case "approved":
        return "bg-green-100 text-green-800";
      case "failed":
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-orange-100 text-orange-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Lifecycle Management</h2>
          <p className="text-muted-foreground">
            {agentName} - Version {currentVersion}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="New version (e.g., v2.4.1)"
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
            className="w-40"
          />
          <Button>Create New Version</Button>
        </div>
      </div>

      {/* Lifecycle Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Release Pipeline</h3>
            <Badge variant="outline">In Progress</Badge>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { stage: "Goals", status: "completed", icon: Target },
              { stage: "Testing", status: "in-progress", icon: TestTube },
              { stage: "Release", status: "pending", icon: GitBranch },
              { stage: "QA", status: "pending", icon: Eye },
              { stage: "Approval", status: "pending", icon: Users },
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`p-3 rounded-full mb-2 ${
                      item.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : item.status === "in-progress"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium">{item.stage}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs mt-1 ${getStatusColor(item.status)}`}
                  >
                    {item.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="goals">Goals & Guardrails</TabsTrigger>
          <TabsTrigger value="testing">Regression Testing</TabsTrigger>
          <TabsTrigger value="release">Release Management</TabsTrigger>
          <TabsTrigger value="qa">Live QA</TabsTrigger>
          <TabsTrigger value="approval">Team Approval</TabsTrigger>
        </TabsList>

        {/* Goals & Guardrails */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{goal.title}</h4>
                      <Badge
                        variant={
                          goal.priority === "high" ? "destructive" : "secondary"
                        }
                      >
                        {goal.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {goal.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{goal.metric}:</span>
                      <span>{goal.target}%</span>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  Add Goal
                </Button>
              </CardContent>
            </Card>

            {/* Guardrails */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Safety Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {guardrails.map((guardrail) => (
                  <div key={guardrail.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="capitalize">
                        {guardrail.type}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(guardrail.severity)}>
                          {guardrail.severity}
                        </Badge>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            guardrail.enabled ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                      </div>
                    </div>
                    <p className="text-sm">{guardrail.rule}</p>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  Add Guardrail
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Regression Testing */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TestTube className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">156</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Test Cases
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">92%</span>
                </div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="text-2xl font-bold">12m</span>
                </div>
                <p className="text-sm text-muted-foreground">Avg Test Time</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical Conversation Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conversation Scenario</TableHead>
                    <TableHead>Expected Behavior</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium max-w-xs">
                        {test.conversation}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {test.expectedBehavior}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={test.score} className="w-16" />
                          <span className="text-sm">{test.score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Release Management */}
        <TabsContent value="release" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Version History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { version: "v2.3.1", status: "current", date: "2024-01-15" },
                  { version: "v2.3.0", status: "stable", date: "2024-01-10" },
                  {
                    version: "v2.2.5",
                    status: "deprecated",
                    date: "2024-01-05",
                  },
                ].map((release) => (
                  <div
                    key={release.version}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{release.version}</div>
                      <div className="text-sm text-muted-foreground">
                        {release.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(release.status)}>
                        {release.status}
                      </Badge>
                      {release.status !== "current" && (
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deployment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Traffic Allocation</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">v2.3.1 (Current)</span>
                      <span className="text-sm">85%</span>
                    </div>
                    <Progress value={85} />
                    <div className="flex items-center justify-between">
                      <span className="text-sm">v2.4.0 (Canary)</span>
                      <span className="text-sm">15%</span>
                    </div>
                    <Progress value={15} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rollback Trigger</Label>
                  <Select defaultValue="approval-rate">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approval-rate">
                        Approval Rate &lt; 75%
                      </SelectItem>
                      <SelectItem value="error-rate">
                        Error Rate &gt; 5%
                      </SelectItem>
                      <SelectItem value="response-time">
                        Response Time &gt; 60s
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live QA */}
        <TabsContent value="qa" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {qaMetrics.map((metric) => (
              <Card key={metric.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{metric.name}</span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <div className="text-2xl font-bold">{metric.current}%</div>
                  <div className="text-sm text-muted-foreground">
                    Target: {metric.target}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Conversation Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: "1",
                    user: "john.doe@company.com",
                    topic: "Password reset assistance",
                    rating: 5,
                    feedback: "Very helpful and quick response",
                    timestamp: "2 hours ago",
                  },
                  {
                    id: "2",
                    user: "sarah.smith@company.com",
                    topic: "API integration help",
                    rating: 4,
                    feedback: "Good technical guidance, could be more specific",
                    timestamp: "4 hours ago",
                  },
                  {
                    id: "3",
                    user: "mike.jones@company.com",
                    topic: "Billing inquiry",
                    rating: 2,
                    feedback: "Agent seemed confused about pricing tiers",
                    timestamp: "6 hours ago",
                  },
                ].map((audit) => (
                  <div key={audit.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">{audit.topic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < audit.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {audit.timestamp}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {audit.user}
                    </p>
                    <p className="text-sm">{audit.feedback}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Approval */}
        <TabsContent value="approval" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvals.map((approval) => (
                  <div key={approval.team} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">
                          {approval.team} Team
                        </span>
                      </div>
                      <Badge className={getStatusColor(approval.status)}>
                        {approval.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Reviewer: {approval.reviewer}
                    </div>
                    {approval.timestamp && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {approval.status} on {approval.timestamp}
                      </div>
                    )}
                    {approval.notes && (
                      <div className="text-sm p-2 bg-muted rounded">
                        {approval.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
