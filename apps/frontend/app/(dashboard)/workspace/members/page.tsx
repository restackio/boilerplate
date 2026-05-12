"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Copy } from "lucide-react";
import { executeWorkflow } from "@/app/actions/workflow";
import {
  createWorkspaceInvite,
  listPendingWorkspaceInvites,
  resendWorkspaceInvite,
  revokeWorkspaceInvite,
} from "@/app/actions/workspace-invites";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

interface MemberRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  created_at: string | null;
}

interface InviteRow {
  id: string;
  invited_email: string;
  token: string;
  created_at: string | null;
}

interface InviteModalState {
  open: boolean;
  email: string;
  link: string;
}

export default function WorkspaceMembersPage() {
  const { currentWorkspaceId, currentUser } = useDatabaseWorkspace();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteModal, setInviteModal] = useState<InviteModalState>({
    open: false,
    email: "",
    link: "",
  });
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    if (!currentUser?.id) {
      return false;
    }
    return members.some(
      (member) => member.user_id === currentUser.id && member.role === "owner",
    );
  }, [currentUser?.id, members]);

  const loadMembers = useCallback(async () => {
    if (!currentWorkspaceId) {
      return;
    }
    setLoading(true);
    const result = await executeWorkflow("UserWorkspacesGetByWorkspaceWorkflow", {
      workspace_id: currentWorkspaceId,
    });
    setLoading(false);

    if (!result.success || !result.data) {
      setError("Failed to load members");
      return;
    }

    const rows = (result.data as { user_workspaces?: MemberRow[] }).user_workspaces ?? [];
    setMembers(rows);
  }, [currentWorkspaceId]);

  const loadPendingInvites = useCallback(async () => {
    if (!currentWorkspaceId || !currentUser?.id) {
      return;
    }
    const result = await listPendingWorkspaceInvites({
      workspace_id: currentWorkspaceId,
      actor_user_id: currentUser.id,
    });

    if (!result.success || !result.data) {
      setPendingInvites([]);
      return;
    }

    const rows = (result.data as { invites?: InviteRow[] }).invites ?? [];
    setPendingInvites(rows);
  }, [currentUser?.id, currentWorkspaceId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (isOwner) {
      void loadPendingInvites();
    }
  }, [isOwner, loadPendingInvites]);

  const onCreateInvite = async () => {
    if (!currentWorkspaceId || !currentUser?.id || !inviteEmail.trim()) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await createWorkspaceInvite({
      actor_user_id: currentUser.id,
      workspace_id: currentWorkspaceId,
      invited_email: inviteEmail.trim(),
      origin: window.location.origin,
    });
    setSubmitting(false);

    if (!result.success || !result.data) {
      setError("Failed to create invite");
      return;
    }

    const status = (result.data as { status?: string }).status;
    if (status === "ok") {
      setMessage("Invitation sent.");
      setInviteEmail("");
      const invite = (result.data as { invite?: { token?: string } }).invite;
      const token = invite?.token;
      if (token) {
        setInviteModal({
          open: true,
          email: inviteEmail.trim().toLowerCase(),
          link: `${window.location.origin}/invite?token=${token}`,
        });
      }
      void loadPendingInvites();
      return;
    }
    if (status === "user_not_registered") {
      setError("That email is not registered yet.");
      return;
    }
    if (status === "already_member") {
      setError("That user is already in this workspace.");
      return;
    }
    setError("Could not send invitation.");
  };

  const copyInviteLink = async (link: string, inviteId?: string) => {
    try {
      await navigator.clipboard.writeText(link);
      if (inviteId) {
        setCopiedInviteId(inviteId);
        setTimeout(() => setCopiedInviteId(null), 1500);
      }
      setMessage("Invite link copied.");
    } catch {
      setError("Could not copy invite link.");
    }
  };

  const onResend = async (inviteId: string) => {
    if (!currentUser?.id) {
      return;
    }
    const result = await resendWorkspaceInvite({
      invite_id: inviteId,
      actor_user_id: currentUser.id,
      origin: window.location.origin,
    });
    if (!result.success) {
      setError("Failed to resend invite");
      return;
    }
    setMessage("Invitation resent.");
    void loadPendingInvites();
  };

  const onRevoke = async (inviteId: string) => {
    if (!currentUser?.id) {
      return;
    }
    const result = await revokeWorkspaceInvite({
      invite_id: inviteId,
      actor_user_id: currentUser.id,
    });
    if (!result.success) {
      setError("Failed to revoke invite");
      return;
    }
    setMessage("Invitation revoked.");
    void loadPendingInvites();
  };

  return (
    <div className="flex-1">
      <PageHeader breadcrumbs={[{ label: "Workspace members" }]} fixed={true} />

      <div className="p-4 pt-20 space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        {isOwner && (
          <section className="border rounded-md p-4 space-y-3">
            <h2 className="font-semibold">Invite member</h2>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button onClick={onCreateInvite} disabled={submitting}>
              {submitting ? "Sending..." : "Send invite"}
            </Button>
          </section>
        )}

        {isOwner && (
          <section className="border rounded-md p-4 space-y-3">
            <h2 className="font-semibold">Pending invitations</h2>
            <p className="text-xs text-muted-foreground">
              Email is sent automatically, and you can also copy links for manual sharing.
              Invites are email-bound and remain valid until revoked.
            </p>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="border rounded p-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{invite.invited_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited{" "}
                        {invite.created_at
                          ? new Date(invite.created_at).toLocaleString()
                          : "recently"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyInviteLink(
                            `${window.location.origin}/invite?token=${invite.token}`,
                            invite.id,
                          )
                        }
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        {copiedInviteId === invite.id ? "Copied" : "Copy link"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onResend(invite.id)}>
                        Resend
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onRevoke(invite.id)}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="border rounded-md p-4 space-y-3">
          <h2 className="font-semibold">Members</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.user_name}</p>
                      <p className="text-sm text-muted-foreground">{member.user_email}</p>
                    </div>
                    <p className="text-sm capitalize">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={inviteModal.open}
        onOpenChange={(open) => setInviteModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite ready</DialogTitle>
            <DialogDescription>
              We sent an email invite to <strong>{inviteModal.email}</strong>.
              You can also share this link manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="invite-link">Invite link</Label>
            <Input id="invite-link" value={inviteModal.link} readOnly />
            <p className="text-xs text-muted-foreground">
              Anyone with this link can open the invite page, but only the invited email can accept.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteModal((prev) => ({ ...prev, open: false }))}
            >
              Done
            </Button>
            <Button onClick={() => copyInviteLink(inviteModal.link)}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
