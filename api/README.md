# K9 API Backend

A serverless API backend for the K9 application using AWS Lambda, API Gateway, and DuckDB with multi-layer architecture for optimal performance.

## 🏗️ Architecture

### Multi-Layer Lambda Design
- **Core Layer** (~5MB): Essential dependencies (boto3, pydantic, python-jose)
- **Data Layer** (~20MB): Database and data processing (duckdb, pandas)
- **ML Layer** (~200MB): Heavy ML dependencies (onnxruntime, opencv, hdbscan)

### Tech Stack
- **Runtime**: Python 3.9 with uv package management
- **Database**: DuckDB (local SQL database)
- **Authentication**: AWS Cognito JWT tokens
- **Storage**: AWS S3 for file uploads
- **Deployment**: AWS SAM (Serverless Application Model)

## 🚀 Quick Start

### Prerequisites
```bash
# Install uv (modern Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install AWS SAM CLI
pip install aws-sam-cli

# Configure AWS credentials
aws configure
```

### Development Setup

1. **Build the project**:
```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

2. **Start local development server**:
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

The API will be available at `http://localhost:3001`

### Deploy to AWS

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh \
  --environment dev \
  --user-pool-id us-east-1_XXXXXXXXX \
  --bucket-name k9-storage-dev
```

## 📁 Project Structure

```
api/
├── src/
│   ├── shared/           # Shared utilities and models
│   │   ├── models.py     # Pydantic models matching React types
│   │   ├── utils.py      # Lambda utilities and helpers
│   │   ├── auth.py       # JWT authentication
│   │   └── database.py   # DuckDB repository pattern
│   └── handlers/         # Lambda function handlers
│       ├── user.py       # User profile management
│       ├── reports.py    # Report CRUD operations
│       └── embeddings.py # ML embedding operations
├── infrastructure/
│   └── template.yaml     # SAM CloudFormation template
├── requirements/         # Dependency files by layer
│   ├── core.txt         # Core dependencies
│   ├── data.txt         # Data processing dependencies
│   └── ml.txt           # ML dependencies
└── scripts/             # Build and deployment scripts
    ├── build.sh         # Multi-layer build script
    ├── deploy.sh        # Deployment automation
    └── dev.sh           # Local development server
```

## 🔗 API Endpoints

### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile  
- `POST /user/upload-avatar` - Upload profile picture

### Reports Management
- `GET /reports` - List user reports with pagination
- `POST /reports` - Create new report
- `GET /reports/{reportId}` - Get specific report
- `PUT /reports/{reportId}` - Update report
- `DELETE /reports/{reportId}` - Delete report

### Search & Favorites
- `POST /reports/search-products` - Search products with embeddings
- `GET /reports/{reportId}/favorites` - Get report favorites
- `POST /reports/{reportId}/favorites/sync` - Sync favorites

### Embeddings (Heavy ML Operations)
- `POST /embeddings/compute` - Compute product embeddings
- `POST /embeddings/similarity` - Calculate similarity matrix

## 🔧 Configuration

### Environment Variables
- `ENVIRONMENT` - Deployment environment (dev/staging/prod)
- `COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `S3_BUCKET_NAME` - S3 bucket for file storage
- `DUCKDB_PATH` - DuckDB database file path

### Lambda Layers
The multi-layer architecture optimizes cold start times:

1. **Core Layer**: Always loaded, contains essential dependencies
2. **Data Layer**: Loaded for database operations
3. **ML Layer**: Only loaded for embedding computations

## 🧪 Development Commands

```bash
# Build all layers
./scripts/build.sh

# Start local dev server
./scripts/dev.sh

# Start with debug mode
./scripts/dev.sh --debug

# Deploy to specific environment
./scripts/deploy.sh --environment staging --user-pool-id <pool-id> --bucket-name <bucket>

# Skip build and start immediately
./scripts/dev.sh --no-build
```

## 🔐 Authentication

The API uses AWS Cognito JWT tokens:

1. Frontend obtains JWT from Cognito
2. Include `Authorization: Bearer <token>` in requests
3. Lambda handlers validate tokens automatically

## 💾 Database Schema

### Reports Table
```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  images TEXT[], -- JSON array
  embedding FLOAT[],
  category TEXT,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);
```

## 🚀 Deployment Environments

### Development
```bash
./scripts/deploy.sh --environment dev --user-pool-id <dev-pool> --bucket-name k9-dev
```

### Staging  
```bash
./scripts/deploy.sh --environment staging --user-pool-id <staging-pool> --bucket-name k9-staging
```

### Production
```bash
./scripts/deploy.sh --environment prod --user-pool-id <prod-pool> --bucket-name k9-prod
```

## 🔍 Monitoring

- **CloudWatch Logs**: Automatic logging for all Lambda functions
- **X-Ray Tracing**: Distributed tracing enabled
- **CloudWatch Metrics**: Performance and error metrics

## 🛠️ Troubleshooting

### Common Issues

1. **Cold Start Times**: Heavy ML layer only loads for embedding operations
2. **Memory Limits**: Adjust Lambda memory based on layer usage
3. **Timeout Issues**: Increase timeout for ML operations

### Debug Mode
```bash
./scripts/dev.sh --debug --debug-port 5678
```

### Logs
```bash
# View CloudWatch logs
sam logs --stack-name k9-api-dev --tail

# Local development logs
sam local start-api --debug
```

## 📦 Dependencies

See `requirements/` directory for layer-specific dependencies:
- `core.txt`: Essential Lambda dependencies
- `data.txt`: Database and data processing
- `ml.txt`: Machine learning and computer vision

## 🤝 Integration with React App

The API exactly matches the React app's expectations:

1. **Models**: Pydantic models match TypeScript types in `src/types/report.ts`
2. **Endpoints**: API routes match `src/lib/api/` service classes
3. **Responses**: JSON responses match frontend interface contracts

Update your React app's API base URL to the deployed API Gateway URL.