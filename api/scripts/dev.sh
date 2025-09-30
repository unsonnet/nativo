#!/bin/bash

# K9 API Development Server
# Runs the API locally using SAM for development and testing

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
PORT=3001
DEBUG_PORT=5678

# Default environment variables for local development
export ENVIRONMENT="local"
export AWS_DEFAULT_REGION="us-east-1"
export COGNITO_USER_POOL_ID="us-east-1_LOCALDEV"
export S3_BUCKET_NAME="k9-local-storage"
export PYTHONPATH="${API_DIR}/src:${PYTHONPATH}"

# Help function
show_help() {
    echo -e "${GREEN}K9 API Development Server${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT          Port number [default: 3001]"
    echo "  -d, --debug             Enable debug mode with debugger port"
    echo "  --debug-port PORT       Debug port [default: 5678]"
    echo "  --no-build              Skip build step"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Start on port 3001"
    echo "  $0 --port 8000         # Start on port 8000"
    echo "  $0 --debug             # Start with debugger enabled"
    echo "  $0 --no-build          # Skip build and start immediately"
}

# Parse command line arguments
BUILD_REQUIRED=true
DEBUG_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -d|--debug)
            DEBUG_MODE=true
            shift
            ;;
        --debug-port)
            DEBUG_PORT="$2"
            shift 2
            ;;
        --no-build)
            BUILD_REQUIRED=false
            shift
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

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if SAM CLI is installed
    if ! command -v sam &> /dev/null; then
        echo -e "${RED}❌ SAM CLI is not installed${NC}"
        echo -e "${YELLOW}Install with: pip install aws-sam-cli${NC}"
        exit 1
    fi
    
    # Check if uv is installed (for building)
    if [[ "$BUILD_REQUIRED" == true ]] && ! command -v uv &> /dev/null; then
        echo -e "${RED}❌ uv is not installed${NC}"
        echo -e "${YELLOW}Install with: curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Build the project
build_project() {
    if [[ "$BUILD_REQUIRED" == true ]]; then
        echo -e "${BLUE}🔨 Building project...${NC}"
        
        cd "${API_DIR}"
        
        # Run build script
        chmod +x scripts/build.sh
        ./scripts/build.sh
        
        # Build SAM template
        sam build --template-file "${TEMPLATE_FILE}"
        
        echo -e "${GREEN}✅ Project built successfully${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping build step${NC}"
    fi
}

# Create local environment file
create_local_env() {
    local env_file="${API_DIR}/.env.local"
    
    cat > "${env_file}" << EOF
# Local development environment variables
ENVIRONMENT=local
AWS_DEFAULT_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_LOCALDEV
S3_BUCKET_NAME=k9-local-storage
PYTHONPATH=${API_DIR}/src

# Debug settings
$(if [[ "$DEBUG_MODE" == true ]]; then echo "PYTHONDEBUG=1"; fi)
EOF
    
    echo -e "${BLUE}📝 Created local environment file: ${env_file}${NC}"
}

# Start local API server
start_local_server() {
    echo -e "${BLUE}🚀 Starting local API server...${NC}"
    
    cd "${API_DIR}"
    
    # Create local environment
    create_local_env
    
    # Prepare SAM local arguments
    local sam_args=(
        "local" "start-api"
        "--template-file" "${TEMPLATE_FILE}"
        "--port" "${PORT}"
        "--host" "0.0.0.0"
        "--env-vars" ".env.local"
    )
    
    # Add debug arguments if enabled
    if [[ "$DEBUG_MODE" == true ]]; then
        sam_args+=(
            "--debug-port" "${DEBUG_PORT}"
            "--debug-args" "-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=${DEBUG_PORT}"
        )
        echo -e "${YELLOW}🐛 Debug mode enabled on port ${DEBUG_PORT}${NC}"
    fi
    
    echo -e "${GREEN}🎉 Starting K9 API server...${NC}"
    echo -e "${BLUE}API URL:${NC} http://localhost:${PORT}"
    if [[ "$DEBUG_MODE" == true ]]; then
        echo -e "${BLUE}Debug Port:${NC} ${DEBUG_PORT}"
    fi
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    
    # Start SAM local
    sam "${sam_args[@]}"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down local server...${NC}"
    echo -e "${GREEN}✅ Server stopped${NC}"
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main function
main() {
    echo -e "${GREEN}🚀 K9 API Development Server${NC}"
    echo -e "${BLUE}Port:${NC} ${PORT}"
    echo -e "${BLUE}Debug Mode:${NC} $(if [[ "$DEBUG_MODE" == true ]]; then echo "Enabled"; else echo "Disabled"; fi)"
    echo ""
    
    # Run checks and setup
    check_prerequisites
    build_project
    start_local_server
}

# Run main function
main "$@"