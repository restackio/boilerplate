"""MCP OAuth client operations for handling OAuth flows."""

import secrets
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

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


async def register_oauth_client(
    client: httpx.AsyncClient,
    oauth_metadata: OAuthMetadata,
    base_url: str,
    server_label: str,
) -> OAuthClientInformationFull:
    """Register OAuth client dynamically with the authorization server."""
    registration_endpoint = oauth_metadata.registration_endpoint

    if not registration_endpoint:
        error_message = (
            "No registration endpoint found in OAuth metadata"
        )
        raise OAuthRegistrationError(error_message)

    # Prepare client registration data
    registration_data = {
        "client_name": f"MCP Client for {server_label}",
        "redirect_uris": [f"{base_url}/oauth/callback"],
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "client_secret_basic",
        "scope": "openid profile",
    }

    try:
        response = await client.post(
            str(registration_endpoint),
            json=registration_data,
            headers={"Content-Type": "application/json"},
            timeout=10.0,
        )
        response.raise_for_status()

        registration_response = response.json()

        return OAuthClientInformationFull(
            client_id=registration_response["client_id"],
            client_secret=registration_response.get(
                "client_secret"
            ),
            registration_client_uri=registration_response.get(
                "registration_client_uri"
            ),
            registration_access_token=registration_response.get(
                "registration_access_token"
            ),
            client_id_issued_at=registration_response.get(
                "client_id_issued_at"
            ),
            client_secret_expires_at=registration_response.get(
                "client_secret_expires_at"
            ),
            redirect_uris=registration_response.get(
                "redirect_uris", [f"{base_url}/oauth/callback"]
            ),
        )

    except httpx.HTTPStatusError as e:
        error_message = f"Failed to register OAuth client: HTTP {e.response.status_code}"
        raise OAuthRegistrationError(error_message) from e
    except Exception as e:
        error_message = f"OAuth client registration failed: {e}"
        raise OAuthRegistrationError(error_message) from e


# Custom exceptions for better error handling
class OAuthValidationError(NonRetryableError):
    """Raised when OAuth input validation fails."""


class OAuthDiscoveryError(NonRetryableError):
    """Raised when OAuth list fails."""


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
    client_id: str | None = Field(
        None,
        description="OAuth client ID from authorization phase",
    )
    client_secret: str | None = Field(
        None,
        description="OAuth client secret from authorization phase",
    )


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
    # Client credentials for future token refresh
    client_id: str | None = None
    client_secret: str | None = None


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
    sensitive_keys = [
        "access_token",
        "refresh_token",
        "client_secret",
        "code",
        "code_verifier",
    ]

    for key in sensitive_keys:
        if key in sanitized:
            value = sanitized[key]
            min_length_for_truncation = 8
            if (
                value
                and len(str(value)) > min_length_for_truncation
            ):
                sanitized[key] = (
                    f"{str(value)[:4]}...{str(value)[-4:]}"
                )
            else:
                sanitized[key] = "***"

    return sanitized


def validate_oauth_callback_params(
    params: dict, expected_state: str | None = None
) -> tuple[str, str | None]:
    """Validate OAuth callback parameters and return code and state."""
    if "error" in params:
        error_desc = params.get("error_description", [""])[0]
        error_message = (
            f"OAuth error: {params['error'][0]} - {error_desc}"
        )
        raise NonRetryableError(error_message)

    if "code" not in params:
        error_message = (
            "No authorization code found in callback URL"
        )
        raise NonRetryableError(error_message)

    code = params["code"][0]
    state = params.get("state", [None])[0]

    # Basic state validation - in production, you'd want to store and validate against expected states
    if expected_state and state != expected_state:
        error_message = "OAuth state parameter mismatch - possible CSRF attack"
        raise OAuthStateValidationError(error_message)

    # Basic validation of code format
    min_oauth_code_length = 10
    if (
        not code or len(code) < min_oauth_code_length
    ):  # OAuth codes are typically much longer
        error_message = "Invalid authorization code format"
        raise NonRetryableError(error_message)

    return code, state


def _raise_server_url_missing_error(server_label: str) -> None:
    """Raise error when server URL is missing."""
    error_message = f"MCP server {server_label} does not have a server URL configured"
    raise NonRetryableError(message=error_message)


def _raise_no_refresh_token_error() -> None:
    """Raise error when no refresh token is found."""
    error_message = (
        "No refresh token found for this user and MCP server"
    )
    raise NonRetryableError(message=error_message)


def _raise_server_not_found_error(mcp_server_id: str) -> None:
    """Raise error when MCP server is not found."""
    error_message = f"MCP server not found: {mcp_server_id}"
    raise NonRetryableError(message=error_message)


def _raise_token_refresh_failed_error(error_detail: str) -> None:
    """Raise error when token refresh fails."""
    error_message = f"Token refresh failed: {error_detail}"
    raise NonRetryableError(message=error_message)


def _raise_registration_failed_error(
    status_code: int, text: str
) -> None:
    """Raise error when OAuth registration fails."""
    error_message = f"Registration failed: {status_code} {text}"
    raise OAuthRegistrationError(error_message)


def _raise_client_registration_failed_error(
    status_code: int,
) -> None:
    """Raise error when client registration fails."""
    error_message = f"Client registration failed: {status_code}"
    raise OAuthRegistrationError(error_message)


def _raise_token_exchange_failed_error(
    status_code: int, text: str
) -> None:
    """Raise error when token exchange fails."""
    error_message = (
        f"Token exchange failed: {status_code} - {text}"
    )
    raise OAuthTokenError(error_message)


def create_client_metadata(
    user_id: str,
    workspace_id: str,
    server_label: str,
    redirect_uri: str,
) -> OAuthClientMetadata:
    """Create deterministic OAuth client metadata."""
    deterministic_client_name = (
        f"MCP-Client-{user_id}-{workspace_id}-{server_label}"
    )

    return OAuthClientMetadata(
        client_name=deterministic_client_name,
        redirect_uris=[AnyUrl(redirect_uri)],
        grant_types=["authorization_code", "refresh_token"],
        response_types=["code"],
        scope="read_content update_content",
    )


def get_discovery_urls(server_url: str) -> list[str]:
    """Generate OAuth discovery URLs using MCP SDK logic."""
    parsed = urlparse(server_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    urls: list[str] = []

    # RFC 8414: Path-aware OAuth discovery
    if parsed.path and parsed.path != "/":
        oauth_path = f"/.well-known/oauth-authorization-server{parsed.path.rstrip('/')}"
        urls.append(urljoin(base_url, oauth_path))

    # OAuth root fallback
    urls.append(
        urljoin(
            base_url, "/.well-known/oauth-authorization-server"
        )
    )

    # RFC 8414 section 5: Path-aware OIDC discovery
    if parsed.path and parsed.path != "/":
        oidc_path = f"/.well-known/openid-configuration{parsed.path.rstrip('/')}"
        urls.append(urljoin(base_url, oidc_path))

    # OIDC 1.0 fallback
    oidc_fallback = f"{server_url.rstrip('/')}/.well-known/openid-configuration"
    urls.append(oidc_fallback)

    return urls


async def discover_oauth_metadata(
    server_url: str,
) -> OAuthMetadata:
    """Discover OAuth metadata using MCP SDK's discovery logic with proper fallbacks."""
    discovery_urls = get_discovery_urls(server_url)
    last_error = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in discovery_urls:
            try:
                log.info(f"Attempting OAuth discovery at: {url}")
                response = await client.get(url)

                http_ok = 200
                http_server_error = 500

                if response.status_code == http_ok:
                    try:
                        metadata = (
                            OAuthMetadata.model_validate_json(
                                response.content
                            )
                        )
                        log.info(
                            f"Successfully discovered OAuth metadata at: {url}"
                        )
                    except (ValueError, TypeError, KeyError) as e:
                        log.warning(
                            f"Invalid OAuth metadata at {url}: {e}"
                        )
                        last_error = e
                        continue
                    else:
                        return metadata
                elif response.status_code >= http_server_error:
                    # Server error, stop trying other URLs
                    log.error(
                        f"Server error {response.status_code} at {url}"
                    )
                    last_error = Exception(
                        f"Server error: {response.status_code}"
                    )
                    break
                else:
                    log.warning(
                        f"OAuth discovery failed at {url}: {response.status_code}"
                    )
                    last_error = Exception(
                        f"HTTP {response.status_code}"
                    )

            except httpx.TimeoutException as e:
                log.warning(
                    f"Timeout discovering OAuth metadata at {url}"
                )
                last_error = e
                continue
            except (
                httpx.RequestError,
                ValueError,
                TypeError,
            ) as e:
                log.warning(
                    f"Error discovering OAuth metadata at {url}: {e}"
                )
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
        log.info(
            "Generated PKCE parameters",
            extra={
                "code_verifier_length": len(
                    pkce_params.code_verifier
                ),
                "code_challenge_length": len(
                    pkce_params.code_challenge
                ),
            },
        )

        # Create deterministic client metadata
        client_metadata = create_client_metadata(
            function_input.user_id,
            function_input.workspace_id,
            function_input.server_label,
            function_input.redirect_uri,
        )

        # Step 1: Discover OAuth metadata using MCP SDK logic
        oauth_metadata = await discover_oauth_metadata(
            function_input.server_url
        )

        # Get base URL for client registration
        parsed_url = urlparse(function_input.server_url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

        async with httpx.AsyncClient() as client:
            # Step 2: Register client
            registration_url = f"{base_url}/register"
            registration_data = client_metadata.model_dump(
                by_alias=True, mode="json", exclude_none=True
            )

            reg_response = await client.post(
                registration_url, json=registration_data
            )
            if reg_response.status_code not in (200, 201):
                await (
                    reg_response.aread()
                )  # MCP pattern: read before accessing text
                _raise_registration_failed_error(
                    reg_response.status_code, reg_response.text
                )

            client_info = (
                OAuthClientInformationFull.model_validate_json(
                    reg_response.content
                )
            )

            # Step 3: Build authorization URL with our PKCE parameters
            auth_endpoint = str(
                oauth_metadata.authorization_endpoint
            )
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
                "resource": resource_url_from_server_url(
                    function_input.server_url
                ),
            }

            authorization_url = (
                f"{auth_endpoint}?{urlencode(auth_params)}"
            )

        # Pack code_verifier with client_secret for token exchange phase
        # Format: "client_secret|code_verifier" - allows passing PKCE parameter between workflows
        return AuthUrlResultOutput(
            auth_url=AuthUrlOutput(
                authorization_url=authorization_url,
                state=state,
                client_secret=f"{client_info.client_secret}|{pkce_params.code_verifier}",  # Pack both values
            )
        )

    except (OAuthRegistrationError, OAuthTokenError) as e:
        log.error(f"OAuth error: {e}")
        raise NonRetryableError(
            message=f"OAuth flow failed: {e!s}"
        ) from e
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

        result = CallbackParseOutput(code=code, state=state)

        return CallbackParseResultOutput(callback=result)

    except (OAuthStateValidationError, NonRetryableError):
        # Re-raise OAuth-specific errors as-is
        raise
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to parse callback URL: {e!s}"
        ) from e


@function.defn()
async def _prepare_token_data_with_existing_credentials(
    function_input: ExchangeCodeForTokenInput,
) -> tuple[dict, str | None, str | None]:
    """Prepare token exchange data using existing client credentials from auth phase."""
    client_secret = None
    code_verifier = None

    # Unpack client_secret and code_verifier (format: "secret|verifier")
    if function_input.client_secret and "|" in function_input.client_secret:
        client_secret, code_verifier = function_input.client_secret.split("|", 1)
    else:
        client_secret = function_input.client_secret

    token_data = {
        "grant_type": "authorization_code",
        "code": function_input.code,
        "redirect_uri": function_input.redirect_uri,
        "client_id": function_input.client_id,
        "client_secret": client_secret,
        "resource": resource_url_from_server_url(function_input.server_url),
    }

    if code_verifier:
        token_data["code_verifier"] = code_verifier
        log.info("Using PKCE code_verifier for token exchange")

    log.info(f"Using client credentials from authorization phase: {function_input.client_id}")
    return (token_data, client_secret, None)


async def _register_new_client_and_prepare_token_data(
    function_input: ExchangeCodeForTokenInput,
    client: httpx.AsyncClient,
    base_url: str,
    client_metadata: OAuthClientMetadata,
) -> tuple[dict, str | None, str]:
    """Register a new OAuth client and prepare token exchange data."""
    registration_url = f"{base_url}/register"
    registration_data = client_metadata.model_dump(
        by_alias=True,
        mode="json",
        exclude_none=True,
    )

    reg_response = await client.post(registration_url, json=registration_data)
    if reg_response.status_code not in (200, 201):
        await reg_response.aread()
        _raise_client_registration_failed_error(reg_response.status_code)

    client_info = OAuthClientInformationFull.model_validate_json(reg_response.content)

    token_data = {
        "grant_type": "authorization_code",
        "code": function_input.code,
        "redirect_uri": function_input.redirect_uri,
        "client_id": client_info.client_id,
        "resource": resource_url_from_server_url(function_input.server_url),
    }

    if client_info.client_secret:
        token_data["client_secret"] = client_info.client_secret

    return (token_data, client_info.client_secret, client_info.client_id)


@function.defn()
async def oauth_exchange_code_for_token(
    function_input: ExchangeCodeForTokenInput,
) -> TokenExchangeResultOutput:
    """Exchange OAuth authorization code for access token using MCP SDK."""
    try:
        if not function_input.server_url:
            _raise_server_url_missing_error(
                function_input.server_label
            )

        # Create OAuth client metadata (same as during auth URL generation)
        # Use deterministic client_name to ensure consistent registration
        deterministic_client_name = f"MCP-Client-{function_input.user_id}-{function_input.workspace_id}-{function_input.server_label}"

        client_metadata = OAuthClientMetadata(
            client_name=deterministic_client_name,
            redirect_uris=[AnyUrl(function_input.redirect_uri)],
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            scope="read_content update_content",
        )

        # Direct token exchange using OAuth discovery and client credentials
        try:
            # Step 1: Discover OAuth metadata using MCP SDK logic
            oauth_metadata = await discover_oauth_metadata(
                function_input.server_url
            )
            token_endpoint = str(oauth_metadata.token_endpoint)

            # Get base URL for fallback client registration
            parsed_url = urlparse(function_input.server_url)
            base_url = (
                f"{parsed_url.scheme}://{parsed_url.netloc}"
            )

            # Initialize variables for client credentials
            client_secret = None
            fallback_client_id = None
            fallback_client_secret = None

            async with httpx.AsyncClient() as client:
                # Step 2: Prepare token exchange data (use existing credentials or register new client)
                if function_input.client_id and function_input.client_secret:
                    token_data, client_secret, _ = await _prepare_token_data_with_existing_credentials(
                        function_input
                    )
                else:
                    token_data, fallback_client_secret, fallback_client_id = await _register_new_client_and_prepare_token_data(
                        function_input, client, base_url, client_metadata
                    )

                token_response = await client.post(
                    token_endpoint,
                    data=token_data,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                )

                http_ok = 200
                if token_response.status_code != http_ok:
                    await (
                        token_response.aread()
                    )  # MCP pattern: read before accessing text
                    _raise_token_exchange_failed_error(
                        token_response.status_code,
                        token_response.text,
                    )

                tokens = OAuthToken.model_validate_json(
                    token_response.content
                )

            # Determine which client credentials to return
            final_client_id = (
                function_input.client_id or fallback_client_id
            )
            final_client_secret = (
                client_secret
                if client_secret
                else fallback_client_secret
            )

            result = TokenExchangeOutput(
                access_token=tokens.access_token,
                refresh_token=tokens.refresh_token,
                token_type=tokens.token_type,
                expires_in=tokens.expires_in,
                scope=tokens.scope,
                # Include client credentials for storage
                client_id=final_client_id,
                client_secret=final_client_secret,
            )

            return TokenExchangeResultOutput(
                token_exchange=result
            )

        except (OAuthRegistrationError, OAuthTokenError) as e:
            log.error(f"OAuth error: {e}")
            raise NonRetryableError(
                message=f"OAuth flow failed: {e!s}"
            ) from e
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
    function_input: GetOAuthTokenInput,
) -> TokenExchangeResultOutput:
    """Refresh OAuth access token using refresh token."""
    try:
        log.info(
            f"Refreshing OAuth token for user {function_input.user_id}, server {function_input.mcp_server_id}"
        )

        # Import here to avoid circular imports
        from src.functions.mcp_oauth_crud import (
            GetMcpServerInput,
            mcp_server_get_by_id,
            oauth_token_get_decrypted,
        )

        # Step 1: Get stored refresh token from database
        token_result = await oauth_token_get_decrypted(
            function_input
        )
        if not token_result or not token_result.refresh_token:
            _raise_no_refresh_token_error()

        # Step 2: Get MCP server configuration
        server_result = await mcp_server_get_by_id(
            GetMcpServerInput(
                mcp_server_id=function_input.mcp_server_id
            )
        )
        if not server_result or not server_result.server:
            _raise_server_not_found_error(
                function_input.mcp_server_id
            )

        server = server_result.server

        # Step 3: Discover OAuth metadata to get token endpoint
        oauth_metadata = await discover_oauth_metadata(
            server.server_url
        )
        token_endpoint = str(oauth_metadata.token_endpoint)

        # Step 4: Get client credentials (stored in server headers or use dynamic registration)
        client_id = None
        client_secret = None

        if server.headers and isinstance(server.headers, dict):
            # Check if client credentials are stored in server headers
            client_id = server.headers.get("oauth_client_id")
            client_secret = server.headers.get(
                "oauth_client_secret"
            )

        if not client_id or not client_secret:
            # Fall back to dynamic client registration if no stored credentials
            log.warning(
                f"No stored client credentials found in MCP server headers for server {function_input.mcp_server_id}. "
                f"Headers present: {list(server.headers.keys()) if server.headers else 'None'}. "
                "Attempting dynamic registration, but this may cause client ID mismatch errors."
            )
            parsed_url = urlparse(server.server_url)
            base_url = (
                f"{parsed_url.scheme}://{parsed_url.netloc}"
            )

            async with httpx.AsyncClient() as client:
                registration_result = await register_oauth_client(
                    client,
                    oauth_metadata,
                    base_url,
                    server.server_label,
                )
                client_id = registration_result.client_id
                client_secret = registration_result.client_secret

                log.info(
                    f"Dynamic registration successful. New client_id: {client_id}. "
                    "Note: This may not match the original client used for token issuance."
                )

        # Step 5: Make refresh token request
        async with httpx.AsyncClient() as client:
            token_data = {
                "grant_type": "refresh_token",
                "refresh_token": token_result.refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
                # RFC 8707: Include resource parameter for token scoping
                "resource": resource_url_from_server_url(
                    server.server_url
                ),
            }

            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            }

            log.info(
                f"Making refresh token request to {token_endpoint}"
            )
            response = await client.post(
                token_endpoint,
                data=token_data,
                headers=headers,
                timeout=30.0,
            )

            http_ok = 200
            if response.status_code != http_ok:
                error_detail = f"HTTP {response.status_code}"
                try:
                    error_json = response.json()
                    error_detail = f"HTTP {response.status_code}: {error_json.get('error', 'unknown_error')} - {error_json.get('error_description', 'No description')}"
                except (ValueError, KeyError, TypeError):
                    error_detail = f"HTTP {response.status_code}: {response.text[:200]}"

                _raise_token_refresh_failed_error(error_detail)

            tokens = response.json()

            # Step 6: Return the refreshed tokens
            return TokenExchangeResultOutput(
                token_exchange=TokenExchangeOutput(
                    access_token=tokens["access_token"],
                    refresh_token=tokens.get(
                        "refresh_token",
                        token_result.refresh_token,
                    ),  # Use new refresh token if provided, otherwise keep existing
                    token_type=tokens.get("token_type", "Bearer"),
                    expires_in=tokens.get("expires_in"),
                    scope=tokens.get("scope"),
                )
            )

    except NonRetryableError:
        raise
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to refresh token: {e!s}"
        ) from e
