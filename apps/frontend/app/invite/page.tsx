"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acceptWorkspaceInvite,
  declineWorkspaceInvite,
  getWorkspaceInviteByToken,
} from "@/app/actions/workspace-invites";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";

type InviteViewState =
  | "loading"
  | "ready"
  | "mismatch"
  | "invalid"
  | "already_member"
  | "declined";

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [state, setState] = useState<InviteViewState>("loading");
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentUser = useCallback(() => {
    const raw = localStorage.getItem("currentUser");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as { id: string };
    } catch {
      return null;
    }
  }, []);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setState("invalid");
      return;
    }

    const user = getCurrentUser();
    if (!user?.id) {
      const returnTo = encodeURIComponent(`/invite?token=${token}`);
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }

    const result = await getWorkspaceInviteByToken({
      token,
      redeemer_user_id: user.id,
    });

    if (!result?.success || !result.data) {
      setState("invalid");
      return;
    }

    const status = (result.data as { status?: string }).status;
    if (status === "ok") {
      setWorkspaceName(
        (result.data as { workspace_name?: string }).workspace_name ?? null,
      );
      setState("ready");
      return;
    }
    if (status === "mismatch") {
      setState("mismatch");
      return;
    }
    if (status === "already_member") {
      const workspaceId = (result.data as { workspace_id?: string }).workspace_id;
      if (workspaceId) {
        localStorage.setItem("currentWorkspaceId", workspaceId);
      }
      setState("already_member");
      setTimeout(() => router.replace("/dashboard"), 500);
      return;
    }
    setState("invalid");
  }, [getCurrentUser, router, token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  const onAccept = async () => {
    const user = getCurrentUser();
    if (!user?.id) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`);
      return;
    }

    setIsSubmitting(true);
    const result = await acceptWorkspaceInvite({
      token,
      redeemer_user_id: user.id,
    });
    setIsSubmitting(false);

    if (!result?.success || !result.data) {
      setState("invalid");
      return;
    }

    const status = (result.data as { status?: string }).status;
    if (status === "accepted") {
      const workspaceId = (result.data as { workspace_id?: string }).workspace_id;
      if (workspaceId) {
        localStorage.setItem("currentWorkspaceId", workspaceId);
      }
      router.replace("/dashboard");
      return;
    }
    if (status === "mismatch") {
      setState("mismatch");
      return;
    }
    setState("invalid");
  };

  const onDecline = async () => {
    const user = getCurrentUser();
    if (!user?.id) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`);
      return;
    }

    setIsSubmitting(true);
    const result = await declineWorkspaceInvite({
      token,
      redeemer_user_id: user.id,
    });
    setIsSubmitting(false);

    if (result?.success && result.data) {
      const status = (result.data as { status?: string }).status;
      if (status === "declined") {
        setState("declined");
        return;
      }
    }
    setState("invalid");
  };

  const onSignOut = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentWorkspaceId");
    router.replace(`/login?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`);
  };

  if (state === "loading") {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Checking invitation...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Invitation declined</CardTitle>
            <CardDescription>You declined this workspace invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "mismatch") {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Invitation blocked</CardTitle>
            <CardDescription>
              This invitation is not for the currently logged-in user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onSignOut}>Sign out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "already_member") {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>You are already a member</CardTitle>
            <CardDescription>Redirecting to your dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Invitation not available</CardTitle>
            <CardDescription>This invitation is no longer valid.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
          <CardDescription>
            Do you want to join {workspaceName ? <strong>{workspaceName}</strong> : "this workspace"}?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={onAccept} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Accept"}
          </Button>
          <Button variant="outline" onClick={onDecline} disabled={isSubmitting}>
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
