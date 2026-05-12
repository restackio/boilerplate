"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { Badge } from "@workspace/ui/components/ui/badge";
import { useToast } from "@workspace/ui/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  UserX,
  XCircle,
} from "lucide-react";

type InviteViewState =
  | "loading"
  | "ready"
  | "mismatch"
  | "invalid"
  | "already_member"
  | "declined";

function InviteLayout({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-xl border shadow-sm">
        <CardHeader className="space-y-3 sm:space-y-4 pb-4 sm:pb-6">
          <div className="flex items-center justify-center">
            <div className="size-10 sm:size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              {icon}
            </div>
          </div>
          <div className="text-center space-y-1.5 sm:space-y-2">
            {badge ? <div className="flex justify-center">{badge}</div> : null}
            <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
            <CardDescription className="text-sm sm:text-base">{description}</CardDescription>
          </div>
        </CardHeader>
        {children ? <CardContent className="pt-0">{children}</CardContent> : null}
      </Card>
    </div>
  );
}

function InvitePageContent() {
  const router = useRouter();
  const { toast } = useToast();
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
      toast({
        title: "Joined workspace",
        description: "Your invitation was accepted successfully.",
      });
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
      <InviteLayout
        icon={<Loader2 className="size-6 animate-spin" />}
        title="Checking invitation"
        description="Please wait while we validate this invite."
      />
    );
  }

  if (state === "declined") {
    return (
      <InviteLayout
        icon={<XCircle className="size-6" />}
        title="Invitation declined"
        description="You chose not to join this workspace."
      >
        <div className="flex justify-center">
          <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
        </div>
      </InviteLayout>
    );
  }

  if (state === "mismatch") {
    return (
      <InviteLayout
        icon={<UserX className="size-6" />}
        title="Invitation blocked"
        description="This invitation does not match the currently logged-in user."
      >
        <div className="flex justify-center">
          <Button onClick={onSignOut}>Sign out and switch account</Button>
        </div>
      </InviteLayout>
    );
  }

  if (state === "already_member") {
    return (
      <InviteLayout
        icon={<CheckCircle2 className="size-6" />}
        title="Already in workspace"
        description="You are already a member. Redirecting to your dashboard."
      />
    );
  }

  if (state === "invalid") {
    return (
      <InviteLayout
        icon={<AlertCircle className="size-6" />}
        title="Invitation unavailable"
        description="This invitation is no longer valid."
      />
    );
  }

  return (
    <InviteLayout
      icon={<Mail className="size-6" />}
      title="Workspace invitation"
      description={
        <>
          You were invited to join{" "}
          <span className="font-semibold text-foreground">
            {workspaceName ?? "this workspace"}
          </span>
          .
        </>
      }
      badge={<Badge variant="secondary">Email-verified invite</Badge>}
    >
      <div className="space-y-4 sm:space-y-5">
        <div className="rounded-md border bg-muted/30 p-3 text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="size-4 mt-0.5 text-primary" />
          <p>
            This invite is bound to your email. Only the intended account can accept it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <Button onClick={onAccept} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Processing..." : "Accept invitation"}
          </Button>
          <Button
            variant="outline"
            onClick={onDecline}
            disabled={isSubmitting}
            className="w-full"
          >
            Decline
          </Button>
        </div>
      </div>
    </InviteLayout>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <InviteLayout
          icon={<Loader2 className="size-6 animate-spin" />}
          title="Checking invitation"
          description="Please wait while we validate this invite."
        />
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}
