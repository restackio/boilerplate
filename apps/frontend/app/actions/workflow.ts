"use server";
import { client } from "./client";

export async function runWorkflow({
  workflowName = "workflowFlow",
  input = {},
}: {
  workflowName: string,
  input: Record<string, unknown>,
}) : Promise<{ workflowId: string; runId: string }> {
  console.log(`🔄 [runWorkflow] Starting to schedule workflow ${workflowName}`);
  const startTime = Date.now();
  
  if (!workflowName || !input) {
    throw new Error("Workflow name and input are required");
  }

  const workflowId = `${Date.now()}-${workflowName.toString()}`;
  console.log(`🔄 [runWorkflow] Generated workflow ID: ${workflowId}`);

  try {
    console.log(`🔄 [runWorkflow] About to call client.scheduleWorkflow with:`, {
      workflowName,
      workflowId,
      input,
      taskQueue: "restack",
    });
    
    const scheduleStartTime = Date.now();
    const runId = await client.scheduleWorkflow({
      workflowName,
      workflowId,
      input,
      taskQueue: "restack",
    });
    const scheduleEndTime = Date.now();
    
    console.log(`✅ [runWorkflow] client.scheduleWorkflow completed in ${scheduleEndTime - scheduleStartTime}ms`);
    console.log(`✅ [runWorkflow] Run ID: ${runId}`);
    
    const endTime = Date.now();
    console.log(`✅ [runWorkflow] Scheduled workflow in ${endTime - startTime}ms`);
    
    return {
      workflowId,
      runId
    };
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ [runWorkflow] Error after ${endTime - startTime}ms:`, error);
    console.error(`❌ [runWorkflow] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
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
}) : Promise<unknown> {
  console.log(`🔄 [getWorkflowResult] Starting to get result for workflow ${workflowId}, run ${runId}`);
  const startTime = Date.now();
  
  // Add a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Workflow result timeout after 30 seconds')), 30000);
  });
  
  try {
    const resultPromise = client.getWorkflowResult({
      workflowId,
      runId
    });
    
    // Race between the actual result and the timeout
    const result = await Promise.race([resultPromise, timeoutPromise]);
    
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

// MCP Server Workflows
export async function getMcpServers(workspaceId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersReadWorkflow",
    input: { workspace_id: workspaceId }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function createMcpServer(mcpServerData: {
  workspace_id: string;
  server_label: string;
  server_url: string;
  server_description?: string;
  headers?: Record<string, string>;
  require_approval?: {
    never: { tool_names: string[] };
    always: { tool_names: string[] };
  };
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersCreateWorkflow",
    input: mcpServerData
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function updateMcpServer(mcpServerData: {
  mcp_server_id: string;
  server_label?: string;
  server_url?: string;
  server_description?: string;
  headers?: Record<string, string>;
  require_approval?: {
    never: { tool_names: string[] };
    always: { tool_names: string[] };
  };
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersUpdateWorkflow",
    input: mcpServerData
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function deleteMcpServer(mcpServerId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersDeleteWorkflow",
    input: { mcp_server_id: mcpServerId }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function getMcpServerById(mcpServerId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersGetByIdWorkflow",
    input: { mcp_server_id: mcpServerId }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

// Agent-MCP Server Workflows
export async function getAgentMcpServers(agentId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentMcpServersReadByAgentWorkflow",
    input: { agent_id: agentId }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function createAgentMcpServer(agentMcpServerData: {
  agent_id: string;
  mcp_server_id: string;
  allowed_tools?: string[];
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentMcpServersCreateWorkflow",
    input: agentMcpServerData
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function updateAgentMcpServer(agentMcpServerData: {
  agent_mcp_server_id: string;
  allowed_tools?: string[];
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentMcpServersUpdateWorkflow",
    input: agentMcpServerData
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function deleteAgentMcpServer(agentMcpServerId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentMcpServersDeleteWorkflow",
    input: { agent_mcp_server_id: agentMcpServerId }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

export async function getAgentMcpServerById(agentMcpServerId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentMcpServersGetByIdWorkflow",
    input: { agent_mcp_server_id: agentMcpServerId }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}