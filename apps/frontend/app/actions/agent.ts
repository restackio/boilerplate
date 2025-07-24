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

    const runId = await client.scheduleAgent({
      agentName: "AgentTask", // Assuming this is the agent name
      agentId: agentId,
      input: {
        task_description: taskDescription,
      }
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
  eventInput?: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!agentId || !eventName) {
      throw new Error("Agent ID and event name are required");
    }

    await client.sendAgentEvent({
      event: {
        name: eventName,
        ...(eventInput && { input: eventInput }),
      },
      agent: {
        agentId: agentId,
      }
    });

    return {
      success: true,
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

export async function getAgentResult({
  agentId,
}: {
  agentId: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!agentId) {
      throw new Error("Agent ID is required");
    }

    const result = await client.getAgentResult({
      agentId,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error getting agent result:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get agent result",
    };
  }
} 