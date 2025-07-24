export interface WorkspaceData {
  workspace: {
    name: string;
    logo: any; // React.ElementType
    plan: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  navigation: {
    teams: Array<{
      name: string;
      url: string;
      icon: any; // React.ElementType
      items: Array<{
        title: string;
        url: string;
      }>;
    }>;
  };
  tasks: Array<{
    id: string;
    title: string;
    team: string;
    agents: string[];
    status: "pending" | "in-progress" | "resolved" | "completed";
    humanReview: string;
    priority: "Low" | "Medium" | "High" | "Critical";
    created: string;
    updated: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    version: string;
    model:
      | "openai-gpt40mini"
      | "google-gemini2.5pro"
      | "anthropic-claude4sonnet";
    description: string;
    instructions: string;
    channel:
      | "github"
      | "slack"
      | "email"
      | "alerts"
      | "intercom"
      | "salesforce"
      | "mailchimp"
      | "bamboohr"
      | "instagram";
    status: "active" | "testing" | "paused";
    startDate: string;
    duration: string;
    traffic: number;
    baseline: {
      approvalRate: number;
      averageSteps: number;
      responseTime: string;
      costPerResolution: number;
    };
    current: {
      approvalRate: number;
      averageSteps: number;
      responseTime: string;
      costPerResolution: number;
    };
    improvement: {
      approvalRate: number;
      averageSteps: number;
      responseTime: number;
      costPerResolution: number;
    };
    userTypes: string[];
    integrations: string[];
  }>;
  // New experimentation system data
  feedbacks: Array<{
    id: string;
    taskId: string;
    agentId: string;
    userId: string;
    highlightedText: string;
    feedbackType:
      | "tone"
      | "accuracy"
      | "completeness"
      | "clarity"
      | "compliance";
    feedbackText: string;
    severity: "minor" | "major" | "critical";
    created: string;
    status: "pending" | "addressed" | "dismissed";
  }>;
  rules: Array<{
    id: string;
    name: string;
    description: string;
    agentId: string;
    sourceType: "feedback" | "manual";
    sourceFeedbackId?: string;
    evaluationCriteria: string;
    llmPrompt: string;
    expectedBehavior: string;
    created: string;
    status: "active" | "draft" | "archived";
  }>;
  scenarios: Array<{
    id: string;
    name: string;
    description: string;
    agentId: string;
    ruleIds: string[];
    executionOrder: "parallel" | "sequential";
    configuration: {
      timeout: number;
      retries: number;
      failureThreshold: number;
    };
    created: string;
    status: "active" | "draft" | "archived";
  }>;
  simulations: Array<{
    id: string;
    name: string;
    scenarioId: string;
    agentId: string;
    agentVersion: string;
    historicalTaskIds: string[];
    status: "running" | "completed" | "failed" | "queued";
    results: {
      totalTests: number;
      passed: number;
      failed: number;
      passRate: number;
      averageScore: number;
      executionTime: string;
      ruleResults: Array<{
        ruleId: string;
        ruleName: string;
        passed: number;
        failed: number;
        passRate: number;
      }>;
    };
    created: string;
    completed?: string;
  }>;
  experiments: Array<{
    id: string;
    name: string;
    description: string;
    agentId: string;
    baselineVersion: string;
    testVersion: string;
    trafficAllocation: number; // Percentage for test version
    status: "draft" | "running" | "completed" | "paused";
    metrics: {
      baseline: {
        approvalRate: number;
        averageSteps: number;
        responseTime: string;
        costPerResolution: number;
        sampleSize: number;
      };
      test: {
        approvalRate: number;
        averageSteps: number;
        responseTime: string;
        costPerResolution: number;
        sampleSize: number;
      };
      improvement: {
        approvalRate: number;
        averageSteps: number;
        responseTime: number;
        costPerResolution: number;
        confidence: number;
      };
    };
    created: string;
    started?: string;
    completed?: string;
  }>;
}
