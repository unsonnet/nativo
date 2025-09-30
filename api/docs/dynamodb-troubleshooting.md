# 🔧 DynamoDB Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **1. Permission Errors**
```
botocore.exceptions.ClientError: An error occurred (AccessDeniedException)
```

**Solution:**
Check your Lambda execution role has the DynamoDB permissions:
```bash
# Verify IAM role permissions
aws iam get-role-policy --role-name K9ApiRole-dev --policy-name DynamoDBCrudPolicy

# Test table access
aws dynamodb describe-table --table-name k9-users-dev
```

### **2. Table Not Found**
```
botocore.exceptions.ClientError: Requested resource not found
```

**Solution:**
Ensure tables are created during deployment:
```bash
# Check if tables exist
aws dynamodb list-tables --region us-east-1

# Re-deploy to create tables
./scripts/deploy.sh --environment dev --user-pool-id <pool-id>
```

### **3. Conditional Check Failed**
```
botocore.exceptions.ClientError: The conditional request failed
```

**Solution:**
This occurs when trying to access another user's data:
```python
# Ensure you're passing the correct user_id
ReportRepository.update_report(report_id, user_id, update_data)
```

### **4. Item Too Large**
```
botocore.exceptions.ClientError: Item size has exceeded 400KB limit
```

**Solution:**
Break large items into smaller pieces:
```python
# For large embeddings, consider chunking
if len(embedding) > 100000:
    # Store in S3 and reference in DynamoDB
    s3_key = f"embeddings/{product_id}.json"
    # Store only the S3 reference in DynamoDB
```

## 🔍 **Debugging Commands**

### **Check Table Status:**
```bash
# Get table info
aws dynamodb describe-table --table-name k9-reports-dev

# Check item count
aws dynamodb scan --table-name k9-reports-dev --select COUNT

# View recent items
aws dynamodb scan --table-name k9-reports-dev --limit 5
```

### **Monitor Performance:**
```bash
# CloudWatch metrics
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/k9-api

# Check for throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=k9-reports-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### **Test Operations:**
```python
# Test connection in Python
import boto3
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('k9-users-dev')
print(table.table_status)

# Test repository operations
from src.shared.database import UserRepository
user = DBUser(user_id="test", name="Test User", email="test@example.com")
UserRepository.create_user(user)
result = UserRepository.get_user("test")
print(result)
```

## 📊 **Performance Optimization**

### **Read Optimization:**
```python
# Use consistent reads only when necessary
table.get_item(
    Key={'user_id': 'test'},
    ConsistentRead=True  # Only if you need immediate consistency
)

# Use projections to reduce data transfer
table.query(
    IndexName='UserReportsIndex',
    KeyConditionExpression=Key('user_id').eq(user_id),
    ProjectionExpression='id, title, created_at'  # Only needed fields
)
```

### **Write Optimization:**
```python
# Use batch operations for multiple items
with table.batch_writer() as batch:
    for item in items:
        batch.put_item(Item=item)

# Use conditional writes to prevent overwrites
table.put_item(
    Item=item,
    ConditionExpression='attribute_not_exists(id)'
)
```

### **Cost Optimization:**
```bash
# Switch to provisioned capacity for predictable workloads
aws dynamodb modify-table \
  --table-name k9-reports-dev \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --resource-id table/k9-reports-dev \
  --min-capacity 5 \
  --max-capacity 40000
```

## 🔄 **Data Management**

### **Backup & Restore:**
```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name k9-reports-dev \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Create on-demand backup
aws dynamodb create-backup \
  --table-name k9-reports-dev \
  --backup-name k9-reports-backup-$(date +%Y%m%d)

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name k9-reports-restored \
  --backup-arn arn:aws:dynamodb:region:account:table/k9-reports-dev/backup/01234567890123-abcdefgh
```

### **Data Export/Import:**
```bash
# Export table data
aws dynamodb scan --table-name k9-users-dev > users-export.json

# Import data to new table
aws dynamodb batch-write-item --request-items file://import-data.json
```

### **Clean Up Development Data:**
```python
# Delete all items (be careful!)
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('k9-reports-dev')

# Scan and delete all items
response = table.scan()
for item in response['Items']:
    table.delete_item(Key={'id': item['id']})
```

## ⚡ **Best Practices**

### **Error Handling:**
```python
import boto3
from botocore.exceptions import ClientError

try:
    table.put_item(Item=item)
except ClientError as e:
    error_code = e.response['Error']['Code']
    if error_code == 'ConditionalCheckFailedException':
        # Handle conditional check failure
        pass
    elif error_code == 'ProvisionedThroughputExceededException':
        # Handle throttling
        time.sleep(1)
        # Retry operation
    else:
        # Handle other errors
        raise
```

### **Pagination:**
```python
def get_all_user_reports(user_id):
    """Get all reports for a user with pagination"""
    reports = []
    last_key = None
    
    while True:
        if last_key:
            response = table.query(
                IndexName='UserReportsIndex',
                KeyConditionExpression=Key('user_id').eq(user_id),
                ExclusiveStartKey=last_key
            )
        else:
            response = table.query(
                IndexName='UserReportsIndex',
                KeyConditionExpression=Key('user_id').eq(user_id)
            )
        
        reports.extend(response['Items'])
        
        if 'LastEvaluatedKey' not in response:
            break
        last_key = response['LastEvaluatedKey']
    
    return reports
```

### **Environment Management:**
```python
import os

def get_table_name(base_name: str) -> str:
    """Get environment-specific table name"""
    env = os.environ.get('ENVIRONMENT', 'dev')
    return f"k9-{base_name}-{env}"

# Usage
users_table = dynamodb.Table(get_table_name('users'))
```

## 🎯 **Monitoring Setup**

### **CloudWatch Alarms:**
```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "DynamoDB-HighErrorRate" \
  --alarm-description "DynamoDB error rate too high" \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=k9-reports-dev

# Create alarm for throttling
aws cloudwatch put-metric-alarm \
  --alarm-name "DynamoDB-Throttling" \
  --alarm-description "DynamoDB requests being throttled" \
  --metric-name ThrottledRequests \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=TableName,Value=k9-reports-dev
```

### **Custom Metrics:**
```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def record_custom_metric(metric_name: str, value: float, unit: str = 'Count'):
    """Record custom CloudWatch metric"""
    cloudwatch.put_metric_data(
        Namespace='K9/API',
        MetricData=[
            {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Dimensions': [
                    {
                        'Name': 'Environment',
                        'Value': os.environ.get('ENVIRONMENT', 'dev')
                    }
                ]
            }
        ]
    )

# Usage in your code
record_custom_metric('ReportsCreated', 1)
record_custom_metric('QueryLatency', query_time, 'Milliseconds')
```

This troubleshooting guide will help you quickly diagnose and resolve any DynamoDB-related issues in your K9 API! 🚀