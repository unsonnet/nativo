"""
Authentication and authorization utilities for K9 API
"""

import json
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps
import boto3
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError


logger = logging.getLogger()

# Cognito client
cognito_client = boto3.client("cognito-idp")


def get_cognito_public_keys() -> Dict[str, Any]:
    """Get Cognito public keys for JWT verification"""
    import os
    import requests

    user_pool_id = os.environ.get("COGNITO_USER_POOL_ID")
    region = os.environ.get("AWS_REGION", "us-east-1")

    if not user_pool_id:
        raise ValueError("COGNITO_USER_POOL_ID environment variable not set")

    jwks_url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"

    try:
        response = requests.get(jwks_url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch Cognito public keys: {e}")
        raise


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verify and decode a Cognito JWT token"""
    try:
        # Get public keys
        jwks = get_cognito_public_keys()

        # Decode header to get kid
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise JWTError("Token header missing 'kid'")

        # Find the correct key
        key = None
        for k in jwks["keys"]:
            if k["kid"] == kid:
                key = k
                break

        if not key:
            raise JWTError("Unable to find appropriate key")

        # Verify and decode token
        decoded_token = jwt.decode(
            token, key, algorithms=["RS256"], options={"verify_at_hash": False}
        )

        return decoded_token

    except ExpiredSignatureError:
        raise JWTError("Token has expired")
    except JWTClaimsError as e:
        raise JWTError(f"Token claims error: {e}")
    except JWTError as e:
        raise JWTError(f"Token verification failed: {e}")


def extract_user_from_token(token: str) -> Dict[str, Any]:
    """Extract user information from JWT token"""
    decoded = verify_jwt_token(token)

    return {
        "user_id": decoded.get("sub"),
        "username": decoded.get("cognito:username"),
        "email": decoded.get("email"),
        "name": decoded.get("name"),
        "email_verified": decoded.get("email_verified", False),
    }


def require_auth(handler_func: Callable) -> Callable:
    """Decorator to require authentication for Lambda handlers"""

    @wraps(handler_func)
    def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        try:
            # Extract token from Authorization header
            headers = event.get("headers", {})
            auth_header = headers.get("Authorization") or headers.get("authorization")

            if not auth_header:
                from .utils import error_response

                return error_response(
                    "Missing Authorization header", 401, "MISSING_AUTH"
                )

            # Extract Bearer token
            if not auth_header.startswith("Bearer "):
                from .utils import error_response

                return error_response(
                    "Invalid Authorization header format", 401, "INVALID_AUTH_FORMAT"
                )

            token = auth_header[7:]  # Remove 'Bearer ' prefix

            # Verify token and extract user
            user = extract_user_from_token(token)

            # Add user to event
            event["user"] = user

            # Call the actual handler
            return handler_func(event, context)

        except JWTError as e:
            from .utils import error_response

            logger.warning(f"Authentication failed: {e}")
            return error_response("Invalid or expired token", 401, "INVALID_TOKEN")
        except Exception as e:
            from .utils import error_response

            logger.error(f"Authentication error: {e}")
            return error_response("Authentication failed", 500, "AUTH_ERROR")

    return wrapper


def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user profile from Cognito (placeholder for now)"""
    # In a real implementation, you might:
    # 1. Query Cognito for user attributes
    # 2. Query your DuckDB database for extended profile
    # 3. Merge the data

    # For now, return None to indicate profile creation needed
    return None


def create_user_profile(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new user profile (placeholder for now)"""
    # In a real implementation, you might:
    # 1. Validate user data
    # 2. Store extended profile in DuckDB
    # 3. Return the created profile

    from .utils import current_timestamp

    return {
        "user_id": user_data["user_id"],
        "name": user_data.get("name", user_data.get("username", "Unknown")),
        "email": user_data.get("email"),
        "avatar_url": None,
        "preferences": {},
        "created_at": current_timestamp(),
        "updated_at": current_timestamp(),
    }
