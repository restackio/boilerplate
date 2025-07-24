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
  runId,
  eventName,
  eventInput,
}: {
  agentId: string;
  runId: string;
  eventName: string;
  eventInput: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!agentId || !runId || !eventName) {
      throw new Error("Agent ID, run ID, and event name are required");
    }

    await client.sendAgentEvent({
      event: {
        name: eventName,
        input: eventInput,
      },
      agent: {
        agentId: agentId,
        runId: runId,
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
  runId,
  message,
}: {
  agentId: string;
  runId: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendAgentEvent({
    agentId,
    runId,
    eventName: "messages",
    eventInput: {
      messages: [{ role: "user", content: message }]
    },
  });
}

export async function stopAgent({
  agentId,
  runId,
}: {
  agentId: string;
  runId: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendAgentEvent({
    agentId,
    runId,
    eventName: "end",
    eventInput: {},
  });
}

export async function getAgentResult({
  agentId,
  runId,
}: {
  agentId: string;
  runId: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!agentId || !runId) {
      throw new Error("Agent ID and run ID are required");
    }

    const result = await client.getAgentResult({
      agentId,
      runId,
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