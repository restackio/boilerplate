"""MCP OAuth client operations for handling OAuth flows."""

import secrets
from urllib.parse import parse_qs, urlencode, urlparse

import httpx
from mcp.client.auth import (
    OAuthRegistrationError,
    OAuthTokenError,
    PKCEParameters,
)
from mcp.shared.auth import (
    OAuthClientInformationFull,
    OAuthClientMetadata,
    OAuthMetadata,
    OAuthToken,
)
from mcp.shared.auth_utils import resource_url_from_server_url
from pydantic import AnyUrl, BaseModel, Field
from restack_ai.function import NonRetryableError, function, log

from .mcp_oauth_crud import GetOAuthTokenInput


# Custom exceptions for better error handling
class OAuthValidationError(NonRetryableError):
    """Raised when OAuth input validation fails."""

class OAuthDiscoveryError(NonRetryableError):
    """Raised when OAuth discovery fails."""

class OAuthClientRegistrationError(NonRetryableError):
    """Raised when OAuth client registration fails."""

class OAuthStateValidationError(NonRetryableError):
    """Raised when OAuth state validation fails."""

# Pydantic models for OAuth flow operations
class ParseCallbackInput(BaseModel):
    callback_url: str = Field(..., min_length=1)


class GenerateAuthUrlInput(BaseModel):
    server_url: str = Field(..., min_length=1)
    server_label: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    redirect_uri: str = Field(..., min_length=1)
    state: str | None = Field(None)


class ExchangeCodeForTokenInput(BaseModel):
    server_url: str = Field(..., min_length=1)
    server_label: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)
    state: str | None = Field(None)
    redirect_uri: str = Field(..., min_length=1)
    client_id: str | None = Field(None, description="OAuth client ID from authorization phase")
    client_secret: str | None = Field(None, description="OAuth client secret from authorization phase")




# Output models
class CallbackParseOutput(BaseModel):
    code: str
    state: str | None


class AuthUrlOutput(BaseModel):
    authorization_url: str
    state: str
    client_secret: str | None = None


class TokenExchangeOutput(BaseModel):
    access_token: str
    refresh_token: str | None
    token_type: str
    expires_in: int | None
    scope: str | None


# Response wrapper models
class CallbackParseResultOutput(BaseModel):
    callback: CallbackParseOutput


class AuthUrlResultOutput(BaseModel):
    auth_url: AuthUrlOutput


class TokenExchangeResultOutput(BaseModel):
    token_exchange: TokenExchangeOutput






# Helper functions using MCP SDK utilities

def sanitize_log_data(data: dict) -> dict:
    """Sanitize sensitive data for logging."""
    sanitized = data.copy()
    sensitive_keys = ["access_token", "refresh_token", "client_secret", "code", "code_verifier"]

    for key in sensitive_keys:
        if key in sanitized:
            value = sanitized[key]
            if value and len(str(value)) > 8:
                sanitized[key] = f"{str(value)[:4]}...{str(value)[-4:]}"
            else:
                sanitized[key] = "***"

    return sanitized

def validate_oauth_callback_params(params: dict, expected_state: str | None = None) -> tuple[str, str | None]:
    """Validate OAuth callback parameters and return code and state."""
    if "error" in params:
        error_desc = params.get("error_description", [""])[0]
        raise NonRetryableError(f"OAuth error: {params['error'][0]} - {error_desc}")

    if "code" not in params:
        raise NonRetryableError("No authorization code found in callback URL")

    code = params["code"][0]
    state = params.get("state", [None])[0]

    # Basic state validation - in production, you'd want to store and validate against expected states
    if expected_state and state != expected_state:
        raise OAuthStateValidationError("OAuth state parameter mismatch - possible CSRF attack")

    # Basic validation of code format
    if not code or len(code) < 10:  # OAuth codes are typically much longer
        raise NonRetryableError("Invalid authorization code format")

    return code, state

def create_client_metadata(user_id: str, workspace_id: str, server_label: str, redirect_uri: str) -> OAuthClientMetadata:
    """Create deterministic OAuth client metadata."""
    deterministic_client_name = f"MCP-Client-{user_id}-{workspace_id}-{server_label}"

    return OAuthClientMetadata(
        client_name=deterministic_client_name,
        redirect_uris=[AnyUrl(redirect_uri)],
        grant_types=["authorization_code", "refresh_token"],
        response_types=["code"],
        scope="read_content update_content"
    )

def get_discovery_urls(server_url: str) -> list[str]:
    """Generate OAuth discovery URLs using MCP SDK logic."""
    from urllib.parse import urljoin, urlparse

    parsed = urlparse(server_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    urls: list[str] = []

    # RFC 8414: Path-aware OAuth discovery
    if parsed.path and parsed.path != "/":
        oauth_path = f"/.well-known/oauth-authorization-server{parsed.path.rstrip('/')}"
        urls.append(urljoin(base_url, oauth_path))

    # OAuth root fallback
    urls.append(urljoin(base_url, "/.well-known/oauth-authorization-server"))

    # RFC 8414 section 5: Path-aware OIDC discovery
    if parsed.path and parsed.path != "/":
        oidc_path = f"/.well-known/openid-configuration{parsed.path.rstrip('/')}"
        urls.append(urljoin(base_url, oidc_path))

    # OIDC 1.0 fallback
    oidc_fallback = f"{server_url.rstrip('/')}/.well-known/openid-configuration"
    urls.append(oidc_fallback)

    return urls


async def discover_oauth_metadata(server_url: str) -> OAuthMetadata:
    """Discover OAuth metadata using MCP SDK's discovery logic with proper fallbacks."""
    discovery_urls = get_discovery_urls(server_url)
    last_error = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in discovery_urls:
            try:
                log.info(f"Attempting OAuth discovery at: {url}")
                response = await client.get(url)

                if response.status_code == 200:
                    try:
                        metadata = OAuthMetadata.model_validate_json(response.content)
                        log.info(f"Successfully discovered OAuth metadata at: {url}")
                        return metadata
                    except Exception as e:
                        log.warning(f"Invalid OAuth metadata at {url}: {e}")
                        last_error = e
                        continue

                elif response.status_code >= 500:
                    # Server error, stop trying other URLs
                    log.error(f"Server error {response.status_code} at {url}")
                    last_error = Exception(f"Server error: {response.status_code}")
                    break
                else:
                    log.warning(f"OAuth discovery failed at {url}: {response.status_code}")
                    last_error = Exception(f"HTTP {response.status_code}")

            except httpx.TimeoutException as e:
                log.warning(f"Timeout discovering OAuth metadata at {url}")
                last_error = e
                continue
            except Exception as e:
                log.warning(f"Error discovering OAuth metadata at {url}: {e}")
                last_error = e
                continue

    error_msg = f"OAuth discovery failed for all endpoints {discovery_urls}"
    if last_error:
        error_msg += f". Last error: {last_error}"
    raise OAuthDiscoveryError(message=error_msg)


# OAuth Flow Functions

@function.defn()
async def oauth_generate_auth_url(
    function_input: GenerateAuthUrlInput,
) -> AuthUrlResultOutput:
    """Generate OAuth authorization URL with manual PKCE handling."""
    try:
        # Generate PKCE parameters using MCP SDK
        pkce_params = PKCEParameters.generate()
        log.info("Generated PKCE parameters", extra={
            "code_verifier_length": len(pkce_params.code_verifier),
            "code_challenge_length": len(pkce_params.code_challenge)
        })

        # Create deterministic client metadata
        client_metadata = create_client_metadata(
            function_input.user_id,
            function_input.workspace_id,
            function_input.server_label,
            function_input.redirect_uri
        )

        # Step 1: Discover OAuth metadata using MCP SDK logic
        oauth_metadata = await discover_oauth_metadata(function_input.server_url)

        # Get base URL for client registration
        parsed_url = urlparse(function_input.server_url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

        async with httpx.AsyncClient() as client:

            # Step 2: Register client
            registration_url = f"{base_url}/register"
            registration_data = client_metadata.model_dump(by_alias=True, mode="json", exclude_none=True)

            reg_response = await client.post(registration_url, json=registration_data)
            if reg_response.status_code not in (200, 201):
                await reg_response.aread()  # MCP pattern: read before accessing text
                raise OAuthRegistrationError(f"Registration failed: {reg_response.status_code} {reg_response.text}")

            client_info = OAuthClientInformationFull.model_validate_json(reg_response.content)

            # Step 3: Build authorization URL with our PKCE parameters
            auth_endpoint = str(oauth_metadata.authorization_endpoint)
            state = secrets.token_urlsafe(32)

            auth_params = {
                "response_type": "code",
                "client_id": client_info.client_id,
                "redirect_uri": function_input.redirect_uri,
                "state": state,
                "code_challenge": pkce_params.code_challenge,
                "code_challenge_method": "S256",
                "scope": "read_content update_content",
                # RFC 8707: Include resource parameter for better authorization scoping
                "resource": resource_url_from_server_url(function_input.server_url)
            }

            authorization_url = f"{auth_endpoint}?{urlencode(auth_params)}"

        # Pack code_verifier with client_secret for token exchange phase
        # Format: "client_secret|code_verifier" - allows passing PKCE parameter between workflows
        return AuthUrlResultOutput(
            auth_url=AuthUrlOutput(
                authorization_url=authorization_url,
                state=state,
                client_secret=f"{client_info.client_secret}|{pkce_params.code_verifier}"  # Pack both values
            )
        )

    except (OAuthRegistrationError, OAuthTokenError) as e:
        log.error(f"OAuth error: {e}")
        raise NonRetryableError(message=f"OAuth flow failed: {e!s}") from e
    except Exception as e:
        log.error(f"OAuth auth URL generation error: {e}")
        raise NonRetryableError(
            message=f"Failed to generate OAuth authorization URL: {e!s}"
        ) from e


@function.defn()
async def oauth_parse_callback(
    function_input: ParseCallbackInput,
) -> CallbackParseResultOutput:
    """Parse OAuth callback URL to extract code and state."""
    try:
        parsed = urlparse(function_input.callback_url)
        params = parse_qs(parsed.query)

        # Validate callback parameters with security checks
        code, state = validate_oauth_callback_params(params)

        result = CallbackParseOutput(
            code=code,
            state=state
        )

        return CallbackParseResultOutput(callback=result)

    except (OAuthStateValidationError, NonRetryableError):
        # Re-raise OAuth-specific errors as-is
        raise
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to parse callback URL: {e!s}"
        ) from e






@function.defn()
async def oauth_exchange_code_for_token(
    function_input: ExchangeCodeForTokenInput,
) -> TokenExchangeResultOutput:
    """Exchange OAuth authorization code for access token using MCP SDK."""
    try:

        if not function_input.server_url:
            raise NonRetryableError(
                message=f"MCP server {function_input.server_label} does not have a server URL configured"
            )

        # Create OAuth client metadata (same as during auth URL generation)
        # Use deterministic client_name to ensure consistent registration
        deterministic_client_name = f"MCP-Client-{function_input.user_id}-{function_input.workspace_id}-{function_input.server_label}"

        client_metadata = OAuthClientMetadata(
            client_name=deterministic_client_name,
            redirect_uris=[AnyUrl(function_input.redirect_uri)],
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            scope="read_content update_content"
        )

        # Direct token exchange using OAuth discovery and client credentials
        try:
            # Step 1: Discover OAuth metadata using MCP SDK logic
            oauth_metadata = await discover_oauth_metadata(function_input.server_url)
            token_endpoint = str(oauth_metadata.token_endpoint)

            # Get base URL for fallback client registration
            parsed_url = urlparse(function_input.server_url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

            async with httpx.AsyncClient() as client:

                # Step 2: Use client credentials and PKCE from authorization phase
                if function_input.client_id and function_input.client_secret:
                    # Unpack client_secret and code_verifier (format: "secret|verifier")
                    if "|" in function_input.client_secret:
                        client_secret, code_verifier = function_input.client_secret.split("|", 1)
                    else:
                        client_secret = function_input.client_secret
                        code_verifier = None

                    # Use the client credentials from the authorization phase
                    token_data = {
                        "grant_type": "authorization_code",
                        "code": function_input.code,
                        "redirect_uri": function_input.redirect_uri,
                        "client_id": function_input.client_id,
                        "client_secret": client_secret,
                        # RFC 8707: Include resource parameter for token scoping
                        "resource": resource_url_from_server_url(function_input.server_url)
                    }

                    # Add PKCE code_verifier if available
                    if code_verifier:
                        token_data["code_verifier"] = code_verifier
                        log.info("Using PKCE code_verifier for token exchange")

                    log.info(f"Using client credentials from authorization phase: {function_input.client_id}")
                else:
                    # Fallback: register a new client (this was causing the mismatch)
                    registration_url = f"{base_url}/register"
                    registration_data = client_metadata.model_dump(by_alias=True, mode="json", exclude_none=True)

                    reg_response = await client.post(registration_url, json=registration_data)
                    if reg_response.status_code not in (200, 201):
                        await reg_response.aread()
                        raise OAuthRegistrationError(f"Client registration failed: {reg_response.status_code}")

                    client_info = OAuthClientInformationFull.model_validate_json(reg_response.content)

                    token_data = {
                        "grant_type": "authorization_code",
                        "code": function_input.code,
                        "redirect_uri": function_input.redirect_uri,
                        "client_id": client_info.client_id,
                        # RFC 8707: Include resource parameter for token scoping
                        "resource": resource_url_from_server_url(function_input.server_url)
                    }

                    if client_info.client_secret:
                        token_data["client_secret"] = client_info.client_secret

                token_response = await client.post(
                    token_endpoint,
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )

                if token_response.status_code != 200:
                    await token_response.aread()  # MCP pattern: read before accessing text
                    error_message = f"Token exchange failed: {token_response.status_code} - {token_response.text}"
                    raise OAuthTokenError(error_message)

                tokens = OAuthToken.model_validate_json(token_response.content)

            result = TokenExchangeOutput(
                access_token=tokens.access_token,
                refresh_token=tokens.refresh_token,
                token_type=tokens.token_type,
                expires_in=tokens.expires_in,
                scope=tokens.scope
            )

            return TokenExchangeResultOutput(token_exchange=result)

        except (OAuthRegistrationError, OAuthTokenError) as e:
            log.error(f"OAuth error: {e}")
            raise NonRetryableError(message=f"OAuth flow failed: {e!s}") from e
        except Exception as e:
            raise NonRetryableError(
                message=f"OAuth token exchange failed: {e!s}"
            ) from e

    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to exchange code for token: {e!s}"
        ) from e


@function.defn()
async def oauth_refresh_token(
    _function_input: GetOAuthTokenInput,
) -> TokenExchangeResultOutput:
    """Refresh OAuth access token using refresh token."""
    try:
        # This is a placeholder implementation
        # In a real implementation, this would:
        # 1. Get stored refresh token from database
        # 2. Get MCP server OAuth configuration (token endpoint, client credentials)
        # 3. Make POST request to token endpoint with refresh token
        # 4. Return the new tokens

        # For now, return a placeholder indicating this needs to be implemented
        def _raise_not_implemented() -> None:
            raise NonRetryableError(
                message="OAuth token refresh not yet implemented. Please configure MCP server OAuth endpoints."
            )

        _raise_not_implemented()

    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to refresh token: {e!s}"
        ) from e


