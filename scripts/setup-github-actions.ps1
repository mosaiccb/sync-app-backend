# GitHub Actions Setup Script for Azure Function Deployment
# This script helps configure GitHub repository secrets for automated deployment

Write-Host "=== GitHub Actions Setup for UKG Sync Backend ===" -ForegroundColor Green
Write-Host ""

# Check if Azure CLI is installed
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if GitHub CLI is installed
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Login to Azure
Write-Host "🔐 Logging in to Azure..." -ForegroundColor Blue
az login

# Get subscription ID
$SUBSCRIPTION_ID = (az account show --query id -o tsv)
Write-Host "📋 Using subscription: $SUBSCRIPTION_ID" -ForegroundColor Blue

# Get tenant ID
$TENANT_ID = (az account show --query tenantId -o tsv)
Write-Host "📋 Using tenant: $TENANT_ID" -ForegroundColor Blue

# Prompt for repository information
Write-Host ""
$GITHUB_REPO = Read-Host "📍 Enter your GitHub repository (format: owner/repo)"
$APP_NAME = Read-Host "📍 Enter your application name (default: ukg-sync-backend)"
if ([string]::IsNullOrEmpty($APP_NAME)) {
    $APP_NAME = "ukg-sync-backend"
}

# Create service principal
Write-Host ""
Write-Host "🔑 Creating service principal for GitHub Actions..." -ForegroundColor Blue
$SP_NAME = "$APP_NAME-github-actions"

# Create service principal with contributor role
$SP_OUTPUT = az ad sp create-for-rbac `
    --name "$SP_NAME" `
    --role contributor `
    --scopes "/subscriptions/$SUBSCRIPTION_ID" `
    --sdk-auth

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service principal created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create service principal" -ForegroundColor Red
    exit 1
}

# Extract values from service principal output
$SP_JSON = $SP_OUTPUT | ConvertFrom-Json
$CLIENT_ID = $SP_JSON.clientId
$CLIENT_SECRET = $SP_JSON.clientSecret

Write-Host ""
Write-Host "🔧 Setting up GitHub repository secrets..." -ForegroundColor Blue

# Set GitHub repository secrets
$SP_OUTPUT | gh secret set AZURE_CREDENTIALS --repo "$GITHUB_REPO"
$CLIENT_ID | gh secret set AZURE_CLIENT_ID --repo "$GITHUB_REPO"
$CLIENT_SECRET | gh secret set AZURE_CLIENT_SECRET --repo "$GITHUB_REPO"
$TENANT_ID | gh secret set AZURE_TENANT_ID --repo "$GITHUB_REPO"
$SUBSCRIPTION_ID | gh secret set AZURE_SUBSCRIPTION_ID --repo "$GITHUB_REPO"

Write-Host ""
Write-Host "🌍 Setting up GitHub repository variables..." -ForegroundColor Blue
"centralus" | gh variable set AZURE_LOCATION --repo "$GITHUB_REPO"

Write-Host ""
Write-Host "✅ GitHub Actions setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Yellow
Write-Host "   - Service Principal: $SP_NAME" -ForegroundColor White
Write-Host "   - Client ID: $CLIENT_ID" -ForegroundColor White
Write-Host "   - Subscription: $SUBSCRIPTION_ID" -ForegroundColor White
Write-Host "   - Tenant: $TENANT_ID" -ForegroundColor White
Write-Host "   - Repository: $GITHUB_REPO" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Go to your GitHub repository settings" -ForegroundColor White
Write-Host "   2. Navigate to Environments and create 'development' and 'production' environments" -ForegroundColor White
Write-Host "   3. Configure protection rules for production environment" -ForegroundColor White
Write-Host "   4. Push your code to trigger the deployment workflow" -ForegroundColor White
Write-Host ""
Write-Host "🔍 To verify the setup, run:" -ForegroundColor Yellow
Write-Host "   gh secret list --repo $GITHUB_REPO" -ForegroundColor White
Write-Host "   gh variable list --repo $GITHUB_REPO" -ForegroundColor White
