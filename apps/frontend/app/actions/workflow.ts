"use server";
import { client } from "./client";

export async function runWorkflow({
  workflowName = "workflowFlow",
  input = {},
}: {
  workflowName: string,
  input: any,
}) : Promise<any> {
  if (!workflowName || !input) {
    throw new Error("Workflow name and input are required");
  }

  const workflowId = `${Date.now()}-${workflowName.toString()}`;

  try {
    const runId = await client.scheduleWorkflow({
      workflowName,
      workflowId,
      input,
      taskQueue: "restack",
    });
    
    return {
      workflowId,
      runId
    };
  } catch (error) {
    console.error(`Error scheduling workflow:`, error);
    throw error;
  }
}

export async function testServerAction() {
  return { success: true, message: "Server action working" };
}

export async function getWorkflowResult({
  workflowId,
  runId
}: {
  workflowId: string,
  runId: string
}) : Promise<any> {
  try {
    const result = await client.getWorkflowResult({
      workflowId,
      runId
    });
    
    return result;
  } catch (error) {
    console.error(`Error getting workflow result:`, error);
    throw error;
  }
}