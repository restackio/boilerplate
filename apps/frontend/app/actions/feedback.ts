"use server";

import { executeWorkflow } from "./workflow";

export interface SubmitFeedbackInput {
  taskId: string;
  agentId: string;
  workspaceId: string;
  responseId: string;
  responseIndex: number;
  messageCount: number;
  feedbackType: "positive" | "negative";
  feedbackText?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
}

export interface FeedbackRecord {
  responseId: string;
  responseIndex: number;
  messageCount: number;
  feedbackType: string;
  isPositive: boolean;
  feedbackText: string | null;
  createdAt: string;
  traceId: string | null;
  spanId: string | null;
}

export interface FeedbackAnalytics {
  timeseries: {
    date: string;
    positiveCount: number;
    negativeCount: number;
    totalCount: number;
    negativePercentage: number;
  }[];
  summary: {
    totalPositive: number;
    totalNegative: number;
    totalFeedback: number;
    negativePercentage: number;
    positivePercentage: number;
  };
}

export interface DetailedFeedback {
  taskId: string;
  agentId: string;
  responseId: string;
  responseIndex: number;
  messageCount: number;
  feedbackType: string;
  isPositive: boolean;
  feedbackText: string | null;
  createdAt: string;
}

/**
 * Submit user feedback on an agent response
 */
export async function submitFeedback(input: SubmitFeedbackInput) {
  try {
    const result = await executeWorkflow("FeedbackSubmissionWorkflow", {
      task_id: input.taskId,
      agent_id: input.agentId,
      workspace_id: input.workspaceId,
      response_id: input.responseId,
      response_index: input.responseIndex,
      message_count: input.messageCount,
      feedback_type: input.feedbackType,
      feedback_text: input.feedbackText,
      user_id: input.userId,
      trace_id: input.traceId,
      span_id: input.spanId,
    });

    return result;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
}

/**
 * Get all feedback for a specific task
 */
export async function getTaskFeedback(taskId: string): Promise<FeedbackRecord[]> {
  try {
    const result = await executeWorkflow("GetTaskFeedbackWorkflow", {
      task_id: taskId,
    });

    if (result.success && result.data) {
      return result.data.feedbacks || [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching task feedback:", error);
    return [];
  }
}

/**
 * Get feedback analytics for a workspace
 */
export async function getFeedbackAnalytics(
  workspaceId: string,
  agentId?: string,
  dateRange: string = "7d"
): Promise<FeedbackAnalytics> {
  try {
    const result = await executeWorkflow("GetFeedbackAnalyticsWorkflow", {
      workspace_id: workspaceId,
      agent_id: agentId,
      date_range: dateRange,
    });

    if (result.success && result.data) {
      return result.data;
    }

    return {
      timeseries: [],
      summary: {
        totalPositive: 0,
        totalNegative: 0,
        totalFeedback: 0,
        negativePercentage: 0,
        positivePercentage: 0,
      },
    };
  } catch (error) {
    console.error("Error fetching feedback analytics:", error);
    return {
      timeseries: [],
      summary: {
        totalPositive: 0,
        totalNegative: 0,
        totalFeedback: 0,
        negativePercentage: 0,
        positivePercentage: 0,
      },
    };
  }
}

/**
 * Get detailed list of all feedbacks with task links
 */
export async function getDetailedFeedbacks(
  workspaceId: string,
  agentId?: string,
  dateRange: string = "7d"
): Promise<DetailedFeedback[]> {
  try {
    const result = await executeWorkflow("GetDetailedFeedbacksWorkflow", {
      workspace_id: workspaceId,
      agent_id: agentId,
      date_range: dateRange,
    });

    if (result.success && result.data) {
      return result.data.feedbacks || [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching detailed feedbacks:", error);
    return [];
  }
}

