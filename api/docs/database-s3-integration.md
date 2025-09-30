# Database S3 Integration Guide

This guide explains how the K9 API handles DuckDB database storage and retrieval from S3.

## 🗂️ Overview

The K9 API uses DuckDB as a local SQL database that can be persisted to and restored from S3. This allows you to:

1. **Pre-populate** Lambda functions with existing data
2. **Persist changes** made during Lambda execution
3. **Share database state** across multiple Lambda invocations
4. **Backup and restore** your database

## 📁 S3 Storage Structure

Your database is stored in S3 with the following structure:

```
s3://your-bucket-name/
└── databases/
    ├── k9_api_dev.db      # Development database
    ├── k9_api_staging.db  # Staging database
    └── k9_api_prod.db     # Production database
```

## ⚙️ Configuration

### Environment Variables

The system uses these environment variables (automatically set by SAM):

```bash
DATABASE_S3_BUCKET=your-bucket-name          # S3 bucket for storage
DATABASE_S3_KEY=databases/k9_api_dev.db      # S3 key for the database file
ENVIRONMENT=dev                              # Environment (dev/staging/prod)
```

### SAM Template Configuration

In your `infrastructure/template.yaml`, the following parameters are configured:

```yaml
Parameters:
  S3BucketName:
    Type: String
    Description: S3 bucket name for database and file storage

Globals:
  Function:
    Environment:
      Variables:
        DATABASE_S3_BUCKET: !Ref S3BucketName
        DATABASE_S3_KEY: !Sub "databases/k9_api_${Environment}.db"
```

## 🔄 How It Works

### 1. Lambda Cold Start

When a Lambda function starts (cold start):

1. `DatabaseManager.get_connection()` is called
2. System checks if database exists locally at `/tmp/k9_api.db`
3. If not found locally, attempts to download from S3
4. If S3 download fails, creates a new empty database
5. Ensures database schema is up to date

### 2. Database Operations

During Lambda execution:
- All database operations use the local DuckDB file
- Changes are made in memory and written to `/tmp/k9_api.db`
- Data persists for the lifetime of the Lambda container

### 3. Persistence (Optional)

To save changes back to S3:
- Call `DatabaseManager.persist_to_s3()`
- This uploads the current database state to S3
- Future Lambda invocations will use this updated database

## 📋 Usage Examples

### Basic Usage (Automatic Download)

```python
from shared.database import DatabaseManager, UserRepository

# This automatically downloads from S3 if available
conn = DatabaseManager.get_connection()

# Use repositories normally
user = UserRepository.get_user("user123")
```

### Manual Database Operations

```python
from shared.utils import download_database_from_s3, upload_database_to_s3
from shared.database import DatabaseManager

# Manually download database
success = download_database_from_s3("/tmp/my_db.db")
if success:
    print("Database downloaded successfully")

# Manually upload database
success = upload_database_to_s3("/tmp/my_db.db")
if success:
    print("Database uploaded successfully")

# Persist current state to S3
DatabaseManager.persist_to_s3()
```

## 🧪 Testing

Use the provided test script to verify S3 operations:

```bash
# Test all operations
./scripts/test_database.py --all

# Test download only
./scripts/test_database.py --download

# Test upload only  
./scripts/test_database.py --upload

# Test DatabaseManager integration
./scripts/test_database.py --manager

# Show current configuration
./scripts/test_database.py --config
```

## 🚀 Deployment Workflow

### 1. Initial Setup

Upload your existing database to S3:

```bash
# Set environment variables
export DATABASE_S3_BUCKET="your-bucket-name"
export DATABASE_S3_KEY="databases/k9_api_dev.db"

# Test upload (make sure AWS credentials are configured)
python3 scripts/test_database.py --upload --file /path/to/your/existing/db.db
```

### 2. Deploy with Database

```bash
./scripts/deploy.sh \
  --environment dev \
  --user-pool-id us-east-1_XXXXXXXXX \
  --bucket-name your-bucket-name
```

### 3. Verify Database Access

After deployment, check CloudWatch logs to see:
- Database download attempts
- Schema initialization
- Any errors or warnings

## 📊 Performance Considerations

### Database Size
- **Small databases** (< 10MB): Fast download, good for most use cases
- **Medium databases** (10-100MB): Noticeable cold start delay
- **Large databases** (> 100MB): Consider database partitioning or caching strategies

### Cold Start Impact
- First Lambda invocation: Downloads database from S3 (adds ~1-5 seconds)
- Subsequent invocations: Uses cached database (normal performance)
- Lambda container reuse: Database stays in memory between invocations

### Optimization Tips
1. **Keep database compact**: Regular cleanup and optimization
2. **Partition by environment**: Separate dev/staging/prod databases
3. **Monitor size**: Set up CloudWatch alerts for database size
4. **Consider persistence frequency**: Don't persist on every change

## 🔧 Troubleshooting

### Common Issues

**Database not found in S3:**
```
WARNING: Database not found in S3: s3://bucket/key
INFO: Will create new database locally
```
- This is normal for first deployment
- Upload your database manually if needed

**Permission errors:**
```
ERROR: Failed to download from S3: Access Denied
```
- Check Lambda execution role has S3 read permissions
- Verify bucket name and key are correct

**Large database timeouts:**
```
ERROR: Lambda function timeout
```
- Increase Lambda timeout in SAM template
- Consider database size optimization

### Debugging Commands

```bash
# Check S3 object exists
aws s3 ls s3://your-bucket/databases/

# Download database manually
aws s3 cp s3://your-bucket/databases/k9_api_dev.db ./local_db.db

# Check database contents
python3 -c "import duckdb; conn=duckdb.connect('local_db.db'); print(conn.execute('SHOW TABLES').fetchall())"
```

## 🔐 Security

- Database files in S3 are encrypted at rest
- Lambda execution role has minimal required permissions
- Database contains no sensitive authentication data (only business data)
- Consider S3 versioning for database backup/rollback capabilities

## 📈 Monitoring

Set up CloudWatch alerts for:
- Database download failures
- Upload failures  
- Database size growth
- Cold start duration increases

Example CloudWatch query:
```
fields @timestamp, @message
| filter @message like /database/
| sort @timestamp desc
```