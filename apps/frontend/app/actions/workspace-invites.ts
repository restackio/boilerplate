"use server";

import { executeWorkflow } from "./workflow";

export async function createWorkspaceInvite(input: {
  actor_user_id: string;
  workspace_id: string;
  invited_email: string;
  origin: string;
}) {
  return executeWorkflow("WorkspaceInvitesCreateWorkflow", input);
}

export async function getWorkspaceInviteByToken(input: {
  token: string;
  redeemer_user_id: string;
}) {
  return executeWorkflow("WorkspaceInvitesGetByTokenWorkflow", input);
}

export async function acceptWorkspaceInvite(input: {
  token: string;
  redeemer_user_id: string;
}) {
  return executeWorkflow("WorkspaceInvitesAcceptWorkflow", input);
}

export async function declineWorkspaceInvite(input: {
  token: string;
  redeemer_user_id: string;
}) {
  return executeWorkflow("WorkspaceInvitesDeclineWorkflow", input);
}

export async function listPendingWorkspaceInvites(input: {
  workspace_id: string;
  actor_user_id: string;
}) {
  return executeWorkflow("WorkspaceInvitesListPendingWorkflow", input);
}

export async function revokeWorkspaceInvite(input: {
  invite_id: string;
  actor_user_id: string;
  origin?: string;
}) {
  return executeWorkflow("WorkspaceInvitesRevokeWorkflow", input);
}

export async function resendWorkspaceInvite(input: {
  invite_id: string;
  actor_user_id: string;
  origin: string;
}) {
  return executeWorkflow("WorkspaceInvitesResendWorkflow", input);
}
