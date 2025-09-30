"""
Shared utilities for K9 API Lambda functions
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
import boto3
from botocore.exceptions import ClientError


# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
s3_client = boto3.client("s3")
lambda_client = boto3.client("lambda")


def generate_id() -> str:
    """Generate a unique ID for entities"""
    return str(uuid.uuid4())


def current_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.utcnow().isoformat() + "Z"


def lambda_response(
    status_code: int, body: Any, headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Create a standardized Lambda response"""
    default_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    }

    if headers:
        default_headers.update(headers)

    return {
        "statusCode": status_code,
        "headers": default_headers,
        "body": json.dumps(body, default=str) if not isinstance(body, str) else body,
    }


def success_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    """Create a successful response"""
    return lambda_response(
        status_code,
        {"status": status_code, "body": data, "timestamp": current_timestamp()},
    )


def error_response(
    error: str, status_code: int = 500, error_code: Optional[str] = None
) -> Dict[str, Any]:
    """Create an error response"""
    response_body = {
        "status": status_code,
        "error": error,
        "timestamp": current_timestamp(),
    }

    if error_code:
        response_body["error_code"] = error_code

    return lambda_response(status_code, response_body)


def parse_json_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse JSON body from Lambda event"""
    try:
        body = event.get("body", "{}")
        if isinstance(body, str):
            return json.loads(body)
        return body
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in request body: {e}")


def get_path_parameter(event: Dict[str, Any], param_name: str) -> str:
    """Extract path parameter from Lambda event"""
    path_params = event.get("pathParameters") or {}
    value = path_params.get(param_name)

    if not value:
        raise ValueError(f"Missing required path parameter: {param_name}")

    return value


def get_query_parameter(
    event: Dict[str, Any], param_name: str, default: Optional[str] = None
) -> Optional[str]:
    """Extract query parameter from Lambda event"""
    query_params = event.get("queryStringParameters") or {}
    return query_params.get(param_name, default)


def get_user_from_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Extract user information from authenticated Lambda event"""
    # After API Gateway Cognito authorization, user info is available in requestContext
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})

    if "claims" in authorizer:
        claims = authorizer["claims"]
        return {
            "user_id": claims.get("sub"),
            "username": claims.get("cognito:username"),
            "email": claims.get("email"),
            "name": claims.get("name"),
        }

    raise ValueError("User information not found in request context")


def handle_cors_preflight(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Handle CORS preflight requests"""
    if event.get("httpMethod") == "OPTIONS":
        return lambda_response(
            200,
            "",
            {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
                "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                "Access-Control-Max-Age": "86400",
            },
        )
    return None


def invoke_lambda_async(function_name: str, payload: Dict[str, Any]) -> None:
    """Invoke a Lambda function asynchronously"""
    try:
        lambda_client.invoke(
            FunctionName=function_name,
            InvocationType="Event",  # Async invocation
            Payload=json.dumps(payload),
        )
        logger.info(f"Successfully invoked {function_name} asynchronously")
    except ClientError as e:
        logger.error(f"Failed to invoke {function_name}: {e}")
        raise


def upload_to_s3(
    bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"
) -> str:
    """Upload data to S3 and return the key"""
    try:
        s3_client.put_object(
            Bucket=bucket, Key=key, Body=data, ContentType=content_type
        )
        logger.info(f"Successfully uploaded to s3://{bucket}/{key}")
        return key
    except ClientError as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise


def download_from_s3(bucket: str, key: str) -> bytes:
    """Download data from S3"""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            raise FileNotFoundError(f"Object not found: s3://{bucket}/{key}")
        logger.error(f"Failed to download from S3: {e}")
        raise


def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """Validate that required fields are present in data"""
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)

    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")


class AWSConfig:
    """AWS configuration constants"""

    @staticmethod
    def get_similarity_bucket() -> str:
        """Get the S3 bucket for similarity matrices"""
        import os

        return os.environ.get("SIMILARITY_BUCKET", "k9-similarity-matrices")

    @staticmethod
    def get_embeddings_function_name() -> str:
        """Get the embeddings Lambda function name"""
        import os

        return os.environ.get("EMBEDDINGS_FUNCTION_NAME", "k9-embeddings-dev")

    @staticmethod
    def get_environment() -> str:
        """Get the current environment"""
        import os

        return os.environ.get("ENVIRONMENT", "dev")
