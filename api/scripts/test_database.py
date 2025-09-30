#!/usr/bin/env python3
"""
Test script for database S3 operations

This script helps test downloading and uploading the DuckDB database to/from S3.
"""

import os
import argparse

from src.shared.utils import download_database_from_s3, upload_database_to_s3, AWSConfig
from src.shared.database import DatabaseManager


def test_download(local_path: str = "/tmp/k9_api_test.db"):
    """Test downloading database from S3"""
    print(f"🔽 Testing database download to {local_path}")

    # Remove existing file if it exists
    if os.path.exists(local_path):
        os.remove(local_path)
        print(f"  Removed existing file: {local_path}")

    # Test download
    success = download_database_from_s3(local_path)

    if success:
        print(f"  ✅ Successfully downloaded database")
        file_size = os.path.getsize(local_path)
        print(f"  📊 File size: {file_size:,} bytes")
    else:
        print(f"  ❌ Failed to download database")

    return success


def test_upload(local_path: str = "/tmp/k9_api_test.db"):
    """Test uploading database to S3"""
    print(f"🔼 Testing database upload from {local_path}")

    if not os.path.exists(local_path):
        print(f"  ❌ Local database file not found: {local_path}")
        return False

    file_size = os.path.getsize(local_path)
    print(f"  📊 Local file size: {file_size:,} bytes")

    # Test upload
    success = upload_database_to_s3(local_path)

    if success:
        print(f"  ✅ Successfully uploaded database")
    else:
        print(f"  ❌ Failed to upload database")

    return success


def test_database_manager():
    """Test the DatabaseManager with S3 integration"""
    print("🔧 Testing DatabaseManager with S3 integration")

    # Close any existing connections
    DatabaseManager.close_connection()

    try:
        # Get connection (should trigger S3 download if available)
        conn = DatabaseManager.get_connection()
        print("  ✅ DatabaseManager connection established")

        # Test a simple query
        result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = [row[0] for row in result]
        print(f"  📋 Found tables: {table_names}")

        # Test persistence to S3
        print("  🔄 Testing persistence to S3...")
        success = DatabaseManager.persist_to_s3()
        if success:
            print("  ✅ Successfully persisted to S3")
        else:
            print("  ❌ Failed to persist to S3")

        return True

    except Exception as e:
        print(f"  ❌ DatabaseManager test failed: {e}")
        return False


def show_config():
    """Show current S3 configuration"""
    print("📋 Current S3 Configuration:")
    print(f"  Bucket: {AWSConfig.get_database_s3_bucket()}")
    print(f"  Key: {AWSConfig.get_database_s3_key()}")
    print(f"  Environment: {AWSConfig.get_environment()}")


def main():
    parser = argparse.ArgumentParser(description="Test K9 API database S3 operations")
    parser.add_argument(
        "--download", action="store_true", help="Test database download"
    )
    parser.add_argument("--upload", action="store_true", help="Test database upload")
    parser.add_argument("--manager", action="store_true", help="Test DatabaseManager")
    parser.add_argument("--config", action="store_true", help="Show S3 configuration")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument(
        "--file", default="/tmp/k9_api_test.db", help="Local database file path"
    )

    args = parser.parse_args()

    print("🚀 K9 API Database S3 Test Script")
    print("=" * 50)

    if args.config or args.all:
        show_config()
        print()

    if args.download or args.all:
        test_download(args.file)
        print()

    if args.upload or args.all:
        test_upload(args.file)
        print()

    if args.manager or args.all:
        test_database_manager()
        print()

    if not any([args.download, args.upload, args.manager, args.config, args.all]):
        parser.print_help()


if __name__ == "__main__":
    main()
