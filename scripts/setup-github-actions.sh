#!/bin/bash

# GitHub Actions Setup Script for Azure Function Deployment (Git Bash Compatible)
# This script helps configure GitHub repository secrets for automated deployment

echo "=== GitHub Actions Setup for UKG Sync Backend ==="
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Login to Azure
echo "🔐 Logging in to Azure..."
az login

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "📋 Using subscription: $SUBSCRIPTION_ID"

# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "📋 Using tenant: $TENANT_ID"

# Prompt for repository information
echo ""
read -p "📍 Enter your GitHub repository (format: owner/repo): " GITHUB_REPO
read -p "📍 Enter your application name (default: ukg-sync-backend): " APP_NAME
APP_NAME=${APP_NAME:-ukg-sync-backend}

# Create service principal
echo ""
echo "🔑 Creating service principal for GitHub Actions..."
SP_NAME="${APP_NAME}-github-actions"

# Create service principal with contributor role
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role contributor \
    --scopes "/subscriptions/$SUBSCRIPTION_ID" \
    --sdk-auth)

if [ $? -eq 0 ]; then
    echo "✅ Service principal created successfully"
else
    echo "❌ Failed to create service principal"
    exit 1
fi

# Extract values from service principal output
CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
CLIENT_SECRET=$(echo "$SP_OUTPUT" | jq -r '.clientSecret')

echo ""
echo "🔧 GitHub Secrets Configuration"
echo "================================================"
echo ""
echo "Please add these secrets to your GitHub repository:"
echo "Go to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "Secret Name: AZURE_CREDENTIALS"
echo "Secret Value:"
echo "$SP_OUTPUT"
echo ""
echo "Secret Name: AZURE_CLIENT_ID"
echo "Secret Value: $CLIENT_ID"
echo ""
echo "Secret Name: AZURE_CLIENT_SECRET"
echo "Secret Value: $CLIENT_SECRET"
echo ""
echo "Secret Name: AZURE_TENANT_ID"
echo "Secret Value: $TENANT_ID"
echo ""
echo "Secret Name: AZURE_SUBSCRIPTION_ID"
echo "Secret Value: $SUBSCRIPTION_ID"
echo ""
echo "================================================"
echo ""
echo "🌍 GitHub Variables Configuration"
echo "Go to: https://github.com/$GITHUB_REPO/settings/variables/actions"
echo ""
echo "Variable Name: AZURE_LOCATION"
echo "Variable Value: centralus"
echo ""
echo "================================================"
echo ""
echo "✅ Service Principal setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - Service Principal: $SP_NAME"
echo "   - Client ID: $CLIENT_ID"
echo "   - Subscription: $SUBSCRIPTION_ID"
echo "   - Tenant: $TENANT_ID"
echo "   - Repository: $GITHUB_REPO"
echo ""
echo "🔧 Next steps:"
echo "   1. Copy the secrets above to your GitHub repository"
echo "   2. Go to your GitHub repository settings"
echo "   3. Navigate to Environments and create 'development' and 'production' environments"
echo "   4. Configure protection rules for production environment"
echo "   5. Push your code to trigger the deployment workflow"
echo ""
echo "� Tip: You can also use GitHub CLI if you have it installed:"
echo "   gh secret set AZURE_CREDENTIALS --body '\$SP_OUTPUT' --repo $GITHUB_REPO"
