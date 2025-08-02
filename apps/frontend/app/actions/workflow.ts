"use server";
import { client } from "./client";

export async function runWorkflow({
  workflowName = "workflowFlow",
  input = {},
}: {
  workflowName: string,
  input: any,
}) : Promise<any> {
  console.log(`🔄 [runWorkflow] Starting to schedule workflow ${workflowName}`);
  const startTime = Date.now();
  
  if (!workflowName || !input) {
    throw new Error("Workflow name and input are required");
  }

  const workflowId = `${Date.now()}-${workflowName.toString()}`;
  console.log(`🔄 [runWorkflow] Generated workflow ID: ${workflowId}`);

  try {
    const runId = await client.scheduleWorkflow({
      workflowName,
      workflowId,
      input,
      taskQueue: "restack",
    });
    
    const endTime = Date.now();
    console.log(`✅ [runWorkflow] Scheduled workflow in ${endTime - startTime}ms`);
    console.log(`✅ [runWorkflow] Run ID: ${runId}`);
    
    return {
      workflowId,
      runId
    };
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ [runWorkflow] Error after ${endTime - startTime}ms:`, error);
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
  console.log(`🔄 [getWorkflowResult] Starting to get result for workflow ${workflowId}, run ${runId}`);
  const startTime = Date.now();
  
  try {
    const result = await client.getWorkflowResult({
      workflowId,
      runId
    });
    
    const endTime = Date.now();
    console.log(`✅ [getWorkflowResult] Completed in ${endTime - startTime}ms`);
    console.log(`✅ [getWorkflowResult] Result:`, result);
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ [getWorkflowResult] Error after ${endTime - startTime}ms:`, error);
    throw error;
  }
}