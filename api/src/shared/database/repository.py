from typing import List

from src.shared.models import database as db
from .base import BaseRepository, DatabaseManager


class Image(BaseRepository[db.Image]):
    """Repository for image operations using DynamoDB"""

    name = "Image"
    schema = db.Image
    get_table = DatabaseManager.get_images_table
    modifiable = ["mask", "grid"]
    partition_key = "product"  # Images are grouped by their product


class Product(BaseRepository[db.Product]):
    """Repository for product operations using DynamoDB"""

    name = "Product"
    schema = db.Product
    get_table = DatabaseManager.get_products_table
    modifiable = [
        "brand",
        "series",
        "model",
        "images",
        "category",
        "formats",
        "analysis",
    ]
    partition_key = None


class Report(BaseRepository[db.Report]):
    """Repository for report operations using DynamoDB"""

    name = "Report"
    schema = db.Report
    get_table = DatabaseManager.get_reports_table
    modifiable = ["title", "reference", "favorites"]
    partition_key = "author"  # Reports are grouped by their author

    @classmethod
    def update_favorites(cls, id: str, partition: str, favorites: List[str]) -> bool:
        """Update only the favorites field of a report"""
        report = cls.schema(id=id, author=partition, favorites=favorites)
        return cls.update(report)


class User(BaseRepository[db.User]):
    """Repository for user operations using DynamoDB"""

    name = "User"
    schema = db.User
    get_table = DatabaseManager.get_users_table
    modifiable = ["name", "email", "avatar", "preferences"]
    partition_key = None
