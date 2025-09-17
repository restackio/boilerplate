"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/ui/button";
import { CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('');
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state parameter');
          return;
        }

        // Get stored OAuth parameters (MCP SDK handles PKCE internally)
        const mcpServerId = sessionStorage.getItem('oauth_mcp_server_id');
        const userId = sessionStorage.getItem('oauth_user_id');
        const workspaceId = sessionStorage.getItem('oauth_workspace_id');
        const clientId = sessionStorage.getItem('oauth_client_id');
        const clientSecret = sessionStorage.getItem('oauth_client_secret');

        if (!mcpServerId || !userId || !workspaceId) {
          setStatus('error');
          setMessage('Missing OAuth session data. Please try the connection process again.');
          return;
        }

        // Get provider name from session storage (set during OAuth initiation)
        const storedProvider = sessionStorage.getItem('oauth_provider_name') || 'service';
        setProvider(storedProvider);

        console.log('OAuth callback received:', {
          provider: storedProvider,
          mcpServerId,
          code: code.substring(0, 10) + '...', // Log partial code for debugging
          state,
        });

        // Call backend to handle OAuth callback
        const response = await fetch('/api/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow: 'McpOAuthCallbackWorkflow',
            input: {
              user_id: userId,
              workspace_id: workspaceId,
              mcp_server_id: mcpServerId,
              callback_url: window.location.href,
              client_id: clientId, // Pass the client_id from authorization phase
              client_secret: clientSecret, // Pass the client_secret from authorization phase
            }
          }),
        });

        const result = await response.json();
        
        if (result.success && result.data?.success) {
          setStatus('success');
          setMessage(`Successfully connected your ${storedProvider} account!`);
          setTokenId(result.data?.token_id || null);
        } else {
          setStatus('error');
          setMessage(result.data?.error || 'Failed to complete OAuth connection');
          // Clean up session storage on error since we won't need it
          cleanupSessionStorage();
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during OAuth callback processing.');
        // Clean up session storage on error since we won't need it
        cleanupSessionStorage();
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  const cleanupSessionStorage = () => {
    sessionStorage.removeItem('oauth_mcp_server_id');
    sessionStorage.removeItem('oauth_user_id');
    sessionStorage.removeItem('oauth_workspace_id');
    sessionStorage.removeItem('oauth_provider_name');
    sessionStorage.removeItem('oauth_client_id');
    sessionStorage.removeItem('oauth_client_secret');
  };

  const handleMakeDefault = async () => {
    if (!tokenId) return;
    
    setIsSettingDefault(true);
    try {
      const response = await fetch('/api/oauth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow: 'OAuthTokenSetDefaultByIdWorkflow',
          input: {
            token_id: tokenId,
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Clean up session storage and redirect to integrations page
        cleanupSessionStorage();
        router.push('/integrations');
      } else {
        console.error('Failed to set token as default:', result);
        // Still clean up and redirect to integrations page
        cleanupSessionStorage();
        router.push('/integrations');
      }
    } catch (error) {
      console.error('Error setting token as default:', error);
      // Still clean up and redirect to integrations page
      cleanupSessionStorage();
      router.push('/integrations');
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleSkip = () => {
    cleanupSessionStorage();
    router.push('/integrations');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h1 className="text-xl font-semibold mb-2">Processing OAuth connection...</h1>
            <p className="text-gray-600">
              Please wait while we complete your {provider} integration.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-green-800 mb-2">
              Connection Successful!
            </h1>
            <p className="text-gray-600 mb-2">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              Would you like to make this token the default for your workspace?
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleMakeDefault}
                disabled={isSettingDefault}
                className="w-full"
              >
                {isSettingDefault ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting as Default...
                  </>
                ) : (
                  'Make Token Default'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSkip}
                disabled={isSettingDefault}
                className="w-full"
              >
                Skip
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-red-800 mb-2">
              Connection Failed
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  cleanupSessionStorage();
                  router.push('/integrations');
                }}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  cleanupSessionStorage();
                  window.close();
                }} 
                className="w-full"
              >
                Close Window
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
