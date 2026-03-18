"use server";
import { client } from "./client";

const BACKEND_TASK_QUEUE = "backend";
const BACKEND_EMBED_TASK_QUEUE = "backend-embed";

export async function runWorkflow({
  workflowName = "workflowFlow",
  input = {},
  taskQueue = BACKEND_TASK_QUEUE,
}: {
  workflowName: string;
  input: Record<string, unknown>;
  taskQueue?: string;
}): Promise<{ workflowId: string; runId: string }> {
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
      taskQueue,
    });

    return {
      workflowId,
      runId,
    };
  } catch (error) {
    const endTime = Date.now();
    console.error(`[runWorkflow] Error after ${endTime - startTime}ms:`, error);
    console.error(`[runWorkflow] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Helper function for executing workflows and getting results
export async function executeWorkflow(
  workflowName: string,
  input: Record<string, unknown>,
) {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName,
      input,
    });

    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    return {
      success: true,
      data: result,
      workflowId,
      runId,
    };
  } catch (error) {
    console.error("Workflow execution failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

export async function getWorkflowResult({
  workflowId,
  runId,
  timeoutMs = 30000,
}: {
  workflowId: string;
  runId: string;
  timeoutMs?: number;
}): Promise<unknown> {
  const startTime = Date.now();
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[getWorkflowResult] waiting workflowId=${workflowId} runId=${runId} timeout=${timeoutMs}ms`,
    );
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Workflow result timeout after ${timeoutMs / 1000} seconds`,
          ),
        ),
      timeoutMs,
    );
  });

  try {
    const resultPromise = client.getWorkflowResult({
      workflowId,
      runId,
    });

    const result = await Promise.race([resultPromise, timeoutPromise]);
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[getWorkflowResult] result received in ${Date.now() - startTime}ms`,
      );
    }
    return result;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[getWorkflowResult] Error after ${elapsed}ms:`, error);
    throw error;
  }
}

// MCP Server Workflows
export async function getMcpServers(workspaceId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersReadWorkflow",
    input: { workspace_id: workspaceId },
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

export async function getRemoteMcpDirectory(query?: string) {
  const result = await executeWorkflow("GetRemoteMcpDirectoryWorkflow", {
    query: query ?? null,
  });
  if (!result.success || !result.data) {
    return { success: false as const, entries: [] };
  }
  const entries = (result.data as { entries?: unknown[] }).entries ?? [];
  return { success: true as const, entries };
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
    input: mcpServerData,
  });

  return await getWorkflowResult({
    workflowId,
    runId,
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
    input: mcpServerData,
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

export async function deleteMcpServer(mcpServerId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersDeleteWorkflow",
    input: { mcp_server_id: mcpServerId },
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

export async function getMcpServerById(mcpServerId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpServersGetByIdWorkflow",
    input: { mcp_server_id: mcpServerId },
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

export async function listMcpServerTools(
  serverUrl: string,
  headers?: Record<string, string>,
  local?: boolean,
  workspaceId?: string,
  mcpServerId?: string,
) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "McpToolsListWorkflow",
    input: {
      server_url: serverUrl,
      headers: headers || null,
      local: local || false,
      workspace_id: workspaceId || null,
      mcp_server_id: mcpServerId || null,
    },
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

// Agent-MCP Server Workflows (now handled via agent_tools)
export async function getAgentMcpServers(agentId: string) {
  // MCP servers are now managed through the unified agent_tools table
  const tools = await getAgentTools(agentId);

  // Filter to only MCP type tools
  const data = tools as { agent_tools?: { tool_type?: string }[] };
  const mcpTools =
    data?.agent_tools?.filter((tool) => tool.tool_type === "mcp") ?? [];
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
  tool_type: "web_search" | "mcp" | "code_interpreter" | "image_generation";
  mcp_server_id?: string;
  // MCP-specific fields
  tool_name?: string;
  custom_description?: string;
  require_approval?: boolean;
  // General fields
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
  tool_type?: "web_search" | "mcp" | "code_interpreter" | "image_generation";
  mcp_server_id?: string | null;
  // MCP-specific fields
  tool_name?: string;
  custom_description?: string;
  require_approval?: boolean;
  // General fields
  config?: Record<string, unknown>;
  allowed_tools?: string[] | null;
  execution_order?: number | null;
  enabled?: boolean;
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "AgentToolsUpdateWorkflow",
    input: toolData,
  });
  return await getWorkflowResult({ workflowId, runId });
}

export async function deleteAgentTool(deleteData: { agent_tool_id: string }) {
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
    tool_type: "mcp",
    mcp_server_id: agentMcpServerData.mcp_server_id,
    allowed_tools: agentMcpServerData.allowed_tools,
    enabled: true,
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

export async function createDataset(datasetData: {
  workspace_id: string;
  name: string;
  description?: string;
  storage_type?: string;
  tags?: string[];
}) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "DatasetsCreateWorkflow",
    input: datasetData,
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

export async function getDatasets(workspaceId: string) {
  const { workflowId, runId } = await runWorkflow({
    workflowName: "DatasetsReadWorkflow",
    input: { workspace_id: workspaceId },
  });

  return await getWorkflowResult({
    workflowId,
    runId,
  });
}

const TASK_FILES_DATASET_NAME = "task-files";

/** Get or create the workspace "task-files" dataset; returns dataset id or null. Used so "Add files to task" and build flows share the same dataset. */
export async function getOrCreateTaskFilesDatasetId(
  workspaceId: string,
): Promise<string | null> {
  const listResult = await getDatasets(workspaceId);
  const list =
    listResult && typeof listResult === "object" && "datasets" in listResult
      ? (listResult as { datasets: { id: string; name: string }[] })
      : null;
  const datasets =
    list?.datasets ?? (Array.isArray(listResult) ? listResult : []);
  const existing = Array.isArray(datasets)
    ? datasets.find(
        (d: { name?: string }) => d.name === TASK_FILES_DATASET_NAME,
      )
    : null;
  if (existing && typeof existing.id === "string") {
    return existing.id;
  }
  const createResult = await createDataset({
    workspace_id: workspaceId,
    name: TASK_FILES_DATASET_NAME,
    description: "Files uploaded from tasks",
    storage_type: "clickhouse",
  });
  const created =
    createResult &&
    typeof createResult === "object" &&
    "dataset" in createResult
      ? (createResult as { dataset: { id: string } }).dataset
      : null;
  return created?.id ?? null;
}

/** Get a public agent by id (for /chat/[agentId] - no auth). Returns null if not found or not public. */
export async function getPublicAgent(agentId: string) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[getPublicAgent] runWorkflow AgentsGetByIdWorkflow agentId=",
        agentId,
      );
    }
    const { workflowId, runId } = await runWorkflow({
      workflowName: "AgentsGetByIdWorkflow",
      input: { agent_id: agentId, public_only: true },
      taskQueue: BACKEND_TASK_QUEUE,
    });
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[getPublicAgent] workflow scheduled workflowId=",
        workflowId,
        "runId=",
        runId,
      );
    }
    const result = await getWorkflowResult({
      workflowId,
      runId,
      timeoutMs: 60 * 1000, // 60s for public chat page load
    });
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[getPublicAgent] result received",
        result != null ? "ok" : "null",
      );
    }
    const data = result as { agent?: unknown } | null;
    if (!data?.agent)
      return {
        success: false,
        data: null,
        error: "Agent not found or not public",
      };
    return { success: true, data: data.agent, error: null };
  } catch (error) {
    console.error("getPublicAgent failed:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** Create a task for a public agent (visitor chat - no auth). Returns task with id and temporal_agent_id. */
export async function createTaskForPublicAgent(params: {
  agent_id: string;
  title: string;
  description: string;
}) {
  try {
    const { workflowId, runId } = await runWorkflow({
      workflowName: "TasksCreateWorkflow",
      input: params,
      taskQueue: BACKEND_TASK_QUEUE,
    });
    const result = await getWorkflowResult({
      workflowId,
      runId,
      timeoutMs: 60 * 1000,
    });
    const out = result as {
      task?: {
        id?: string;
        temporal_agent_id?: string;
        workspace_id?: string;
        status?: string;
        agent_state?: unknown;
      };
    };
    const task = out?.task;
    if (!task?.id) {
      return { success: false, data: null, error: "Failed to create task" };
    }
    return { success: true, data: task, workflowId, runId };
  } catch (error) {
    console.error("createTaskForPublicAgent failed:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** Schedule AddFilesToDataset workflow (no wait). Use with getWorkflowResult to wait. Ensures multiple batches each get their own workflow. */
export async function scheduleAddFilesToDatasetWorkflow(params: {
  workspace_id: string;
  dataset_id: string;
  task_id?: string | null;
  files_with_content: { filename: string; content_base64: string }[];
}): Promise<
  | { success: true; workflowId: string; runId: string }
  | { success: false; error: string; workflowId?: never; runId?: never }
> {
  try {
    if (!params.files_with_content?.length) {
      return {
        success: false,
        error:
          "files_with_content is required (list of { filename, content_base64 }).",
      };
    }
    const input: Record<string, unknown> = {
      workspace_id: params.workspace_id,
      dataset_id: params.dataset_id,
      task_id: params.task_id ?? undefined,
      files_with_content: params.files_with_content,
    };
    const { workflowId, runId } = await runWorkflow({
      workflowName: "AddFilesToDatasetWorkflow",
      input,
      taskQueue: BACKEND_EMBED_TASK_QUEUE,
    });
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[scheduleAddFilesToDatasetWorkflow] scheduled workflowId=${workflowId} files=${params.files_with_content.length}`,
      );
    }
    return { success: true, workflowId, runId };
  } catch (error) {
    console.error("scheduleAddFilesToDatasetWorkflow failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** Add files to a dataset: EmbedAnything (extract + embed) → ClickHouse. Accepts PDF, text, images, etc. */
export async function addFilesToDataset(params: {
  workspace_id: string;
  dataset_id: string;
  task_id?: string | null;
  /** Inline file content (base64). Required. */
  files_with_content?: { filename: string; content_base64: string }[];
}) {
  try {
    if (!params.files_with_content?.length) {
      return {
        success: false,
        error:
          "files_with_content is required (list of { filename, content_base64 }).",
        data: null,
      };
    }
    const scheduled = await scheduleAddFilesToDatasetWorkflow({
      ...params,
      files_with_content: params.files_with_content,
    });
    if ("error" in scheduled) {
      return { success: false, error: scheduled.error, data: null };
    }
    const result = await getWorkflowResult({
      workflowId: scheduled.workflowId,
      runId: scheduled.runId,
      timeoutMs: 5 * 60 * 1000, // 5 minutes for multi-PDF ingest
    });
    return {
      success: true,
      data: result,
      workflowId: scheduled.workflowId,
      runId: scheduled.runId,
    };
  } catch (error) {
    console.error("AddFilesToDataset failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

export async function deleteAgentMcpServer(agentMcpServerId: string) {
  // Delete MCP server tool via unified agent_tools table
  return await deleteAgentTool({
    agent_tool_id: agentMcpServerId,
  });
}

export async function createAgentMcpTool(toolData: {
  agent_id: string;
  mcp_server_id: string;
  tool_name: string;
  custom_description?: string;
  require_approval?: boolean;
  enabled?: boolean;
}) {
  // Use the unified agent tools system with MCP-specific fields
  return await createAgentTool({
    agent_id: toolData.agent_id,
    tool_type: "mcp",
    mcp_server_id: toolData.mcp_server_id,
    tool_name: toolData.tool_name,
    custom_description: toolData.custom_description,
    require_approval: toolData.require_approval || false,
    enabled: toolData.enabled,
  });
}

export async function updateAgentMcpTool(toolData: {
  id: string;
  custom_description?: string;
  require_approval?: boolean;
  enabled?: boolean;
}) {
  // Use the unified agent tools system
  return await updateAgentTool({
    agent_tool_id: toolData.id,
    custom_description: toolData.custom_description,
    require_approval: toolData.require_approval,
    enabled: toolData.enabled,
  });
}

export async function deleteAgentMcpTool(toolId: string) {
  // Use the unified agent tools system
  return await deleteAgentTool({ agent_tool_id: toolId });
}
