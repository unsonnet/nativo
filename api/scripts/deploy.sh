#!/bin/bash

# K9 API Deployment Script
# Handles deployment with environment-specific configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_FILE="${API_DIR}/infrastructure/template.yaml"

# Default values
ENVIRONMENT="dev"
REGION="us-east-1"
STACK_NAME="k9-api"
COGNITO_USER_POOL_ID=""

# Help function
show_help() {
    echo -e "${GREEN}K9 API Deployment Script${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV     Environment (dev, staging, prod) [default: dev]"
    echo "  -r, --region REGION       AWS region [default: us-east-1]"
    echo "  -s, --stack-name NAME     CloudFormation stack name [default: k9-api]"
    echo "  -u, --user-pool-id ID     Cognito User Pool ID (required)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment dev --user-pool-id us-east-1_XXXXXXXXX"
    echo "  $0 -e prod -u us-east-1_YYYYYYYYY -r us-west-2"
    echo ""
    echo "Note: DynamoDB tables and S3 buckets are automatically created and managed."
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -s|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -u|--user-pool-id)
            COGNITO_USER_POOL_ID="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validation
validate_parameters() {
    if [[ -z "$COGNITO_USER_POOL_ID" ]]; then
        echo -e "${RED}❌ Cognito User Pool ID is required${NC}"
        echo -e "${YELLOW}Use: --user-pool-id <pool-id>${NC}"
        exit 1
    fi
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        echo -e "${YELLOW}Valid environments: dev, staging, prod${NC}"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check if SAM CLI is installed
    if ! command -v sam &> /dev/null; then
        echo -e "${RED}❌ SAM CLI is not installed${NC}"
        echo -e "${YELLOW}Install with: pip install aws-sam-cli${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo -e "${YELLOW}Run: aws configure${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Build the project
build_project() {
    echo -e "${BLUE}🔨 Building project...${NC}"
    
    cd "${API_DIR}"
    
    # Run build script
    chmod +x scripts/build.sh
    ./scripts/build.sh
    
    echo -e "${GREEN}✅ Project built successfully${NC}"
}

# Deploy with SAM
deploy_with_sam() {
    echo -e "${BLUE}🚀 Deploying with SAM...${NC}"
    
    cd "${API_DIR}"
    
    # Build SAM template
    echo -e "${YELLOW}📦 Building SAM template...${NC}"
    sam build --template-file "${TEMPLATE_FILE}"
    
    # Deploy with parameters
    echo -e "${YELLOW}🚀 Deploying to AWS...${NC}"
    
    local stack_name_env="${STACK_NAME}-${ENVIRONMENT}"
    
    sam deploy \
        --stack-name "${stack_name_env}" \
        --region "${REGION}" \
        --capabilities CAPABILITY_IAM \
        --parameter-overrides \
            Environment="${ENVIRONMENT}" \
            CognitoUserPoolId="${COGNITO_USER_POOL_ID}" \
        --resolve-s3 \
        --no-fail-on-empty-changeset
    
    echo -e "${GREEN}✅ Deployment completed successfully${NC}"
}

# Get stack outputs
get_stack_outputs() {
    echo -e "${BLUE}📋 Getting deployment information...${NC}"
    
    local stack_name_env="${STACK_NAME}-${ENVIRONMENT}"
    
    # Get API Gateway URL
    local api_url=$(aws cloudformation describe-stacks \
        --region "${REGION}" \
        --stack-name "${stack_name_env}" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
        --output text 2>/dev/null || echo "Not available")
    
    echo -e ""
    echo -e "${GREEN}🎉 Deployment Information:${NC}"
    echo -e "${BLUE}Stack Name:${NC} ${stack_name_env}"
    echo -e "${BLUE}Environment:${NC} ${ENVIRONMENT}"
    echo -e "${BLUE}Region:${NC} ${REGION}"
    echo -e "${BLUE}API Gateway URL:${NC} ${api_url}"
    echo -e "${BLUE}Cognito User Pool:${NC} ${COGNITO_USER_POOL_ID}"
    echo -e ""
    echo -e "${YELLOW}💡 DynamoDB tables and S3 buckets are automatically managed by CloudFormation${NC}"
    echo -e "${YELLOW}💡 Update your React app's API configuration with the API Gateway URL${NC}"
}

# Main deployment process
main() {
    echo -e "${GREEN}🚀 K9 API Deployment Starting${NC}"
    echo -e "${BLUE}Environment:${NC} ${ENVIRONMENT}"
    echo -e "${BLUE}Region:${NC} ${REGION}"
    echo -e "${BLUE}Stack:${NC} ${STACK_NAME}-${ENVIRONMENT}"
    echo ""
    
    # Validation and checks
    validate_parameters
    check_prerequisites
    
    # Build and deploy
    build_project
    deploy_with_sam
    
    # Show results
    get_stack_outputs
    
    echo -e ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Run main function
main "$@"