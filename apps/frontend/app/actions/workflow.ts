"use server";
import Restack from "@restackio/ai";

const connectionOptions = {
  engineId: process.env.RESTACK_ENGINE_ID!,
  address: process.env.RESTACK_ENGINE_ADDRESS!,
  apiKey: process.env.RESTACK_ENGINE_API_KEY!,
};

const client = new Restack(
  process.env.RESTACK_ENGINE_API_KEY ? connectionOptions : undefined
);

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

  const runId = await client.scheduleWorkflow({
    workflowName,
    workflowId,
    input,
    taskQueue: "restack",
  });

  return {
    workflowId,
    runId
  }
}

export async function getWorkflowResult({
  workflowId,
  runId
}: {
  workflowId: string,
  runId: string
}) : Promise<any> {
  const result = await client.getWorkflowResult({
    workflowId,
    runId
  });
  return result
}