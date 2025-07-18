#!/bin/bash

# GitHub Actions Setup Script for Azure Function Deployment (Git Bash Simple Version)
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
echo "Creating service principal..."
# Use double slashes to prevent Git Bash path conversion and avoid deprecated --sdk-auth
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role contributor \
    --scopes "//subscriptions/$SUBSCRIPTION_ID" \
    --query '{clientId: appId, clientSecret: password, subscriptionId: subscriptionId, tenantId: tenant, activeDirectoryEndpointUrl: "https://login.microsoftonline.com", resourceManagerEndpointUrl: "https://management.azure.com/", activeDirectoryGraphResourceId: "https://graph.windows.net/", sqlManagementEndpointUrl: "https://management.core.windows.net:8443/", galleryEndpointUrl: "https://gallery.azure.com/", managementEndpointUrl: "https://management.core.windows.net/"}' \
    --output json)

if [ $? -eq 0 ]; then
    echo "✅ Service principal created successfully"
else
    echo "❌ Failed to create service principal"
    exit 1
fi

# Extract values from service principal output (simple parsing)
CLIENT_ID=$(echo "$SP_OUTPUT" | grep -o '"clientId": "[^"]*"' | cut -d'"' -f4)
CLIENT_SECRET=$(echo "$SP_OUTPUT" | grep -o '"clientSecret": "[^"]*"' | cut -d'"' -f4)

# Add subscription and tenant to the JSON for GitHub Actions
SP_OUTPUT_COMPLETE=$(echo "$SP_OUTPUT" | sed "s/}/,\"subscriptionId\":\"$SUBSCRIPTION_ID\",\"tenantId\":\"$TENANT_ID\"}/")

echo ""
echo "================================================"
echo "🔧 COPY THESE SECRETS TO YOUR GITHUB REPOSITORY"
echo "================================================"
echo ""
echo "Go to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "1. AZURE_CREDENTIALS"
echo "-------------------"
echo "$SP_OUTPUT_COMPLETE"
echo ""
echo "2. AZURE_CLIENT_ID"
echo "------------------"
echo "$CLIENT_ID"
echo ""
echo "3. AZURE_CLIENT_SECRET"
echo "----------------------"
echo "$CLIENT_SECRET"
echo ""
echo "4. AZURE_TENANT_ID"
echo "------------------"
echo "$TENANT_ID"
echo ""
echo "5. AZURE_SUBSCRIPTION_ID"
echo "------------------------"
echo "$SUBSCRIPTION_ID"
echo ""
echo "================================================"
echo "🌍 COPY THESE VARIABLES TO YOUR GITHUB REPOSITORY"
echo "================================================"
echo ""
echo "Go to: https://github.com/$GITHUB_REPO/settings/variables/actions"
echo ""
echo "1. AZURE_LOCATION"
echo "-----------------"
echo "centralus"
echo ""
echo "================================================"
echo ""
echo "✅ Service Principal setup completed!"
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
echo "   2. Go to: https://github.com/$GITHUB_REPO/settings/environments"
echo "   3. Create 'development' and 'production' environments"
echo "   4. Configure protection rules for production environment"
echo "   5. Push your code to trigger the deployment workflow"
echo ""
echo "💡 The values have been saved to setup-output.txt for easy copying"

# Save output to file for easy copying
cat > setup-output.txt << EOF
GitHub Repository: $GITHUB_REPO
Service Principal: $SP_NAME

=== GitHub Secrets ===
AZURE_CREDENTIALS:
$SP_OUTPUT_COMPLETE

AZURE_CLIENT_ID:
$CLIENT_ID

AZURE_CLIENT_SECRET:
$CLIENT_SECRET

AZURE_TENANT_ID:
$TENANT_ID

AZURE_SUBSCRIPTION_ID:
$SUBSCRIPTION_ID

=== GitHub Variables ===
AZURE_LOCATION:
centralus

=== URLs ===
Secrets: https://github.com/$GITHUB_REPO/settings/secrets/actions
Variables: https://github.com/$GITHUB_REPO/settings/variables/actions
Environments: https://github.com/$GITHUB_REPO/settings/environments
EOF

echo ""
echo "📄 All details saved to: setup-output.txt"
