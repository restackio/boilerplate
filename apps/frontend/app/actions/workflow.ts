"use server";
import { client } from "./client";

export async function runWorkflow({
  workflowName = "workflowFlow",
  input = {},
}: {
  workflowName: string,
  input: Record<string, unknown>,
}) : Promise<{ workflowId: string; runId: string }> {
  const startTime = Date.now();
  
  if (!workflowName || !input) {
    throw new Error("Workflow name and input are required");
  }

  const workflowId = `${crypto.randomUUID()}-${workflowName.toString()}`;

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

// Helper function for executing workflows and getting results
export async function executeWorkflow(workflowName: string, input: Record<string, any>) {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName,
      input
    });
    
    const result = await getWorkflowResult({
      workflowId,
      runId
    });
    
    return {
      success: true,
      data: result,
      workflowId,
      runId
    };
  } catch (error) {
    console.error("Workflow execution failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null
    };
  }
}

export async function getWorkflowResult({
  workflowId,
  runId
}: {
  workflowId: string,
  runId: string
}) : Promise<unknown> {
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
    
    // const endTime = Date.now(); // Currently unused - could be used for timing

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
  server_url?: string;
  local?: boolean;
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
  local?: boolean;
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


export async function listMcpServerTools(serverUrl: string, headers?: Record<string, string>) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpToolsListWorkflow",
    input: { 
      server_url: serverUrl,
      headers: headers || null 
    }
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}

// Agent-MCP Server Workflows (now handled via agent_tools)
export async function getAgentMcpServers(agentId: string) {
  // MCP servers are now managed through the unified agent_tools table
  const tools = await getAgentTools(agentId);
  
  // Filter to only MCP type tools
  const mcpTools = (tools as any)?.agent_tools?.filter((tool: any) => tool.tool_type === 'mcp') || [];
  return { agent_mcp_servers: mcpTools };
}

// Agent Tools (unified)
export async function getAgentTools(agentId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentToolsReadRecordsByAgentWorkflow",
    input: { agent_id: agentId },
  });

  return await getWorkflowResult({ workflowId, runId });
}

export async function createAgentTool(toolData: {
  agent_id: string;
  tool_type: 'web_search_preview'|'mcp'|'code_interpreter'|'image_generation';
  mcp_server_id?: string;
  config?: Record<string, unknown>;
  allowed_tools?: string[];
  execution_order?: number;
  enabled?: boolean;
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentToolsCreateWorkflow",
    input: toolData,
  });
  return await getWorkflowResult({ workflowId, runId });
}

export async function updateAgentTool(toolData: {
  agent_tool_id: string;
  tool_type?: 'web_search_preview'|'mcp'|'code_interpreter'|'image_generation';
  mcp_server_id?: string | null;

  config?: Record<string, unknown>;
  allowed_tools?: string[] | null;
  execution_order?: number | null;
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentToolsUpdateWorkflow",
    input: toolData,
  });
  return await getWorkflowResult({ workflowId, runId });
}

export async function deleteAgentTool(deleteData: {
  agent_tool_id: string;
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentToolsDeleteWorkflow",
    input: deleteData,
  });
  return await getWorkflowResult({ workflowId, runId });
}

export async function createAgentMcpServer(agentMcpServerData: {
  agent_id: string;
  mcp_server_id: string;
  allowed_tools?: string[];
}) {
  // Create MCP server tool via unified agent_tools table
  return await createAgentTool({
    agent_id: agentMcpServerData.agent_id,
    tool_type: 'mcp',
    mcp_server_id: agentMcpServerData.mcp_server_id,
    allowed_tools: agentMcpServerData.allowed_tools,
    enabled: true
  });
}

export async function updateAgentMcpServer(agentMcpServerData: {
  agent_mcp_server_id: string;
  allowed_tools?: string[];
}) {
  // Update MCP server tool via unified agent_tools table
  return await updateAgentTool({
    agent_tool_id: agentMcpServerData.agent_mcp_server_id,
    allowed_tools: agentMcpServerData.allowed_tools,
  });
}

export async function deleteAgentMcpServer(agentMcpServerId: string) {
  // Delete MCP server tool via unified agent_tools table
  return await deleteAgentTool({
    agent_tool_id: agentMcpServerId
  });
}

export async function getAgentMcpServerById(_agentMcpServerId: string) {
  // This function is no longer needed as we use the unified agent_tools approach
  // If needed, individual tools can be queried through getAgentTools and filtered
  throw new Error("getAgentMcpServerById is deprecated - use getAgentTools and filter by tool_type='mcp'");
}

// Zendesk Ticket Workflow
export async function generateZendeskTicket(ticketData: {
  user_request: string;
  priority?: string;
  ticket_type?: string;
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "ZendeskTicketWorkflow",
    input: ticketData
  });
  
  return await getWorkflowResult({
    workflowId,
    runId
  });
}