"""
DynamoDB database operations for K9 API

Clean repository pattern for data access using AWS DynamoDB
Handles all database operations for Users, Reports, and Embeddings
"""

import json
import logging
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

from .models import (
    User,
    UserProfile,
    DBUser,
    Product,
    ProductIndex,
    Report,
    DBReport,
    DBProductEmbedding,
    SearchFilters,
)
from .utils import current_timestamp, AWSConfig


logger = logging.getLogger()


class DatabaseManager:
    """Manages DynamoDB connections and configuration"""

    _dynamodb = None
    _users_table = None
    _reports_table = None
    _embeddings_table = None

    @classmethod
    def get_dynamodb_resource(cls):
        """Get or create DynamoDB resource"""
        if cls._dynamodb is None:
            cls._dynamodb = boto3.resource("dynamodb")
        return cls._dynamodb

    @classmethod
    def get_users_table(cls):
        """Get Users table reference"""
        if cls._users_table is None:
            table_name = os.environ.get("DYNAMODB_USERS_TABLE", "k9-users-dev")
            cls._users_table = cls.get_dynamodb_resource().Table(table_name)
        return cls._users_table

    @classmethod
    def get_reports_table(cls):
        """Get Reports table reference"""
        if cls._reports_table is None:
            table_name = os.environ.get("DYNAMODB_REPORTS_TABLE", "k9-reports-dev")
            cls._reports_table = cls.get_dynamodb_resource().Table(table_name)
        return cls._reports_table

    @classmethod
    def get_embeddings_table(cls):
        """Get Embeddings table reference"""
        if cls._embeddings_table is None:
            table_name = os.environ.get(
                "DYNAMODB_EMBEDDINGS_TABLE", "k9-embeddings-dev"
            )
            cls._embeddings_table = cls.get_dynamodb_resource().Table(table_name)
        return cls._embeddings_table

    @classmethod
    def convert_decimals(cls, obj):
        """Convert DynamoDB Decimal objects to regular numbers"""
        if isinstance(obj, list):
            return [cls.convert_decimals(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: cls.convert_decimals(value) for key, value in obj.items()}
        elif isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return obj

    @classmethod
    def prepare_for_dynamodb(cls, obj):
        """Prepare data for DynamoDB by converting floats to Decimals"""
        if isinstance(obj, list):
            return [cls.prepare_for_dynamodb(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: cls.prepare_for_dynamodb(value) for key, value in obj.items()}
        elif isinstance(obj, float):
            return Decimal(str(obj))
        return obj


class UserRepository:
    """Repository for user operations using DynamoDB"""

    @staticmethod
    def create_user(user: DBUser) -> bool:
        """Create a new user"""
        try:
            table = DatabaseManager.get_users_table()

            # Prepare user data for DynamoDB
            user_data = {
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "preferences": user.preferences or {},
                "created_at": user.created_at,
                "updated_at": user.updated_at,
            }

            # Remove None values
            user_data = {k: v for k, v in user_data.items() if v is not None}

            # Put item in DynamoDB
            table.put_item(Item=user_data)

            logger.info(f"Created user: {user.user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return False

    @staticmethod
    def get_user(user_id: str) -> Optional[DBUser]:
        """Get user by ID"""
        try:
            table = DatabaseManager.get_users_table()

            response = table.get_item(Key={"user_id": user_id})

            if "Item" not in response:
                return None

            item = DatabaseManager.convert_decimals(response["Item"])

            return DBUser(
                user_id=item["user_id"],
                name=item["name"],
                email=item.get("email"),
                avatar_url=item.get("avatar_url"),
                preferences=item.get("preferences", {}),
                created_at=item["created_at"],
                updated_at=item["updated_at"],
            )

        except Exception as e:
            logger.error(f"Failed to get user {user_id}: {e}")
            return None

    @staticmethod
    def update_user(user: DBUser) -> bool:
        """Update an existing user"""
        try:
            table = DatabaseManager.get_users_table()

            # Build update expression
            update_expression = "SET #name = :name, updated_at = :updated_at"
            expression_attribute_names = {"#name": "name"}
            expression_attribute_values = {
                ":name": user.name,
                ":updated_at": user.updated_at,
            }

            # Add optional fields if present
            if user.email is not None:
                update_expression += ", email = :email"
                expression_attribute_values[":email"] = user.email

            if user.avatar_url is not None:
                update_expression += ", avatar_url = :avatar_url"
                expression_attribute_values[":avatar_url"] = user.avatar_url

            if user.preferences is not None:
                update_expression += ", preferences = :preferences"
                expression_attribute_values[":preferences"] = user.preferences

            # Update item
            table.update_item(
                Key={"user_id": user.user_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
            )

            logger.info(f"Updated user: {user.user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            return False


class ReportRepository:
    """Repository for report operations using DynamoDB"""

    @staticmethod
    def create_report(report: DBReport) -> bool:
        """Create a new report"""
        try:
            table = DatabaseManager.get_reports_table()

            # Prepare report data for DynamoDB
            report_data = {
                "id": report.id,
                "title": report.title,
                "author": report.author,
                "date": report.date,
                "user_id": report.user_id,
                "reference": report.reference,
                "favorites": report.favorites or [],
                "created_at": report.created_at,
                "updated_at": report.updated_at,
            }

            # Convert any floats to Decimals for DynamoDB
            report_data = DatabaseManager.prepare_for_dynamodb(report_data)

            # Put item in DynamoDB
            table.put_item(Item=report_data)

            logger.info(f"Created report: {report.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to create report: {e}")
            return False

    @staticmethod
    def get_report(report_id: str, user_id: str) -> Optional[DBReport]:
        """Get report by ID and user ID"""
        try:
            table = DatabaseManager.get_reports_table()

            response = table.get_item(Key={"id": report_id})

            if "Item" not in response:
                return None

            item = DatabaseManager.convert_decimals(response["Item"])

            # Check if the report belongs to the user
            if item["user_id"] != user_id:
                return None

            return DBReport(
                id=item["id"],
                title=item["title"],
                author=item["author"],
                date=item["date"],
                user_id=item["user_id"],
                reference=item["reference"],
                favorites=item.get("favorites", []),
                created_at=item["created_at"],
                updated_at=item["updated_at"],
            )

        except Exception as e:
            logger.error(f"Failed to get report {report_id}: {e}")
            return None

    @staticmethod
    def list_reports(
        user_id: str, limit: int = 20, last_key: Optional[str] = None
    ) -> tuple[List[DBReport], Optional[str]]:
        """List reports for a user with pagination"""
        try:
            table = DatabaseManager.get_reports_table()

            # Query using GSI for user reports
            query_params = {
                "IndexName": "UserReportsIndex",
                "KeyConditionExpression": Key("user_id").eq(user_id),
                "ScanIndexForward": False,  # Sort by created_at descending
                "Limit": limit,
            }

            if last_key:
                query_params["ExclusiveStartKey"] = {
                    "user_id": user_id,
                    "created_at": last_key,
                }

            response = table.query(**query_params)

            reports = []
            for item in response.get("Items", []):
                item = DatabaseManager.convert_decimals(item)
                reports.append(
                    DBReport(
                        id=item["id"],
                        title=item["title"],
                        author=item["author"],
                        date=item["date"],
                        user_id=item["user_id"],
                        reference=item["reference"],
                        favorites=item.get("favorites", []),
                        created_at=item["created_at"],
                        updated_at=item["updated_at"],
                    )
                )

            # Get next page key
            next_key = None
            if "LastEvaluatedKey" in response:
                next_key = response["LastEvaluatedKey"]["created_at"]

            return reports, next_key

        except Exception as e:
            logger.error(f"Failed to list reports for user {user_id}: {e}")
            return [], None

    @staticmethod
    def count_reports(user_id: str) -> int:
        """Count total reports for a user"""
        try:
            table = DatabaseManager.get_reports_table()

            response = table.query(
                IndexName="UserReportsIndex",
                KeyConditionExpression=Key("user_id").eq(user_id),
                Select="COUNT",
            )

            return response["Count"]

        except Exception as e:
            logger.error(f"Failed to count reports for user {user_id}: {e}")
            return 0

    @staticmethod
    def update_report(report: DBReport) -> bool:
        """Update an existing report"""
        try:
            table = DatabaseManager.get_reports_table()

            # Prepare data for DynamoDB
            reference = DatabaseManager.prepare_for_dynamodb(report.reference)
            favorites = DatabaseManager.prepare_for_dynamodb(report.favorites or [])

            # Update item
            table.update_item(
                Key={"id": report.id},
                UpdateExpression="SET title = :title, reference = :reference, favorites = :favorites, updated_at = :updated_at",
                ExpressionAttributeValues={
                    ":title": report.title,
                    ":reference": reference,
                    ":favorites": favorites,
                    ":updated_at": report.updated_at,
                },
                ConditionExpression=Attr("user_id").eq(report.user_id),
            )

            logger.info(f"Updated report: {report.id}")
            return True

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning(
                    f"User {report.user_id} not authorized to update report {report.id}"
                )
                return False
            logger.error(f"Failed to update report: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to update report: {e}")
            return False

    @staticmethod
    def update_report_favorites(
        report_id: str, user_id: str, favorites: List[str]
    ) -> bool:
        """Update just the favorites for a report"""
        try:
            table = DatabaseManager.get_reports_table()

            # Prepare favorites for DynamoDB
            favorites_data = DatabaseManager.prepare_for_dynamodb(favorites)

            table.update_item(
                Key={"id": report_id},
                UpdateExpression="SET favorites = :favorites, updated_at = :updated_at",
                ExpressionAttributeValues={
                    ":favorites": favorites_data,
                    ":updated_at": current_timestamp(),
                },
                ConditionExpression=Attr("user_id").eq(user_id),
            )

            logger.info(f"Updated favorites for report: {report_id}")
            return True

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning(
                    f"User {user_id} not authorized to update report {report_id}"
                )
                return False
            logger.error(f"Failed to update report favorites: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to update report favorites: {e}")
            return False

    @staticmethod
    def delete_report(report_id: str, user_id: str) -> bool:
        """Delete a report"""
        try:
            table = DatabaseManager.get_reports_table()

            table.delete_item(
                Key={"id": report_id}, ConditionExpression=Attr("user_id").eq(user_id)
            )

            logger.info(f"Deleted report: {report_id}")
            return True

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning(
                    f"User {user_id} not authorized to delete report {report_id}"
                )
                return False
            logger.error(f"Failed to delete report: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to delete report: {e}")
            return False


class EmbeddingRepository:
    """Repository for embedding operations using DynamoDB"""

    @staticmethod
    def store_embedding(embedding: DBProductEmbedding) -> bool:
        """Store a product embedding"""
        try:
            table = DatabaseManager.get_embeddings_table()

            # Prepare embedding data for DynamoDB
            embedding_data = {
                "product_id": embedding.product_id,
                "embedding_vector": DatabaseManager.prepare_for_dynamodb(
                    embedding.embedding_vector
                ),
                "model_version": embedding.model_version,
                "vector_dimension": embedding.vector_dimension,
                "created_at": embedding.created_at,
            }

            # Put item in DynamoDB
            table.put_item(Item=embedding_data)

            logger.info(f"Stored embedding for product: {embedding.product_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to store embedding: {e}")
            return False

    @staticmethod
    def get_embedding(product_id: str) -> Optional[DBProductEmbedding]:
        """Get embedding for a product"""
        try:
            table = DatabaseManager.get_embeddings_table()

            response = table.get_item(Key={"product_id": product_id})

            if "Item" not in response:
                return None

            item = DatabaseManager.convert_decimals(response["Item"])

            return DBProductEmbedding(
                product_id=item["product_id"],
                embedding_vector=item["embedding_vector"],
                model_version=item["model_version"],
                vector_dimension=item["vector_dimension"],
                created_at=item["created_at"],
            )

        except Exception as e:
            logger.error(f"Failed to get embedding for product {product_id}: {e}")
            return None

    @staticmethod
    def get_embeddings_by_model(
        model_version: str, limit: int = 100
    ) -> List[DBProductEmbedding]:
        """Get embeddings by model version"""
        try:
            table = DatabaseManager.get_embeddings_table()

            response = table.query(
                IndexName="ModelVersionIndex",
                KeyConditionExpression=Key("model_version").eq(model_version),
                Limit=limit,
            )

            embeddings = []
            for item in response.get("Items", []):
                item = DatabaseManager.convert_decimals(item)
                embeddings.append(
                    DBProductEmbedding(
                        product_id=item["product_id"],
                        embedding_vector=item["embedding_vector"],
                        model_version=item["model_version"],
                        vector_dimension=item["vector_dimension"],
                        created_at=item["created_at"],
                    )
                )

            return embeddings

        except Exception as e:
            logger.error(f"Failed to get embeddings for model {model_version}: {e}")
            return []
