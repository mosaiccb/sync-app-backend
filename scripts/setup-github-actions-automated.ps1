# GitHub Actions Auto-Setup Script (PowerShell with GitHub CLI)
# This script automatically creates Azure service principal and sets GitHub secrets

Write-Host "=== Automated GitHub Actions Setup for UKG Sync Backend ===" -ForegroundColor Green
Write-Host ""

# Add GitHub CLI to PATH for this session
$env:PATH += ";C:\Program Files\GitHub CLI"

# Check if GitHub CLI exists
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI not found. Please install GitHub CLI first:" -ForegroundColor Red
    Write-Host "   https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Check GitHub authentication
Write-Host "🔐 Checking GitHub authentication..." -ForegroundColor Blue
try {
    gh auth status 2>$null
    Write-Host "✅ GitHub authentication verified" -ForegroundColor Green
} catch {
    Write-Host "🔑 Please authenticate with GitHub..." -ForegroundColor Yellow
    gh auth login
}

Write-Host ""

# Login to Azure
Write-Host "🔐 Logging in to Azure..." -ForegroundColor Blue
az login

# Get subscription ID
$SUBSCRIPTION_ID = az account show --query id -o tsv
Write-Host "📋 Using subscription: $SUBSCRIPTION_ID" -ForegroundColor Cyan

# Get tenant ID
$TENANT_ID = az account show --query tenantId -o tsv
Write-Host "📋 Using tenant: $TENANT_ID" -ForegroundColor Cyan

# Get current repository info
Write-Host "📋 Getting repository information..." -ForegroundColor Blue
try {
    $remoteUrl = git config --get remote.origin.url
    if ($remoteUrl -match "github.com[:/]([^/]+/[^/]+?)(?:\.git)?/?$") {
        $GITHUB_REPO = $matches[1]
        Write-Host "📋 Repository: $GITHUB_REPO" -ForegroundColor Cyan
    } else {
        throw "Could not parse repository URL"
    }
} catch {
    Write-Host "⚠️  Could not auto-detect repository. Using default: mosaiccb/sync-app-backend" -ForegroundColor Yellow
    $GITHUB_REPO = "mosaiccb/sync-app-backend"
}

# Prompt for application name
$APP_NAME = Read-Host "📍 Enter your application name (default: ukg-sync-backend)"
if ([string]::IsNullOrWhiteSpace($APP_NAME)) {
    $APP_NAME = "ukg-sync-backend"
}

# Create service principal
Write-Host ""
Write-Host "🔑 Creating service principal for GitHub Actions..." -ForegroundColor Blue
$SP_NAME = "$APP_NAME-github-actions"

# Create service principal with contributor role
Write-Host "Creating service principal..." -ForegroundColor Yellow
$SP_OUTPUT = az ad sp create-for-rbac `
    --name "$SP_NAME" `
    --role contributor `
    --scopes "/subscriptions/$SUBSCRIPTION_ID" `
    --query "{clientId: appId, clientSecret: password, subscriptionId: subscriptionId, tenantId: tenant, activeDirectoryEndpointUrl: \`"https://login.microsoftonline.com\`", resourceManagerEndpointUrl: \`"https://management.azure.com/\`", activeDirectoryGraphResourceId: \`"https://graph.windows.net/\`", sqlManagementEndpointUrl: \`"https://management.core.windows.net:8443/\`", galleryEndpointUrl: \`"https://gallery.azure.com/\`", managementEndpointUrl: \`"https://management.core.windows.net/\`"}" `
    --output json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service principal created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create service principal" -ForegroundColor Red
    exit 1
}

# Parse the JSON output
$SP_DATA = $SP_OUTPUT | ConvertFrom-Json
$CLIENT_ID = $SP_DATA.clientId
$CLIENT_SECRET = $SP_DATA.clientSecret

# Create properly formatted AZURE_CREDENTIALS JSON
$AZURE_CREDENTIALS = @{
    clientId = $CLIENT_ID
    clientSecret = $CLIENT_SECRET
    subscriptionId = $SUBSCRIPTION_ID
    tenantId = $TENANT_ID
    activeDirectoryEndpointUrl = "https://login.microsoftonline.com"
    resourceManagerEndpointUrl = "https://management.azure.com/"
    activeDirectoryGraphResourceId = "https://graph.windows.net/"
    sqlManagementEndpointUrl = "https://management.core.windows.net:8443/"
    galleryEndpointUrl = "https://gallery.azure.com/"
    managementEndpointUrl = "https://management.core.windows.net/"
} | ConvertTo-Json -Compress

Write-Host ""
Write-Host "🔧 Setting GitHub repository secrets..." -ForegroundColor Blue

# Set secrets using GitHub CLI
Write-Host "Setting AZURE_CREDENTIALS..." -ForegroundColor Yellow
$AZURE_CREDENTIALS | gh secret set AZURE_CREDENTIALS --repo $GITHUB_REPO

Write-Host "Setting AZURE_CLIENT_ID..." -ForegroundColor Yellow
$CLIENT_ID | gh secret set AZURE_CLIENT_ID --repo $GITHUB_REPO

Write-Host "Setting AZURE_CLIENT_SECRET..." -ForegroundColor Yellow
$CLIENT_SECRET | gh secret set AZURE_CLIENT_SECRET --repo $GITHUB_REPO

Write-Host "Setting AZURE_TENANT_ID..." -ForegroundColor Yellow
$TENANT_ID | gh secret set AZURE_TENANT_ID --repo $GITHUB_REPO

Write-Host "Setting AZURE_SUBSCRIPTION_ID..." -ForegroundColor Yellow
$SUBSCRIPTION_ID | gh secret set AZURE_SUBSCRIPTION_ID --repo $GITHUB_REPO

Write-Host ""
Write-Host "🌍 Setting GitHub repository variables..." -ForegroundColor Blue

# Set variables using GitHub CLI
Write-Host "Setting AZURE_LOCATION..." -ForegroundColor Yellow
"centralus" | gh variable set AZURE_LOCATION --repo $GITHUB_REPO

Write-Host ""
Write-Host "🎯 Creating GitHub environments..." -ForegroundColor Blue

# Create environments
Write-Host "Creating development environment..." -ForegroundColor Yellow
gh api repos/$GITHUB_REPO/environments/development --method PUT

Write-Host "Creating production environment..." -ForegroundColor Yellow
gh api repos/$GITHUB_REPO/environments/production --method PUT

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ AUTOMATED SETUP COMPLETED!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - Service Principal: $SP_NAME" -ForegroundColor White
Write-Host "   - Client ID: $CLIENT_ID" -ForegroundColor White
Write-Host "   - Subscription: $SUBSCRIPTION_ID" -ForegroundColor White
Write-Host "   - Tenant: $TENANT_ID" -ForegroundColor White
Write-Host "   - Repository: $GITHUB_REPO" -ForegroundColor White
Write-Host ""
Write-Host "🎯 What was set automatically:" -ForegroundColor Cyan
Write-Host "   ✅ GitHub Secrets:" -ForegroundColor Green
Write-Host "       - AZURE_CREDENTIALS" -ForegroundColor White
Write-Host "       - AZURE_CLIENT_ID" -ForegroundColor White
Write-Host "       - AZURE_CLIENT_SECRET" -ForegroundColor White
Write-Host "       - AZURE_TENANT_ID" -ForegroundColor White
Write-Host "       - AZURE_SUBSCRIPTION_ID" -ForegroundColor White
Write-Host "   ✅ GitHub Variables:" -ForegroundColor Green
Write-Host "       - AZURE_LOCATION (centralus)" -ForegroundColor White
Write-Host "   ✅ GitHub Environments:" -ForegroundColor Green
Write-Host "       - development" -ForegroundColor White
Write-Host "       - production" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Push your code to trigger the GitHub Actions workflow" -ForegroundColor White
Write-Host "   2. Monitor the deployment at: https://github.com/$GITHUB_REPO/actions" -ForegroundColor White
Write-Host "   3. Your app will be deployed automatically!" -ForegroundColor White
Write-Host ""
Write-Host "💡 All details saved to: automated-setup-output.txt" -ForegroundColor Yellow

# Save output to file
$outputContent = @"
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
"@

$outputContent | Out-File -FilePath "automated-setup-output.txt" -Encoding UTF8
Write-Host "📄 Setup details saved to: automated-setup-output.txt" -ForegroundColor Green
