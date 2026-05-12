"use server";

import { executeWorkflow } from "./workflow";

export async function removeWorkspaceMember(input: {
  actor_user_id: string;
  user_id: string;
  workspace_id: string;
}) {
  return executeWorkflow("UserWorkspacesDeleteWorkflow", input);
}
