"""
DuckDB database operations for K9 API

Clean repository pattern for data access
Handles all database operations for Users, Reports, Products, and Embeddings
"""

import json
import logging
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
import duckdb
from pathlib import Path

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
from .utils import current_timestamp, download_database_from_s3


logger = logging.getLogger()


class DatabaseManager:
    """Manages DuckDB connections and schema"""

    _connection = None
    _db_path = "/tmp/k9_api.db"  # Lambda tmp directory
    _initialized = False

    @classmethod
    def get_connection(cls) -> duckdb.DuckDBPyConnection:
        """Get or create database connection"""
        if cls._connection is None:
            cls._initialize_database()
            cls._connection = duckdb.connect(cls._db_path)
            cls._ensure_schema()
        return cls._connection

    @classmethod
    def _initialize_database(cls):
        """Initialize database by downloading from S3 if available"""
        if cls._initialized:
            return

        # Check if database already exists locally (for development)
        if os.path.exists(cls._db_path):
            logger.info(f"Using existing local database: {cls._db_path}")
            cls._initialized = True
            return

        # Try to download from S3
        logger.info("Attempting to download database from S3...")
        download_success = download_database_from_s3(cls._db_path)

        if not download_success:
            logger.info("No existing database found in S3, will create new database")

        cls._initialized = True

    @classmethod
    def _ensure_schema(cls):
        """Create database tables if they don't exist"""
        conn = cls._connection

        # Users table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                email VARCHAR,
                avatar_url VARCHAR,
                preferences JSON,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        """
        )

        # Reports table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id VARCHAR PRIMARY KEY,
                title VARCHAR NOT NULL,
                author VARCHAR NOT NULL,
                date VARCHAR NOT NULL,
                user_id VARCHAR NOT NULL,
                reference JSON NOT NULL,
                favorites JSON,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        """
        )

        # Product embeddings table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS product_embeddings (
                product_id VARCHAR PRIMARY KEY,
                embedding_vector JSON NOT NULL,
                model_version VARCHAR NOT NULL,
                vector_dimension INTEGER NOT NULL,
                created_at TIMESTAMP
            )
        """
        )

        # Create indexes for performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)"
        )

        logger.info("Database schema initialized")

    @classmethod
    def persist_to_s3(cls) -> bool:
        """
        Persist the current database state to S3

        Returns:
            True if successful, False otherwise
        """
        from .utils import upload_database_to_s3

        try:
            # Ensure connection is closed before uploading
            if cls._connection:
                cls._connection.close()
                cls._connection = None

            # Upload to S3
            success = upload_database_to_s3(cls._db_path)

            # Reconnect after upload
            cls._connection = duckdb.connect(cls._db_path)

            return success

        except Exception as e:
            logger.error(f"Failed to persist database to S3: {e}")
            return False

    @classmethod
    def close_connection(cls):
        """Close the database connection"""
        if cls._connection:
            cls._connection.close()
            cls._connection = None
            cls._initialized = False


class UserRepository:
    """Repository for user operations"""

    @staticmethod
    def create_user(user: DBUser) -> bool:
        """Create a new user"""
        try:
            conn = DatabaseManager.get_connection()
            conn.execute(
                """
                INSERT INTO users (user_id, name, email, avatar_url, preferences, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                [
                    user.user_id,
                    user.name,
                    user.email,
                    user.avatar_url,
                    json.dumps(user.preferences),
                    user.created_at,
                    user.updated_at,
                ],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return False

    @staticmethod
    def get_user(user_id: str) -> Optional[DBUser]:
        """Get user by ID"""
        try:
            conn = DatabaseManager.get_connection()
            result = conn.execute(
                "SELECT * FROM users WHERE user_id = ?", [user_id]
            ).fetchone()

            if result:
                return DBUser(
                    user_id=result[0],
                    name=result[1],
                    email=result[2],
                    avatar_url=result[3],
                    preferences=json.loads(result[4]) if result[4] else {},
                    created_at=result[5],
                    updated_at=result[6],
                )
            return None
        except Exception as e:
            logger.error(f"Failed to get user: {e}")
            return None

    @staticmethod
    def update_user(user: DBUser) -> bool:
        """Update an existing user"""
        try:
            conn = DatabaseManager.get_connection()
            conn.execute(
                """
                UPDATE users 
                SET name = ?, email = ?, avatar_url = ?, preferences = ?, updated_at = ?
                WHERE user_id = ?
            """,
                [
                    user.name,
                    user.email,
                    user.avatar_url,
                    json.dumps(user.preferences),
                    user.updated_at,
                    user.user_id,
                ],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            return False


class ReportRepository:
    """Repository for report operations"""

    @staticmethod
    def create_report(report: DBReport) -> bool:
        """Create a new report"""
        try:
            conn = DatabaseManager.get_connection()
            conn.execute(
                """
                INSERT INTO reports (id, title, author, date, user_id, reference, favorites, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                [
                    report.id,
                    report.title,
                    report.author,
                    report.date,
                    report.user_id,
                    json.dumps(report.reference),
                    json.dumps(report.favorites),
                    report.created_at,
                    report.updated_at,
                ],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to create report: {e}")
            return False

    @staticmethod
    def get_report(report_id: str, user_id: str) -> Optional[DBReport]:
        """Get report by ID and user ID"""
        try:
            conn = DatabaseManager.get_connection()
            result = conn.execute(
                "SELECT * FROM reports WHERE id = ? AND user_id = ?",
                [report_id, user_id],
            ).fetchone()

            if result:
                return DBReport(
                    id=result[0],
                    title=result[1],
                    author=result[2],
                    date=result[3],
                    user_id=result[4],
                    reference=json.loads(result[5]),
                    favorites=json.loads(result[6]) if result[6] else [],
                    created_at=result[7],
                    updated_at=result[8],
                )
            return None
        except Exception as e:
            logger.error(f"Failed to get report: {e}")
            return None

    @staticmethod
    def list_reports(user_id: str, limit: int = 20, offset: int = 0) -> List[DBReport]:
        """List reports for a user with pagination"""
        try:
            conn = DatabaseManager.get_connection()
            results = conn.execute(
                """
                SELECT * FROM reports 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            """,
                [user_id, limit, offset],
            ).fetchall()

            reports = []
            for result in results:
                reports.append(
                    DBReport(
                        id=result[0],
                        title=result[1],
                        author=result[2],
                        date=result[3],
                        user_id=result[4],
                        reference=json.loads(result[5]),
                        favorites=json.loads(result[6]) if result[6] else [],
                        created_at=result[7],
                        updated_at=result[8],
                    )
                )

            return reports
        except Exception as e:
            logger.error(f"Failed to list reports: {e}")
            return []

    @staticmethod
    def count_reports(user_id: str) -> int:
        """Count total reports for a user"""
        try:
            conn = DatabaseManager.get_connection()
            result = conn.execute(
                "SELECT COUNT(*) FROM reports WHERE user_id = ?", [user_id]
            ).fetchone()
            return result[0] if result else 0
        except Exception as e:
            logger.error(f"Failed to count reports: {e}")
            return 0

    @staticmethod
    def update_report(report: DBReport) -> bool:
        """Update an existing report"""
        try:
            conn = DatabaseManager.get_connection()
            conn.execute(
                """
                UPDATE reports 
                SET title = ?, reference = ?, favorites = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
            """,
                [
                    report.title,
                    json.dumps(report.reference),
                    json.dumps(report.favorites),
                    report.updated_at,
                    report.id,
                    report.user_id,
                ],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update report: {e}")
            return False

    @staticmethod
    def update_report_favorites(
        report_id: str, user_id: str, favorites: List[str]
    ) -> bool:
        """Update just the favorites for a report"""
        try:
            conn = DatabaseManager.get_connection()
            timestamp = current_timestamp()
            conn.execute(
                """
                UPDATE reports 
                SET favorites = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
            """,
                [json.dumps(favorites), timestamp, report_id, user_id],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update report favorites: {e}")
            return False

    @staticmethod
    def delete_report(report_id: str, user_id: str) -> bool:
        """Delete a report"""
        try:
            conn = DatabaseManager.get_connection()
            conn.execute(
                "DELETE FROM reports WHERE id = ? AND user_id = ?", [report_id, user_id]
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete report: {e}")
            return False


class EmbeddingRepository:
    """Repository for embedding operations"""

    @staticmethod
    def store_embedding(embedding: DBProductEmbedding) -> bool:
        """Store a product embedding"""
        try:
            conn = DatabaseManager.get_connection()
            conn.execute(
                """
                INSERT OR REPLACE INTO product_embeddings 
                (product_id, embedding_vector, model_version, vector_dimension, created_at)
                VALUES (?, ?, ?, ?, ?)
            """,
                [
                    embedding.product_id,
                    json.dumps(embedding.embedding_vector),
                    embedding.model_version,
                    embedding.vector_dimension,
                    embedding.created_at,
                ],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to store embedding: {e}")
            return False

    @staticmethod
    def get_embedding(product_id: str) -> Optional[DBProductEmbedding]:
        """Get embedding for a product"""
        try:
            conn = DatabaseManager.get_connection()
            result = conn.execute(
                "SELECT * FROM product_embeddings WHERE product_id = ?", [product_id]
            ).fetchone()

            if result:
                return DBProductEmbedding(
                    product_id=result[0],
                    embedding_vector=json.loads(result[1]),
                    model_version=result[2],
                    vector_dimension=result[3],
                    created_at=result[4],
                )
            return None
        except Exception as e:
            logger.error(f"Failed to get embedding: {e}")
            return None

    @staticmethod
    def list_all_embeddings() -> List[DBProductEmbedding]:
        """Get all stored embeddings"""
        try:
            conn = DatabaseManager.get_connection()
            results = conn.execute("SELECT * FROM product_embeddings").fetchall()

            embeddings = []
            for result in results:
                embeddings.append(
                    DBProductEmbedding(
                        product_id=result[0],
                        embedding_vector=json.loads(result[1]),
                        model_version=result[2],
                        vector_dimension=result[3],
                        created_at=result[4],
                    )
                )

            return embeddings
        except Exception as e:
            logger.error(f"Failed to list embeddings: {e}")
            return []


# Mock Product Repository (since products are not stored in DB yet)
class ProductRepository:
    """Mock repository for product operations - products come from your product catalog"""

    @staticmethod
    def search_products(filters: SearchFilters, limit: int = 50) -> List[ProductIndex]:
        """Search products based on filters - MOCK implementation"""
        # TODO: Replace with actual product catalog search
        # This would integrate with your product database/service

        # For now, return empty list - the embedding service will handle similarity search
        logger.info(f"Mock product search with filters: {filters}")
        return []

    @staticmethod
    def get_product(product_id: str) -> Optional[Product]:
        """Get full product details - MOCK implementation"""
        # TODO: Replace with actual product catalog lookup
        logger.info(f"Mock product get: {product_id}")
        return None
