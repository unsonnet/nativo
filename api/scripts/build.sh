#!/bin/bash

# K9 API Multi-Layer Build Script
# Builds separate Lambda layers and packages for optimized deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building K9 API with Multi-Layer Architecture${NC}"

# Configuration
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAYERS_DIR="${API_DIR}/layers"
BUILD_DIR="${API_DIR}/.aws-sam/build"

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf "${LAYERS_DIR}"
rm -rf "${BUILD_DIR}"

# Create directories
mkdir -p "${LAYERS_DIR}"

echo -e "${BLUE}📁 Created build directories${NC}"

# Function to build a layer
build_layer() {
    local layer_name=$1
    local requirements_file="requirements/${layer_name}.txt"
    local layer_dir="${LAYERS_DIR}/${layer_name}"
    
    echo -e "${YELLOW}🔨 Building ${layer_name} layer...${NC}"
    
    # Create layer directory structure
    mkdir -p "${layer_dir}/python"
    
    # Check if requirements file exists
    if [[ ! -f "${API_DIR}/${requirements_file}" ]]; then
        echo -e "${RED}❌ Requirements file not found: ${requirements_file}${NC}"
        exit 1
    fi
    
    # Install dependencies using uv
    cd "${layer_dir}"
    
    echo -e "  📦 Installing dependencies from ${requirements_file}"
    
    # Use uv to install dependencies into python/ directory
    uv pip install \
        --python python3.9 \
        -r "${API_DIR}/${requirements_file}" \
        -t python/ \
        --no-deps-check \
        --quiet
    
    echo -e "${GREEN}✅ ${layer_name} layer built successfully${NC}"
}

# Function to check if uv is installed
check_uv() {
    if ! command -v uv &> /dev/null; then
        echo -e "${RED}❌ uv is not installed. Please install it first:${NC}"
        echo -e "${YELLOW}curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
        exit 1
    fi
}

# Function to package source code
package_source() {
    echo -e "${YELLOW}📦 Packaging source code...${NC}"
    
    local src_dir="${API_DIR}/src"
    local package_dir="${LAYERS_DIR}/src"
    
    # Copy source code to layers directory
    cp -r "${src_dir}" "${package_dir}"
    
    echo -e "${GREEN}✅ Source code packaged successfully${NC}"
}

# Main build process
main() {
    # Check prerequisites
    check_uv
    
    # Build layers in order (lightest to heaviest)
    echo -e "${BLUE}🏗️  Building Lambda layers...${NC}"
    
    # Layer 1: Core dependencies (lightweight)
    build_layer "core"
    
    # Layer 2: Data processing dependencies
    build_layer "data"
    
    # Layer 3: Heavy ML dependencies
    build_layer "ml"
    
    # Package source code
    package_source
    
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo -e "${BLUE}📋 Build artifacts:${NC}"
    echo -e "  • Core Layer: ${LAYERS_DIR}/core/"
    echo -e "  • Data Layer: ${LAYERS_DIR}/data/"
    echo -e "  • ML Layer: ${LAYERS_DIR}/ml/"
    echo -e "  • Source Code: ${LAYERS_DIR}/src/"
    
    echo -e ""
    echo -e "${YELLOW}🚀 Ready to deploy with:${NC}"
    echo -e "${BLUE}  sam build --template-file infrastructure/template.yaml${NC}"
    echo -e "${BLUE}  sam deploy --guided${NC}"
}

# Run main function
main "$@"