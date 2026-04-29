const SLACK_BOT =
  process.env.NEXT_PUBLIC_SLACK_BOT_URL || "http://localhost:3002";

/**
 * Build the slack-bot "Add to Slack" URL. On the client, `return_url` is set
 * to the current page so post-OAuth redirect returns the user there.
 */
export function getAddToSlackAuthorizeUrl(workspaceId: string): string {
  const base = SLACK_BOT.replace(/\/$/, "");
  const u = new URL("/slack/oauth/authorize", base);
  u.searchParams.set("workspace_id", workspaceId);
  if (typeof window !== "undefined") {
    const here = new URL(window.location.href);
    here.hash = "";
    // Do not rely on the address bar alone: right after "Create workspace" the
    // id may be in React state before router.replace adds ?workspaceId=.
    here.searchParams.set("workspaceId", workspaceId);
    u.searchParams.set("return_url", here.toString());
  }
  return u.toString();
}
