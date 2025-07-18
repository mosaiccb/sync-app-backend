#!/bin/bash

# GitHub Actions Auto-Setup Script (Git Bash with GitHub CLI)
# This script automatically creates Azure service principal and sets GitHub secrets

echo "=== Automated GitHub Actions Setup for UKG Sync Backend ==="
echo ""

# Add GitHub CLI to PATH and set alias
export PATH="$PATH:/c/Program Files/GitHub CLI"
alias gh="/c/Program Files/GitHub CLI/gh.exe"

# Check if GitHub CLI exists
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install GitHub CLI first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Check GitHub authentication
echo "🔐 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "🔑 Please authenticate with GitHub..."
    gh auth login
fi

echo "✅ GitHub authentication verified"
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

# Get current repository info
echo "📋 Getting repository information..."
GITHUB_REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')
echo "📋 Repository: $GITHUB_REPO"

# Prompt for application name
read -p "📍 Enter your application name (default: ukg-sync-backend): " APP_NAME
APP_NAME=${APP_NAME:-ukg-sync-backend}

# Create service principal
echo ""
echo "🔑 Creating service principal for GitHub Actions..."
SP_NAME="${APP_NAME}-github-actions"

# Create service principal with contributor role
echo "Creating service principal..."
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

# Extract values from service principal output
CLIENT_ID=$(echo "$SP_OUTPUT" | grep -o '"clientId": "[^"]*"' | cut -d'"' -f4)
CLIENT_SECRET=$(echo "$SP_OUTPUT" | grep -o '"clientSecret": "[^"]*"' | cut -d'"' -f4)

# Create properly formatted AZURE_CREDENTIALS JSON
AZURE_CREDENTIALS=$(cat <<EOF
{
  "clientId": "$CLIENT_ID",
  "clientSecret": "$CLIENT_SECRET",
  "subscriptionId": "$SUBSCRIPTION_ID",
  "tenantId": "$TENANT_ID",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
EOF
)

echo ""
echo "🔧 Setting GitHub repository secrets..."

# Set secrets using GitHub CLI
echo "Setting AZURE_CREDENTIALS..."
echo "$AZURE_CREDENTIALS" | gh secret set AZURE_CREDENTIALS --repo "$GITHUB_REPO"

echo "Setting AZURE_CLIENT_ID..."
echo "$CLIENT_ID" | gh secret set AZURE_CLIENT_ID --repo "$GITHUB_REPO"

echo "Setting AZURE_CLIENT_SECRET..."
echo "$CLIENT_SECRET" | gh secret set AZURE_CLIENT_SECRET --repo "$GITHUB_REPO"

echo "Setting AZURE_TENANT_ID..."
echo "$TENANT_ID" | gh secret set AZURE_TENANT_ID --repo "$GITHUB_REPO"

echo "Setting AZURE_SUBSCRIPTION_ID..."
echo "$SUBSCRIPTION_ID" | gh secret set AZURE_SUBSCRIPTION_ID --repo "$GITHUB_REPO"

echo ""
echo "🌍 Setting GitHub repository variables..."

# Set variables using GitHub CLI
echo "Setting AZURE_LOCATION..."
echo "centralus" | gh variable set AZURE_LOCATION --repo "$GITHUB_REPO"

echo ""
echo "🎯 Creating GitHub environments..."

# Create environments
echo "Creating development environment..."
gh api repos/"$GITHUB_REPO"/environments/development --method PUT --field prevention_rules='[]' --field deployment_branch_policy='null'

echo "Creating production environment..."
gh api repos/"$GITHUB_REPO"/environments/production --method PUT --field prevent_self_review=true --field reviewers='[]' --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'

echo ""
echo "================================================"
echo "✅ AUTOMATED SETUP COMPLETED!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "   - Service Principal: $SP_NAME"
echo "   - Client ID: $CLIENT_ID"
echo "   - Subscription: $SUBSCRIPTION_ID"
echo "   - Tenant: $TENANT_ID"
echo "   - Repository: $GITHUB_REPO"
echo ""
echo "🎯 What was set automatically:"
echo "   ✅ GitHub Secrets:"
echo "       - AZURE_CREDENTIALS"
echo "       - AZURE_CLIENT_ID"
echo "       - AZURE_CLIENT_SECRET"
echo "       - AZURE_TENANT_ID"
echo "       - AZURE_SUBSCRIPTION_ID"
echo "   ✅ GitHub Variables:"
echo "       - AZURE_LOCATION (centralus)"
echo "   ✅ GitHub Environments:"
echo "       - development"
echo "       - production"
echo ""
echo "🚀 Next steps:"
echo "   1. Push your code to trigger the GitHub Actions workflow"
echo "   2. Monitor the deployment at: https://github.com/$GITHUB_REPO/actions"
echo "   3. Your app will be deployed automatically!"
echo ""
echo "💡 All details saved to: automated-setup-output.txt"

# Save output to file
cat > automated-setup-output.txt << EOF
=== AUTOMATED GITHUB ACTIONS SETUP COMPLETED ===

Repository: $GITHUB_REPO
Service Principal: $SP_NAME
Client ID: $CLIENT_ID
Subscription: $SUBSCRIPTION_ID
Tenant: $TENANT_ID

All secrets and variables have been automatically set in your GitHub repository!

GitHub Secrets Set:
- AZURE_CREDENTIALS
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID

GitHub Variables Set:
- AZURE_LOCATION: centralus

GitHub Environments Created:
- development
- production

Next: Push your code to trigger deployment!
Workflow URL: https://github.com/$GITHUB_REPO/actions
EOF

echo "📄 Setup details saved to: automated-setup-output.txt"
