#!/bin/bash
# 🚀 Automated Deployment Script - Bash  
# Deploy Azure Functions Backend automatically
#
# Author: GitHub Copilot AI Assistant
# Created: July 2025
# Purpose: Automated deployment bypassing VS Code Git requirements
#
# 🔧 Hardcoded Configuration:
#   • Function App: ukg-sync-backend-5rrqlcuxyzlvy
#   • Resource Group: mosaicRG01
#   • Subscription: 3a09f19f-d0c3-4a11-ac2c-6d869a76ec94

set -e  # Exit on any error

# Configuration
FUNCTION_APP_NAME="${1:-ukg-sync-backend-5rrqlcuxyzlvy}"
RESOURCE_GROUP="${2:-mosaicRG01}"
SUBSCRIPTION_ID="${3:-3a09f19f-d0c3-4a11-ac2c-6d869a76ec94}"
SKIP_BUILD="${4:-false}"

echo "🚀 Starting Azure Functions Deployment"
echo "Function App: $FUNCTION_APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Subscription: $SUBSCRIPTION_ID"

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install Azure CLI"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo "❌ Azure CLI not authenticated. Run: az login"
    exit 1
fi

# Get current subscription and switch if needed
CURRENT_SUB=$(az account show --query "id" -o tsv 2>/dev/null)
if [[ "$CURRENT_SUB" != "$SUBSCRIPTION_ID" ]]; then
    echo "🔄 Switching to target subscription..."
    if az account set --subscription "$SUBSCRIPTION_ID"; then
        echo "✅ Switched to subscription: $SUBSCRIPTION_ID"
    else
        echo "❌ Failed to switch to subscription: $SUBSCRIPTION_ID"
        exit 1
    fi
else
    echo "✅ Already using correct subscription: $SUBSCRIPTION_ID"
fi

echo "✅ Azure CLI authenticated and subscription verified"

# Check if Azure Functions Core Tools is installed
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools not found. Please install func CLI"
    exit 1
fi

FUNC_VERSION=$(func --version)
echo "✅ Azure Functions Core Tools: $FUNC_VERSION"

# Check if we're in the right directory
if [[ ! -f "host.json" ]]; then
    echo "❌ host.json not found. Make sure you're in the sync-app-backend directory"
    exit 1
fi

if [[ ! -f "package.json" ]]; then
    echo "❌ package.json not found. Make sure you're in the sync-app-backend directory"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build the project (unless skipped)
if [[ "$SKIP_BUILD" != "true" ]]; then
    echo ""
    echo "🔨 Building project..."
    
    echo "Installing dependencies..."
    npm install
    
    echo "Building TypeScript..."
    npm run build
    
    echo "✅ Build completed successfully"
else
    echo "⏭️  Skipping build"
fi

# Method 1: Try Azure Functions Core Tools deployment
echo ""
echo "🚀 Attempting deployment with Azure Functions Core Tools..."

if func azure functionapp publish "$FUNCTION_APP_NAME"; then
    echo "✅ Deployment successful with func publish!"
    
    # Test the deployment
    echo ""
    echo "🧪 Testing deployment..."
    sleep 5
    
    HEALTH_URL="https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed, but deployment may still be successful"
        echo "URL: $HEALTH_URL"
    fi
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "🌐 Function App URL: https://$FUNCTION_APP_NAME.azurewebsites.net"
    echo "🔍 Admin Functions: https://$FUNCTION_APP_NAME.azurewebsites.net/admin/functions"
    
    exit 0
fi

# Method 2: ZIP deployment fallback
echo "⚠️  func publish failed, trying ZIP deployment method..."
echo ""
echo "📦 Attempting ZIP deployment..."

# Create deployment package
DEPLOYMENT_ZIP="deployment-$(date +%Y%m%d-%H%M%S).zip"
echo "Creating deployment package: $DEPLOYMENT_ZIP"

# Create zip excluding certain directories
zip -r "$DEPLOYMENT_ZIP" . -x "node_modules/*" ".git/*" "*.zip" ".vscode/*" "*.log"

# Deploy via Azure CLI
echo "Uploading to Azure..."
if az functionapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --src "$DEPLOYMENT_ZIP"; then
    
    echo "✅ ZIP deployment successful!"
    
    # Cleanup
    rm "$DEPLOYMENT_ZIP"
    
    # Test the deployment
    echo ""
    echo "🧪 Testing deployment..."
    sleep 10
    
    HEALTH_URL="https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed, but deployment may still be successful"
        echo "URL: $HEALTH_URL"
    fi
    
    echo ""
    echo "🎉 ZIP Deployment completed successfully!"
    echo "🌐 Function App URL: https://$FUNCTION_APP_NAME.azurewebsites.net"
    echo "🔍 Admin Functions: https://$FUNCTION_APP_NAME.azurewebsites.net/admin/functions"
else
    echo "❌ ZIP deployment failed"
    rm "$DEPLOYMENT_ZIP"
    exit 1
fi

echo ""
echo "✨ All deployment methods completed!"
