"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceScopedActions, McpServer } from "./use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "../lib/database-workspace-context";

export function useOAuthFlow() {
  const router = useRouter();
  const { executeWorkflow } = useWorkspaceScopedActions();
  const { currentUser } = useDatabaseWorkspace();

  const startOAuthFlow = async (server: McpServer) => {
    if (!currentUser?.id) {
      console.error("No current user available");
      return false;
    }

    try {
      // Start OAuth flow
      const result = await executeWorkflow("McpOAuthInitializeWorkflow", {
        user_id: currentUser.id,
        workspace_id: server.workspace_id,
        mcp_server_id: server.id,
      });
      
      if (result.success && result.data && typeof result.data === 'object' && 'authorization_url' in result.data) {
        const data = result.data as { authorization_url: string; client_id?: string; client_secret?: string };
        
        // Store OAuth session data for callback
        sessionStorage.setItem('oauth_mcp_server_id', server.id);
        sessionStorage.setItem('oauth_user_id', currentUser.id);
        sessionStorage.setItem('oauth_workspace_id', server.workspace_id);
        
        // Store client credentials if available
        if (data.client_id) {
          sessionStorage.setItem('oauth_client_id', data.client_id);
        }
        if (data.client_secret) {
          sessionStorage.setItem('oauth_client_secret', data.client_secret);
        }
        
        // Store provider name for callback page
        sessionStorage.setItem('oauth_provider_name', server.server_label);
        
        // Redirect to OAuth authorization URL
        window.location.href = data.authorization_url;
        return true;
      } else {
        console.error("Failed to get authorization URL:", result);
        // Fallback to tokens tab if OAuth initialization fails
        router.push(`/integrations/${server.id}?tab=tokens`);
        return false;
      }
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
      // Fallback to tokens tab on error
      router.push(`/integrations/${server.id}?tab=tokens`);
      return false;
    }
  };

  return { startOAuthFlow };
}
