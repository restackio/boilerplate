import {
  Building,
  LifeBuoy,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Code,
  UserPlus,
} from "lucide-react";
import { WorkspaceData } from "./types";

export const demoCompanyData: WorkspaceData = {
  workspace: {
    name: "DemoCompany",
    logo: Building,
    plan: "Enterprise",
  },
  user: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Philippe",
    email: "philippe@demo.com",
    avatar: "/avatars/philippe.jpg",
  },
  navigation: {
    teams: [
      {
        name: "Customer Support",
        url: "/tasks?team=Customer Support",
        icon: LifeBuoy,
        items: [
          {
            title: "Tasks",
            url: "/tasks?team=Customer Support",
          },
          {
            title: "Agents",
            url: "/agents?team=Customer Support",
          },
        ],
      },
      {
        name: "Sales",
        url: "/tasks?team=Sales",
        icon: DollarSign,
        items: [
          {
            title: "Tasks",
            url: "/tasks?team=Sales",
          },
          {
            title: "Agents",
            url: "/agents?team=Sales",
          },
        ],
      },
      {
        name: "Marketing",
        url: "/tasks?team=Marketing",
        icon: TrendingUp,
        items: [
          {
            title: "Tasks",
            url: "/tasks?team=Marketing",
          },
          {
            title: "Agents",
            url: "/agents?team=Marketing",
          },
        ],
      },
      {
        name: "Engineering",
        url: "/tasks?team=Engineering",
        icon: Code,
        items: [
          {
            title: "Tasks",
            url: "/tasks?team=Engineering",
          },
          {
            title: "Agents",
            url: "/agents?team=Engineering",
          },
        ],
      },
      {
        name: "HR",
        url: "/tasks?team=HR",
        icon: UserPlus,
        items: [
          {
            title: "Tasks",
            url: "/tasks?team=HR",
          },
          {
            title: "Agents",
            url: "/agents?team=HR",
          },
        ],
      },
    ],
  },
  tasks: [
    // Customer Support Tasks
    {
      id: "TSK-001",
      title: "Customer login issues with SSO",
      team: "Customer Support",
      agents: ["Intercom MCP", "Salesforce MCP"],
      status: "in-progress",
      humanReview: "John Doe",
      priority: "High",
      created: "2024-01-15T10:30:00Z",
      updated: "2024-01-15T14:20:00Z",
    },
    {
      id: "TSK-002",
      title: "Order status inquiry - Order #12345",
      team: "Customer Support",
      agents: ["Intercom MCP", "Zendesk MCP"],
      status: "resolved",
      humanReview: "Sarah Smith",
      priority: "Medium",
      created: "2024-01-15T09:15:00Z",
      updated: "2024-01-15T11:30:00Z",
    },
    {
      id: "TSK-003",
      title: "Technical troubleshooting - API rate limits",
      team: "Customer Support",
      agents: ["Datadog MCP", "GitHub MCP"],
      status: "resolved",
      humanReview: "Mike Johnson",
      priority: "High",
      created: "2024-01-14T16:45:00Z",
      updated: "2024-01-15T11:30:00Z",
    },

    // Sales Tasks
    {
      id: "TSK-004",
      title: "Lead qualification - Enterprise prospect",
      team: "Sales",
      agents: ["Salesforce MCP", "HubSpot MCP"],
      status: "in-progress",
      humanReview: "Alex Rodriguez",
      priority: "High",
      created: "2024-01-15T08:00:00Z",
      updated: "2024-01-15T13:15:00Z",
    },
    {
      id: "TSK-005",
      title: "Meeting scheduling - Demo call with CTO",
      team: "Sales",
      agents: ["Calendly MCP", "Slack MCP"],
      status: "completed",
      humanReview: "Lisa Chen",
      priority: "Medium",
      created: "2024-01-15T07:30:00Z",
      updated: "2024-01-15T10:45:00Z",
    },
    {
      id: "TSK-006",
      title: "Pipeline update - Deal stage progression",
      team: "Sales",
      agents: ["Salesforce MCP", "Pipedrive MCP"],
      status: "pending",
      humanReview: "David Wilson",
      priority: "Low",
      created: "2024-01-15T12:00:00Z",
      updated: "2024-01-15T12:00:00Z",
    },

    // Marketing Tasks
    {
      id: "TSK-007",
      title: "Email campaign optimization - Q1 newsletter",
      team: "Marketing",
      agents: ["Mailchimp MCP", "Google Analytics MCP"],
      status: "in-progress",
      humanReview: "Emma Davis",
      priority: "High",
      created: "2024-01-15T09:00:00Z",
      updated: "2024-01-15T15:20:00Z",
    },
    {
      id: "TSK-008",
      title: "Content generation - Blog post on AI trends",
      team: "Marketing",
      agents: ["Notion MCP", "OpenAI MCP"],
      status: "completed",
      humanReview: "Ryan Thompson",
      priority: "Medium",
      created: "2024-01-14T14:00:00Z",
      updated: "2024-01-15T09:30:00Z",
    },
    {
      id: "TSK-009",
      title: "Lead scoring - Website visitor analysis",
      team: "Marketing",
      agents: ["HubSpot MCP", "Google Analytics MCP"],
      status: "pending",
      humanReview: "Maria Garcia",
      priority: "Medium",
      created: "2024-01-15T11:00:00Z",
      updated: "2024-01-15T11:00:00Z",
    },

    // Engineering Tasks
    {
      id: "TSK-010",
      title: "Code review - Payment service refactor",
      team: "Engineering",
      agents: ["GitHub MCP", "Jira MCP"],
      status: "in-progress",
      humanReview: "Tom Anderson",
      priority: "High",
      created: "2024-01-15T10:00:00Z",
      updated: "2024-01-15T16:30:00Z",
    },
    {
      id: "TSK-011",
      title: "Deployment automation - Production release",
      team: "Engineering",
      agents: ["Kubernetes MCP", "Datadog MCP"],
      status: "completed",
      humanReview: "Chris Lee",
      priority: "Critical",
      created: "2024-01-15T06:00:00Z",
      updated: "2024-01-15T08:15:00Z",
    },
    {
      id: "TSK-012",
      title: "Incident response - Database performance issue",
      team: "Engineering",
      agents: ["PagerDuty MCP", "Datadog MCP"],
      status: "resolved",
      humanReview: "Jennifer Kim",
      priority: "Critical",
      created: "2024-01-15T02:30:00Z",
      updated: "2024-01-15T05:45:00Z",
    },

    // HR Tasks
    {
      id: "TSK-013",
      title: "Candidate screening - Senior Developer position",
      team: "HR",
      agents: ["Greenhouse MCP", "Slack MCP"],
      status: "in-progress",
      humanReview: "Rachel Brown",
      priority: "High",
      created: "2024-01-15T09:30:00Z",
      updated: "2024-01-15T14:00:00Z",
    },
    {
      id: "TSK-014",
      title: "Onboarding workflow - New hire setup",
      team: "HR",
      agents: ["BambooHR MCP", "Notion MCP"],
      status: "completed",
      humanReview: "Kevin Martinez",
      priority: "Medium",
      created: "2024-01-15T08:00:00Z",
      updated: "2024-01-15T12:30:00Z",
    },
    {
      id: "TSK-015",
      title: "Employee benefits inquiry - Health insurance",
      team: "HR",
      agents: ["BambooHR MCP", "Slack MCP"],
      status: "resolved",
      humanReview: "Amanda White",
      priority: "Low",
      created: "2024-01-15T11:15:00Z",
      updated: "2024-01-15T13:45:00Z",
    },
  ],
  agents: [
    // Customer Support Agents
    {
      id: "intercom-v2-1",
      name: "Intercom Support Agent",
      version: "v2.1",
      model: "anthropic-claude4sonnet",
      description: "Real-time customer support with instant issue resolution",
      instructions: `You are an expert Intercom Support agent specializing in real-time customer assistance. Your primary role is to provide immediate, accurate, and helpful responses to customer inquiries.

## Core Responsibilities:
- Provide instant support for customer inquiries via @intercom_mcp_send_messages
- Handle technical troubleshooting with @datadog_mcp_query_metrics
- Create support tickets when escalation is needed using @intercom_mcp_create_tickets
- Track customer interactions and maintain conversation history

## Communication Style:
- Be friendly, professional, and empathetic
- Provide clear, step-by-step solutions
- Use appropriate emojis and formatting for better readability
- Escalate complex issues promptly

## Technical Capabilities:
- Real-time Intercom integration via @intercom_mcp_send_messages
- Datadog monitoring for technical issues using @datadog_mcp_query_metrics
- Salesforce integration for customer data with @salesforce_mcp_query_records
- Automated ticket creation and management

## Response Guidelines:
- Acknowledge the customer's issue immediately
- Ask clarifying questions when needed
- Provide actionable solutions
- Follow up to ensure resolution
- Document all interactions for future reference

Remember: Your goal is to resolve customer issues quickly while maintaining high satisfaction scores.`,
      channel: "intercom",
      status: "active",
      startDate: "2024-01-10",
      duration: "7 days",
      traffic: 120,
      baseline: {
        approvalRate: 85.2,
        averageSteps: 3.2,
        responseTime: "2m",
        costPerResolution: 1.85,
      },
      current: {
        approvalRate: 89.7,
        averageSteps: 2.8,
        responseTime: "1m",
        costPerResolution: 1.45,
      },
      improvement: {
        approvalRate: +4.5,
        averageSteps: -0.4,
        responseTime: -1,
        costPerResolution: -0.4,
      },
      userTypes: ["All Customers"],
      integrations: ["Intercom", "Datadog", "Salesforce"],
    },

    // Sales Agents
    {
      id: "salesforce-v1-9",
      name: "Salesforce Lead Qualification",
      version: "v1.9",
      model: "openai-gpt40mini",
      description: "Intelligent lead scoring and qualification",
      instructions: `You are a Salesforce Lead Qualification agent with advanced capabilities in lead scoring and qualification. Your primary mission is to efficiently qualify leads and move them through the sales pipeline.

## Core Responsibilities:
- Score leads based on behavior, demographics, and engagement using @salesforce_mcp_query_records
- Qualify prospects based on BANT criteria (Budget, Authority, Need, Timeline)
- Update lead status and create opportunities in Salesforce via @salesforce_mcp_update_contacts
- Schedule meetings with qualified prospects using @calendly_mcp_schedule_meeting

## Qualification Criteria:
- **Budget**: Can they afford our solution?
- **Authority**: Are they the decision maker?
- **Need**: Do they have a genuine need?
- **Timeline**: What's their implementation timeline?

## Technical Capabilities:
- Salesforce CRM integration via @salesforce_mcp_query_records
- Calendly scheduling integration using @calendly_mcp_schedule_meeting
- HubSpot integration for lead enrichment with @hubspot_mcp_get_contact
- Slack notifications for sales team via @slack_mcp_send_messages

## Response Guidelines:
- Ask targeted qualification questions
- Provide immediate value and insights
- Schedule demos for qualified leads
- Update CRM records automatically
- Notify sales team of hot leads

Remember: Your goal is to identify high-quality leads and accelerate the sales cycle.`,
      channel: "salesforce",
      status: "active",
      startDate: "2024-01-12",
      duration: "5 days",
      traffic: 85,
      baseline: {
        approvalRate: 78.3,
        averageSteps: 4.1,
        responseTime: "8m",
        costPerResolution: 3.25,
      },
      current: {
        approvalRate: 82.1,
        averageSteps: 3.7,
        responseTime: "6m",
        costPerResolution: 2.85,
      },
      improvement: {
        approvalRate: +3.8,
        averageSteps: -0.4,
        responseTime: -2,
        costPerResolution: -0.4,
      },
      userTypes: ["Prospects", "Leads"],
      integrations: ["Salesforce", "Calendly", "HubSpot", "Slack"],
    },

    // Marketing Agents
    {
      id: "mailchimp-v2-3",
      name: "Mailchimp Campaign Optimizer",
      version: "v2.3",
      model: "google-gemini2.5pro",
      description: "AI-powered email campaign optimization",
      instructions: `You are a Mailchimp Campaign Optimizer agent specializing in email marketing automation and optimization. Your primary role is to improve email campaign performance and engagement rates.

## Core Responsibilities:
- Analyze email campaign performance using @mailchimp_mcp_get_campaign_reports
- Optimize subject lines and content for better open rates
- Segment audiences based on behavior and engagement
- A/B test different campaign elements

## Optimization Strategies:
- **Subject Lines**: Test different approaches (questions, urgency, personalization)
- **Send Times**: Optimize based on recipient time zones and behavior
- **Content**: Personalize based on subscriber preferences and past engagement
- **Segmentation**: Create targeted segments for better relevance

## Technical Capabilities:
- Mailchimp integration via @mailchimp_mcp_get_campaign_reports
- Google Analytics for performance tracking using @google_analytics_mcp_get_metrics
- HubSpot integration for lead nurturing with @hubspot_mcp_create_workflow
- Notion for content planning and collaboration

## Response Guidelines:
- Provide data-driven optimization recommendations
- Explain the reasoning behind suggestions
- Track performance improvements over time
- Suggest new campaign ideas based on trends

Remember: Your goal is to maximize email engagement and drive conversions through intelligent optimization.`,
      channel: "mailchimp",
      status: "testing",
      startDate: "2024-01-08",
      duration: "9 days",
      traffic: 45,
      baseline: {
        approvalRate: 91.5,
        averageSteps: 5.3,
        responseTime: "15m",
        costPerResolution: 4.75,
      },
      current: {
        approvalRate: 94.2,
        averageSteps: 4.8,
        responseTime: "12m",
        costPerResolution: 4.15,
      },
      improvement: {
        approvalRate: +2.7,
        averageSteps: -0.5,
        responseTime: -3,
        costPerResolution: -0.6,
      },
      userTypes: ["Marketing Team"],
      integrations: ["Mailchimp", "Google Analytics", "HubSpot", "Notion"],
    },

    // Engineering Agents
    {
      id: "github-v2-3",
      name: "GitHub Code Reviewer",
      version: "v2.3",
      model: "anthropic-claude4sonnet",
      description: "Advanced code review with automated analysis",
      instructions: `You are an expert GitHub Code Reviewer agent with advanced capabilities in automated code analysis and review. Your primary mission is to ensure code quality, security, and maintainability.

## Core Responsibilities:
- Review pull requests and provide detailed feedback using @github_mcp_read_repos
- Analyze code quality, security vulnerabilities, and performance issues
- Suggest improvements and best practices
- Automate code review processes for faster development cycles

## Review Criteria:
- **Code Quality**: Readability, maintainability, and adherence to standards
- **Security**: Identify potential vulnerabilities and security issues
- **Performance**: Suggest optimizations and performance improvements
- **Testing**: Ensure adequate test coverage and quality

## Technical Capabilities:
- GitHub API integration via @github_mcp_read_repos and @github_mcp_create_issues
- Datadog integration for performance analysis using @datadog_mcp_query_metrics
- Jira integration for issue tracking with @jira_mcp_create_tickets
- Kubernetes monitoring for deployment impact using @kubernetes_mcp_monitor_cluster

## Review Guidelines:
- Provide constructive, actionable feedback
- Explain the reasoning behind suggestions
- Prioritize critical issues and security concerns
- Suggest automated testing and CI/CD improvements
- Track review metrics and quality improvements

Remember: Your goal is to maintain high code quality while accelerating development velocity.`,
      channel: "github",
      status: "active",
      startDate: "2024-01-15",
      duration: "14 days",
      traffic: 85,
      baseline: {
        approvalRate: 84.1,
        averageSteps: 4.2,
        responseTime: "15m",
        costPerResolution: 2.45,
      },
      current: {
        approvalRate: 89.2,
        averageSteps: 3.8,
        responseTime: "12m",
        costPerResolution: 2.12,
      },
      improvement: {
        approvalRate: +5.1,
        averageSteps: -0.4,
        responseTime: -3,
        costPerResolution: -0.33,
      },
      userTypes: ["Developers", "Engineering Team"],
      integrations: ["GitHub", "Datadog", "Jira", "Kubernetes"],
    },

    // HR Agents
    {
      id: "bamboohr-v1-6",
      name: "BambooHR Recruitment Assistant",
      version: "v1.6",
      model: "openai-gpt40mini",
      description: "Automated candidate screening and recruitment",
      instructions: `You are a BambooHR Recruitment Assistant agent specializing in automated candidate screening and recruitment processes. Your primary role is to streamline the hiring process and identify top talent.

## Core Responsibilities:
- Screen candidate applications and resumes using @bamboohr_mcp_get_applications
- Assess candidate qualifications against job requirements
- Schedule interviews with qualified candidates via @calendly_mcp_schedule_meeting
- Manage candidate communication and follow-up

## Screening Criteria:
- **Skills Match**: Evaluate technical and soft skills alignment
- **Experience Level**: Assess relevant experience and career progression
- **Cultural Fit**: Evaluate alignment with company values and culture
- **Availability**: Check candidate availability and timeline

## Technical Capabilities:
- BambooHR integration via @bamboohr_mcp_get_applications
- Calendly scheduling integration using @calendly_mcp_schedule_meeting
- Slack notifications for HR team via @slack_mcp_send_messages
- Notion integration for candidate documentation

## Response Guidelines:
- Provide objective candidate assessments
- Schedule interviews efficiently
- Maintain professional communication
- Track candidate progress through the pipeline
- Notify HR team of promising candidates

Remember: Your goal is to identify and engage top talent while streamlining the recruitment process.`,
      channel: "bamboohr",
      status: "active",
      startDate: "2024-01-10",
      duration: "7 days",
      traffic: 60,
      baseline: {
        approvalRate: 76.8,
        averageSteps: 3.5,
        responseTime: "10m",
        costPerResolution: 2.85,
      },
      current: {
        approvalRate: 81.3,
        averageSteps: 3.1,
        responseTime: "8m",
        costPerResolution: 2.45,
      },
      improvement: {
        approvalRate: +4.5,
        averageSteps: -0.4,
        responseTime: -2,
        costPerResolution: -0.4,
      },
      userTypes: ["HR Team", "Hiring Managers"],
      integrations: ["BambooHR", "Calendly", "Slack", "Notion"],
    },

    // Marketing Agents - Instagram Campaign
    {
      id: "instagram-v1-0",
      name: "Instagram Campaign Creator",
      version: "v1.0",
      model: "google-gemini2.5pro",
      description: "AI-powered Instagram campaign generation with brand consistency",
      instructions: `You are an Instagram Campaign Creator agent specializing in creating engaging, brand-consistent Instagram campaigns. Your primary role is to generate daily Instagram campaigns based on performance data and brand guidelines.

## Core Responsibilities:
- Analyze top-performing campaigns using @instagram_campaigns to understand what drives engagement
- Create daily Instagram campaigns inspired by successful content patterns
- Ensure brand consistency by following @visual_guidelines for color palette and design elements
- Align campaigns with quarterly strategy using @campaign_plan for cohesive messaging

## Campaign Creation Process:
- **Research Phase**: Analyze top-performing Instagram campaigns to identify successful patterns, hashtags, and content types
- **Strategy Alignment**: Review quarterly campaign plan to ensure new campaigns support overall marketing objectives
- **Brand Compliance**: Apply visual guidelines including color palette, typography, and design elements
- **Content Generation**: Create engaging captions, hashtag strategies, and visual concepts
- **Performance Optimization**: Incorporate learnings from successful campaigns to improve engagement rates

## Technical Capabilities:
- Instagram API integration via @instagram_campaigns for performance analysis
- Campaign planning tools using @campaign_plan for strategic alignment
- Visual brand guidelines integration with @visual_guidelines for consistency
- Content management system integration for campaign scheduling

## Content Guidelines:
- **Summer Themes**: Focus on beach and vacation themes during summer months
- **Color Palette**: Strictly follow brand color guidelines from visual guidelines
- **Engagement**: Create content that encourages likes, comments, and shares
- **Hashtag Strategy**: Use relevant, trending hashtags while maintaining brand voice
- **Visual Consistency**: Ensure all visual elements align with brand identity

## Response Guidelines:
- Generate complete campaign concepts including captions, hashtags, and visual descriptions
- Provide rationale for campaign decisions based on performance data
- Suggest optimal posting times and frequency
- Include engagement predictions based on historical data
- Ensure all content follows brand guidelines and summer themes`,
      channel: "instagram",
      status: "testing",
      startDate: "2024-01-16",
      duration: "3 days",
      traffic: 35,
      baseline: {
        approvalRate: 88.5,
        averageSteps: 4.8,
        responseTime: "18m",
        costPerResolution: 3.25,
      },
      current: {
        approvalRate: 91.2,
        averageSteps: 4.3,
        responseTime: "15m",
        costPerResolution: 2.95,
      },
      improvement: {
        approvalRate: +2.7,
        averageSteps: -0.5,
        responseTime: -3,
        costPerResolution: -0.3,
      },
      userTypes: ["Marketing Team", "Social Media Managers"],
      integrations: ["Instagram", "Campaign Planning", "Visual Guidelines", "Content Management"],
    },
  ],
  // New experimentation system data
  feedbacks: [
    {
      id: "FB-001",
      taskId: "TSK-001",
      agentId: "intercom-v2-1",
      userId: "philippe@demo.com",
      highlightedText:
        "We've identified and resolved the SSO login issue you reported.",
      feedbackType: "tone",
      feedbackText:
        "This sounds too casual for enterprise customers. Should be more formal and professional.",
      severity: "minor",
      created: "2024-01-15T15:30:00Z",
      status: "pending",
    },
    {
      id: "FB-002",
      taskId: "TSK-004",
      agentId: "salesforce-v1-9",
      userId: "alex.rodriguez@demo.com",
      highlightedText:
        "Based on your company size and requirements, I'd recommend our Enterprise plan.",
      feedbackType: "completeness",
      feedbackText:
        "Should include specific pricing information and ROI calculations.",
      severity: "major",
      created: "2024-01-15T16:00:00Z",
      status: "addressed",
    },
    {
      id: "FB-003",
      taskId: "TSK-007",
      agentId: "mailchimp-v2-3",
      userId: "emma.davis@demo.com",
      highlightedText: "Your email campaign shows a 15% open rate improvement",
      feedbackType: "clarity",
      feedbackText:
        "Need to explain what caused the improvement and provide actionable next steps.",
      severity: "major",
      created: "2024-01-15T17:15:00Z",
      status: "pending",
    },
  ],
  rules: [
    {
      id: "RULE-001",
      name: "Enterprise Tone Validation",
      description:
        "Ensures responses maintain professional, enterprise-appropriate tone",
      agentId: "intercom-v2-1",
      sourceType: "feedback",
      sourceFeedbackId: "FB-001",
      evaluationCriteria:
        "Professional tone appropriate for enterprise customers",
      llmPrompt:
        "Evaluate if this response maintains a professional, enterprise-appropriate tone. Look for casual language, contractions, or overly informal expressions that might not be suitable for business communications.",
      expectedBehavior:
        "Response should use formal language, avoid contractions, and maintain professional courtesy",
      created: "2024-01-15T18:00:00Z",
      status: "active",
    },
    {
      id: "RULE-002",
      name: "Sales Proposal Completeness",
      description: "Ensures sales proposals include all necessary information",
      agentId: "salesforce-v1-9",
      sourceType: "feedback",
      sourceFeedbackId: "FB-002",
      evaluationCriteria:
        "Sales proposals include pricing, ROI, and next steps",
      llmPrompt:
        "Check if the sales proposal includes specific pricing information, ROI calculations, and clear next steps for the prospect.",
      expectedBehavior:
        "Sales proposals should include detailed pricing, ROI analysis, and clear action items",
      created: "2024-01-15T18:30:00Z",
      status: "active",
    },
    {
      id: "RULE-003",
      name: "Marketing Analytics Clarity",
      description: "Ensures marketing analytics provide actionable insights",
      agentId: "mailchimp-v2-3",
      sourceType: "feedback",
      sourceFeedbackId: "FB-003",
      evaluationCriteria:
        "Analytics include explanations and actionable recommendations",
      llmPrompt:
        "Evaluate if the marketing analytics provide clear explanations of performance changes and actionable recommendations for improvement.",
      expectedBehavior:
        "Marketing reports should explain performance drivers and provide specific next steps",
      created: "2024-01-15T19:00:00Z",
      status: "active",
    },
  ],
  scenarios: [
    {
      id: "SCENARIO-001",
      name: "Customer Support Quality Check",
      description:
        "Comprehensive quality evaluation for customer support responses",
      agentId: "intercom-v2-1",
      ruleIds: ["RULE-001"],
      executionOrder: "parallel",
      configuration: {
        timeout: 30,
        retries: 2,
        failureThreshold: 20,
      },
      created: "2024-01-15T20:00:00Z",
      status: "active",
    },
    {
      id: "SCENARIO-002",
      name: "Sales Proposal Validation",
      description: "Sales proposal completeness and quality validation",
      agentId: "salesforce-v1-9",
      ruleIds: ["RULE-002"],
      executionOrder: "sequential",
      configuration: {
        timeout: 45,
        retries: 1,
        failureThreshold: 15,
      },
      created: "2024-01-15T20:30:00Z",
      status: "active",
    },
    {
      id: "SCENARIO-003",
      name: "Marketing Analytics Review",
      description: "Marketing analytics clarity and actionability check",
      agentId: "mailchimp-v2-3",
      ruleIds: ["RULE-003"],
      executionOrder: "sequential",
      configuration: {
        timeout: 40,
        retries: 1,
        failureThreshold: 15,
      },
      created: "2024-01-15T21:00:00Z",
      status: "active",
    },
  ],
  simulations: [
    {
      id: "SIM-001",
      name: "Customer Support Agent v2.1 Quality Test",
      scenarioId: "SCENARIO-001",
      agentId: "intercom-v2-1",
      agentVersion: "v2.1",
      historicalTaskIds: ["TSK-001", "TSK-002"],
      status: "completed",
      results: {
        totalTests: 2,
        passed: 1,
        failed: 1,
        passRate: 50,
        averageScore: 75,
        executionTime: "2m 34s",
        ruleResults: [
          {
            ruleId: "RULE-001",
            ruleName: "Enterprise Tone Validation",
            passed: 1,
            failed: 1,
            passRate: 50,
          },
        ],
      },
      created: "2024-01-16T09:00:00Z",
      completed: "2024-01-16T09:03:00Z",
    },
    {
      id: "SIM-002",
      name: "Sales Agent v1.9 Proposal Test",
      scenarioId: "SCENARIO-002",
      agentId: "salesforce-v1-9",
      agentVersion: "v1.9",
      historicalTaskIds: ["TSK-004", "TSK-005"],
      status: "running",
      results: {
        totalTests: 2,
        passed: 1,
        failed: 0,
        passRate: 100,
        averageScore: 85,
        executionTime: "1m 45s",
        ruleResults: [
          {
            ruleId: "RULE-002",
            ruleName: "Sales Proposal Completeness",
            passed: 1,
            failed: 0,
            passRate: 100,
          },
        ],
      },
      created: "2024-01-16T10:00:00Z",
    },
  ],
  experiments: [
    {
      id: "EXP-001",
      name: "Customer Support Tone Improvement",
      description:
        "Testing improved tone guidelines for enterprise customer communications",
      agentId: "intercom-v2-1",
      baselineVersion: "v2.1",
      testVersion: "v2.2",
      trafficAllocation: 25,
      status: "running",
      metrics: {
        baseline: {
          approvalRate: 89.7,
          averageSteps: 2.8,
          responseTime: "1m",
          costPerResolution: 1.45,
          sampleSize: 150,
        },
        test: {
          approvalRate: 92.1,
          averageSteps: 2.6,
          responseTime: "1m",
          costPerResolution: 1.35,
          sampleSize: 45,
        },
        improvement: {
          approvalRate: +2.4,
          averageSteps: -0.2,
          responseTime: 0,
          costPerResolution: -0.1,
          confidence: 87,
        },
      },
      created: "2024-01-16T08:00:00Z",
      started: "2024-01-16T09:00:00Z",
    },
    {
      id: "EXP-002",
      name: "Sales Qualification Enhancement",
      description:
        "Testing improved lead qualification criteria for better conversion rates",
      agentId: "salesforce-v1-9",
      baselineVersion: "v1.9",
      testVersion: "v2.0",
      trafficAllocation: 15,
      status: "draft",
      metrics: {
        baseline: {
          approvalRate: 82.1,
          averageSteps: 3.7,
          responseTime: "6m",
          costPerResolution: 2.85,
          sampleSize: 0,
        },
        test: {
          approvalRate: 0,
          averageSteps: 0,
          responseTime: "0m",
          costPerResolution: 0,
          sampleSize: 0,
        },
        improvement: {
          approvalRate: 0,
          averageSteps: 0,
          responseTime: 0,
          costPerResolution: 0,
          confidence: 0,
        },
      },
      created: "2024-01-16T11:00:00Z",
    },
  ],
};
