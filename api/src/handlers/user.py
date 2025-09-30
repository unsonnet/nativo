"""
User Lambda Handler

Handles user profile and account-related API endpoints
EXACTLY matching the React app API specifications from src/lib/api/userApi.ts
"""

import logging
from typing import Dict, Any

from shared.utils import (
    success_response,
    error_response,
    parse_json_body,
    get_user_from_event,
    handle_cors_preflight,
)
from shared.auth import require_auth
from shared.models import UserProfile, UpdateProfileRequest, DBUser
from shared.database import UserRepository


logger = logging.getLogger()
logger.setLevel(logging.INFO)


@require_auth
def get_profile(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /user/profile
    Get current user profile

    EXACT match for UserApiService.getProfile() in src/lib/api/userApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]

        # Get user from database
        db_user = UserRepository.get_user(user_id)

        if not db_user:
            # Create profile if it doesn't exist (first time user)
            db_user = DBUser(
                user_id=user_id,
                name=user.get("name", user.get("username", "Unknown User")),
                email=user.get("email"),
                avatar_url=None,
                preferences={},
            )
            UserRepository.create_user(db_user)

        # Convert to UserProfile format for API response
        profile = UserProfile(
            id=db_user.user_id,
            name=db_user.name,
            email=db_user.email,
            avatarUrl=db_user.avatar_url,
            createdAt=db_user.created_at.isoformat() if db_user.created_at else None,
            updatedAt=db_user.updated_at.isoformat() if db_user.updated_at else None,
            preferences=db_user.preferences,
        )

        return success_response(profile.model_dump())

    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return error_response("Failed to get user profile", 500)


@require_auth
def update_profile(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PATCH /user/profile
    Update user profile

    EXACT match for UserApiService.updateProfile() in src/lib/api/userApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]

        # Parse request body
        body = parse_json_body(event)
        update_request = UpdateProfileRequest(**body)

        # Get current user
        db_user = UserRepository.get_user(user_id)
        if not db_user:
            return error_response("User profile not found", 404)

        # Update fields if provided
        if update_request.name is not None:
            db_user.name = update_request.name
        if update_request.email is not None:
            db_user.email = update_request.email
        if update_request.avatarUrl is not None:
            db_user.avatar_url = update_request.avatarUrl
        if update_request.preferences is not None:
            db_user.preferences = (
                update_request.preferences.model_dump()
                if update_request.preferences
                else {}
            )

        # Update timestamp
        from datetime import datetime

        db_user.updated_at = datetime.utcnow()

        # Save to database
        success = UserRepository.update_user(db_user)
        if not success:
            return error_response("Failed to update profile", 500)

        # Convert to UserProfile format for API response
        profile = UserProfile(
            id=db_user.user_id,
            name=db_user.name,
            email=db_user.email,
            avatarUrl=db_user.avatar_url,
            createdAt=db_user.created_at.isoformat() if db_user.created_at else None,
            updatedAt=db_user.updated_at.isoformat() if db_user.updated_at else None,
            preferences=db_user.preferences,
        )

        return success_response(profile.model_dump())

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        return error_response("Failed to update user profile", 500)


@require_auth
def upload_avatar(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    POST /user/avatar
    Upload user avatar

    EXACT match for UserApiService.uploadAvatar() in src/lib/api/userApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]

        # TODO: Implement file upload to S3
        # For now, return placeholder response

        avatar_url = f"https://avatars.example.com/{user_id}.jpg"

        # Update user profile with new avatar URL
        db_user = UserRepository.get_user(user_id)
        if db_user:
            db_user.avatar_url = avatar_url
            from datetime import datetime

            db_user.updated_at = datetime.utcnow()
            UserRepository.update_user(db_user)

        return success_response({"avatarUrl": avatar_url})

    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        return error_response("Failed to upload avatar", 500)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for user API
    Routes requests based on HTTP method and path
    """
    try:
        # Handle CORS preflight
        cors_response = handle_cors_preflight(event)
        if cors_response:
            return cors_response

        method = event.get("httpMethod", "").upper()
        path = event.get("path", "")

        # Route to appropriate handler
        if method == "GET" and path.endswith("/profile"):
            return get_profile(event, context)
        elif method == "PATCH" and path.endswith("/profile"):
            return update_profile(event, context)
        elif method == "POST" and path.endswith("/avatar"):
            return upload_avatar(event, context)
        else:
            return error_response("Not found", 404, "NOT_FOUND")

    except Exception as e:
        logger.error(f"Unhandled error in user handler: {e}")
        return error_response("Internal server error", 500, "INTERNAL_ERROR")
