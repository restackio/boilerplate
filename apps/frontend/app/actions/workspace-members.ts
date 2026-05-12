"use server";

import { executeWorkflow } from "./workflow";

export async function removeWorkspaceMember(input: {
  actor_user_id: string;
  user_id: string;
  workspace_id: string;
}) {
  return executeWorkflow("UserWorkspacesDeleteWorkflow", input);
}

export async function leaveWorkspace(input: {
  actor_user_id: string;
  workspace_id: string;
}) {
  return executeWorkflow("UserWorkspacesDeleteWorkflow", {
    actor_user_id: input.actor_user_id,
    user_id: input.actor_user_id,
    workspace_id: input.workspace_id,
  });
}
