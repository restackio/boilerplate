"use client";

import { useLayoutEffect, useState } from "react";
import { getAddToSlackAuthorizeUrl } from "./slack-oauth";

/** Client-only href for "Add to Slack" so return_url matches the current page. */
export function useAddToSlackAuthorizeUrl(
  workspaceId: string | null | undefined,
) {
  const [url, setUrl] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!workspaceId) {
      setUrl(null);
      return;
    }
    setUrl(getAddToSlackAuthorizeUrl(workspaceId));
  }, [workspaceId]);
  return url;
}
