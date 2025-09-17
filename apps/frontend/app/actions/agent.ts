"use server";
import { client } from "./client";

export async function startAgent({
  agentId,
  taskDescription,
}: {
  agentId: string;
  taskDescription: string;
}): Promise<{ success: boolean; runId?: string; error?: string }> {
  try {
    if (!agentId || !taskDescription) {
      throw new Error("Agent ID and task description are required");
    }
    
    const event = {
      name: "messages",
      input: {
        messages: [{ role: "user", content: taskDescription }],
      },
    };

    const runId = await client.scheduleAgent({
      agentName: "AgentTask", // Assuming this is the agent name
      agentId: agentId,
      event,
    });

    return {
      success: true,
      runId: runId,
    };
  } catch (error) {
    console.error("Error starting agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start agent",
    };
  }
}

export async function sendAgentEvent({
  agentId,
  eventName,
  eventInput,
}: {
  agentId: string;
  eventName: string;
  eventInput?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string; updateId?: string; workflowId?: string; workflowRunId?: string }> {
  try {
    if (!agentId || !eventName) {
      throw new Error("Agent ID and event name are required");
    }

    const eventPayload = {
      event: {
        name: eventName,
        ...(eventInput && { input: eventInput }),
      },
      agent: {
        agentId: agentId,
      }
    };

    const result = await client.sendAgentEvent(eventPayload);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedResult = result as any;
    return {
      success: true,
      updateId: typedResult?.updateId,
      workflowId: typedResult?.workflowId,
      workflowRunId: typedResult?.workflowRunId,
    };
  } catch (error) {
    console.error("Error sending agent event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send agent event",
    };
  }
}

export async function sendAgentMessage({
  agentId,
  message,
}: {
  agentId: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendAgentEvent({
    agentId,
    eventName: "messages",
    eventInput: {
      messages: [{ role: "user", content: message }]
    },
  });
}

export async function stopAgent({
  agentId,
}: {
  agentId: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendAgentEvent({
    agentId,
    eventName: "end"
  });
}

export async function sendMcpApproval({
  agentId,
  approvalId,
  approved,
}: {
  agentId: string;
  approvalId: string;
  approved: boolean;
}): Promise<{ success: boolean; error?: string }> {
  return sendAgentEvent({
    agentId,
    eventName: "mcp_approval",
    eventInput: {
      approval_id: approvalId,  // Convert camelCase to snake_case for backend
      approved,
    },
  });
}
