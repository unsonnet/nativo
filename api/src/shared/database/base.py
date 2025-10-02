from decimal import Decimal
import logging
import os
from typing import Any, Callable, Dict, Generic, List, Optional, Tuple, Type, TypeVar

import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from types_boto3_dynamodb.service_resource import Table

from src.shared.models.base import BaseEntity
from src.shared.utils import current_timestamp

logger = logging.getLogger()
T = TypeVar("T", bound="BaseEntity")


class DatabaseManager:
    """Manages DynamoDB connections and configuration"""

    _dynamodb = None
    _users_table = None
    _reports_table = None
    _products_table = None
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
    def get_products_table(cls):
        """Get Products table reference"""
        if cls._products_table is None:
            table_name = os.environ.get("DYNAMODB_PRODUCTS_TABLE", "k9-products-dev")
            cls._products_table = cls.get_dynamodb_resource().Table(table_name)
        return cls._products_table

    @classmethod
    def get_images_table(cls):
        """Get Images table reference"""
        if cls._images_table is None:
            table_name = os.environ.get("DYNAMODB_IMAGES_TABLE", "k9-images-dev")
            cls._images_table = cls.get_dynamodb_resource().Table(table_name)
        return cls._images_table

    @classmethod
    def from_decimals(cls, obj):
        """Convert DynamoDB Decimal objects to regular numbers"""
        if isinstance(obj, list):
            return [cls.from_decimals(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: cls.from_decimals(value) for key, value in obj.items()}
        elif isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return obj

    @classmethod
    def to_decimals(cls, obj):
        """Prepare data for DynamoDB by converting floats to Decimals"""
        if isinstance(obj, list):
            return [cls.to_decimals(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: cls.to_decimals(value) for key, value in obj.items()}
        elif isinstance(obj, (int, float)):
            return Decimal(str(obj))
        return obj


class BaseRepository(Generic[T]):
    """Generic repository for DynamoDB-backed entities."""

    name: str
    schema: Type[T]
    get_table: Callable[..., Table]
    modifiable: List[str] = []
    partition_key: Optional[str] = None  # DynamoDB partition key for queries / access

    # ================
    # CRUD methods
    # ================

    @classmethod
    def create(cls, entity: T, partition: Optional[str] = None) -> bool:
        try:
            entry = DatabaseManager.to_decimals(entity.model_dump(exclude_none=True))
            if cls.partition_key and partition:
                entry[cls.partition_key] = partition
            cls.get_table().put_item(Item=entry)
            logger.info(f"Created {cls.name} {entity.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to create {cls.name} {entity.id}: {e}")

        return False

    @classmethod
    def read(cls, id: str, partition: Optional[str] = None) -> Optional[T]:
        try:
            response = cls.get_table().get_item(Key={"id": id})
            item = response["Item"]  # type: ignore
            if cls.partition_key and item.get(cls.partition_key) != partition:
                raise ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException"}},
                    "GetItem",
                )
            return cls.schema(**DatabaseManager.from_decimals(item))

        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code == "ConditionalCheckFailedException":
                logger.error(f"Access denied for {cls.name} {id}")
            else:
                logger.error(f"Failed to get {cls.name} {id}: {e}")
        except Exception as e:
            logger.error(f"Failed to get {cls.name} {id}: {e}")

        return None

    @classmethod
    def update(cls, entity: T, partition: Optional[str] = None) -> bool:
        try:
            data = entity.model_dump(exclude_none=True).items()
            data = {k: v for k, v in data if k in cls.modifiable}
            if not data:
                logger.warning(f"Left {cls.name} {entity.id} unchanged")
                return False

            update_expression = "SET updated_at = :updated_at"
            update_expression += "".join(f", #{k} = :{k}" for k in data)
            expression_attribute_names = {f"#{k}": k for k in data}
            expression_attribute_values = {f":{k}": v for k, v in data.items()}
            expression_attribute_values[":updated_at"] = current_timestamp()

            params: Dict[str, Any] = dict(
                Key={"id": entity.id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
            )
            if cls.partition_key:
                params["ConditionExpression"] = Attr(cls.partition_key).eq(partition)

            cls.get_table().update_item(**params)
            logger.info(f"Updated {cls.name} {entity.id}")
            return True

        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code == "ConditionalCheckFailedException":
                logger.error(f"Access denied for {cls.name} {entity.id}")
            else:
                logger.error(f"Failed to update {cls.name} {entity.id}: {e}")
        except Exception as e:
            logger.error(f"Failed to update {cls.name} {entity.id}: {e}")

        return False

    @classmethod
    def delete(cls, id: str, partition: Optional[str] = None) -> bool:
        try:
            params: Dict[str, Any] = {"Key": {"id": id}}
            if cls.partition_key:
                params["ConditionExpression"] = Attr(cls.partition_key).eq(partition)
            cls.get_table().delete_item(**params)
            logger.info(f"Deleted {cls.name} {id}")
            return True

        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code == "ConditionalCheckFailedException":
                logger.error(f"Access denied for {cls.name} {id}")
            else:
                logger.error(f"Failed to delete {cls.name} {id}: {e}")
        except Exception as e:
            logger.error(f"Failed to delete {cls.name} {id}: {e}")

        return False

    # ================
    # Bulk CRUD methods
    # ================

    @classmethod
    def create_batch(cls, entities: List[T], partition: Optional[str] = None) -> bool:
        """Batch create entities for a partition key"""
        try:
            with cls.get_table().batch_writer() as batch:
                for entity in entities:
                    entry = DatabaseManager.to_decimals(
                        entity.model_dump(exclude_none=True)
                    )
                    if cls.partition_key and partition:
                        entry[cls.partition_key] = partition
                    batch.put_item(Item=entry)
            logger.info(f"Batch created {len(entities)} {cls.name}s")
            return True

        except Exception as e:
            logger.error(f"Failed to batch create {cls.name}s: {e}")

        return False

    @classmethod
    def delete_batch(cls, entities: List[T], partition: Optional[str] = None) -> bool:
        """Batch delete entities for a partition key"""
        try:
            with cls.get_table().batch_writer() as batch:
                for entity in entities:
                    key: Dict[str, Any] = {"id": entity.id}
                    if cls.partition_key:
                        key[cls.partition_key] = partition
                    batch.delete_item(Key=key)
            logger.info(f"Batch deleted {len(entities)} {cls.name}s")
            return True

        except Exception as e:
            logger.error(f"Failed to batch delete {cls.name}s: {e}")

        return False

    # ================
    # Helper methods
    # ================

    @classmethod
    def list(
        cls,
        partition: str,
        limit: int = 20,
        last_key: Optional[str] = None,
    ) -> Tuple[List[T], Optional[str]]:
        """List entities for a partition key with pagination"""
        if not cls.partition_key:
            raise NotImplementedError(f"list() not supported for {cls.name}") from None

        try:
            params: Dict[str, Any] = {
                "IndexName": f"{cls.name}By{cls.partition_key.capitalize()}Index",
                "KeyConditionExpression": Key(cls.partition_key).eq(partition),
                "ScanIndexForward": False,  # newest first
                "Limit": limit,
            }
            if last_key:
                params["ExclusiveStartKey"] = {"id": last_key}  # TODO: is this correct?
            response = cls.get_table().query(**params)
            entities = [
                cls.schema(**DatabaseManager.from_decimals(item))
                for item in response["Items"]
            ]
            next_key = str(
                response.get("LastEvaluatedKey", {}).get("id")
            )  # TODO: is this correct?
            return entities, next_key

        except Exception as e:
            logger.error(
                f"Failed to list {cls.name}s for {cls.partition_key} {partition}: {e}"
            )

        raise ValueError(f"Failed to list {cls.name}s") from None

    @classmethod
    def count(cls, partition: str) -> int:
        """Count total entities for a partition key"""
        if not cls.partition_key:
            raise NotImplementedError(f"count() not supported for {cls.name}") from None

        try:
            response = cls.get_table().query(
                IndexName=f"{cls.name}By{cls.partition_key.capitalize()}Index",
                KeyConditionExpression=Key(cls.partition_key).eq(partition),
                Select="COUNT",
            )
            return int(response.get("Count", 0))

        except Exception as e:
            logger.error(
                f"Failed to count {cls.name}s for {cls.partition_key} {partition}: {e}"
            )

        raise ValueError(f"Failed to count {cls.name}s") from None
