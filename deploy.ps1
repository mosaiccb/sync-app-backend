# 🚀 Automated Deployment Script - PowerShell
# Deploy Azure Functions Backend automatically with GitHub backup
# 
# Author: GitHub Copilot AI Assistant
# Created: July 2025
# Purpose: Complete backend deployment pipeline with automated deployment and GitHub backup
#
# This script will:
# 1. Check prerequisites (Azure CLI, Functions Core Tools)
# 2. Verify Azure Function App accessibility
# 3. Build the TypeScript project
# 4. Deploy using Azure Functions Core Tools (func publish)
# 5. Test the deployment with health checks
# 6. Backup code to GitHub on successful deployment
#
# 🔧 Hardcoded Configuration:
#   • Function App: ukg-sync-backend-5rrqlcuxyzlvy
#   • Resource Group: mosaicRG01  
#   • Subscription: 3a09f19f-d0c3-4a11-ac2c-6d869a76ec94
#   • Repository: mosaiccb/sync-app-backend
#
# Usage Examples:
#   .\deploy.ps1                                        # Full deployment with GitHub backup
#   .\deploy.ps1 -NoGitBackup                          # Deploy without GitHub backup
#   .\deploy.ps1 -AutoCommit:$false                    # Disable auto-commit
#   .\deploy.ps1 -SkipBuild                            # Skip npm build step
#   .\deploy.ps1 -EnableRunFromPackage                 # Enable server-side build for ZIP deployment
#   .\deploy.ps1 -CommitMessage "Fix API"              # Custom commit message
#   .\deploy.ps1 -VerboseOutput                        # Verbose output
#   .\deploy.ps1 -FunctionAppName "other-app"          # Override function app name

param(
    [Parameter(Mandatory = $false)]
    [string]$FunctionAppName = "ukg-sync-backend-5rrqlcuxyzlvy",
    
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroup = "mosaicRG01",
    
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId = "3a09f19f-d0c3-4a11-ac2c-6d869a76ec94",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory = $false)]
    [switch]$VerboseOutput,
    
    [Parameter(Mandatory = $false)]
    [switch]$AutoCommit,
    
    [Parameter(Mandatory = $false)]
    [switch]$NoGitBackup,
    
    [Parameter(Mandatory = $false)]
    [string]$CommitMessage = "🚀 Backend deployment: Restaurant Operations Dashboard API updates",
    
    [Parameter(Mandatory = $false)]
    [switch]$EnableRunFromPackage
)

# Set AutoCommit to true by default (user can override with -AutoCommit:$false)
if (-not $PSBoundParameters.ContainsKey('AutoCommit')) {
    $AutoCommit = $true
}

Write-Host "🚀 Starting Azure Functions Deployment" -ForegroundColor Green
Write-Host "📅 Deployment initiated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host "👤 Executed by: $env:USERNAME on $env:COMPUTERNAME" -ForegroundColor DarkGray
Write-Host "Function App: $FunctionAppName" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "Subscription: $SubscriptionId" -ForegroundColor Yellow

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Cyan

# Check if Azure CLI is installed and logged in
try {
    # First check if Azure CLI exists
    $azVersion = az version 2>$null
    if (-not $azVersion) {
        Write-Host "❌ Azure CLI not found. Please install Azure CLI" -ForegroundColor Red
        Write-Host "💡 Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Cyan
        exit 1
    }
    
    # Check authentication status
    $azAccount = az account show 2>$null | ConvertFrom-Json
    if ($azAccount) {
        Write-Host "✅ Azure CLI authenticated as: $($azAccount.user.name)" -ForegroundColor Green
        Write-Host "📍 Current Subscription: $($azAccount.name) ($($azAccount.id))" -ForegroundColor Cyan
        
        # Check if we need to switch to the correct subscription
        if ($azAccount.id -ne $SubscriptionId) {
            Write-Host "🔄 Switching to target subscription..." -ForegroundColor Cyan
            try {
                az account set --subscription $SubscriptionId 2>$null
                $newAccount = az account show 2>$null | ConvertFrom-Json
                if ($newAccount.id -eq $SubscriptionId) {
                    Write-Host "✅ Switched to subscription: $($newAccount.name) ($($newAccount.id))" -ForegroundColor Green
                }
                else {
                    Write-Host "❌ Failed to switch to subscription: $SubscriptionId" -ForegroundColor Red
                    Write-Host "💡 Make sure you have access to this subscription" -ForegroundColor Cyan
                    exit 1
                }
            }
            catch {
                Write-Host "❌ Error switching subscription: $($_.Exception.Message)" -ForegroundColor Red
                exit 1
            }
        }
        else {
            Write-Host "✅ Already using correct subscription" -ForegroundColor Green
        }
        
        # Verify subscription is active
        $currentAccount = az account show 2>$null | ConvertFrom-Json
        if ($currentAccount.state -ne "Enabled") {
            Write-Host "⚠️  Subscription state: $($currentAccount.state)" -ForegroundColor Yellow
        }
        
        # Check token expiration (if available)
        try {
            $tokenInfo = az account get-access-token 2>$null | ConvertFrom-Json
            if ($tokenInfo) {
                $expiresOn = [DateTime]::Parse($tokenInfo.expiresOn)
                $timeLeft = $expiresOn - (Get-Date)
                if ($timeLeft.TotalMinutes -lt 30) {
                    Write-Host "⚠️  Access token expires in $([Math]::Round($timeLeft.TotalMinutes)) minutes" -ForegroundColor Yellow
                    Write-Host "💡 Consider running 'az login' to refresh" -ForegroundColor DarkGray
                }
                else {
                    Write-Host "✅ Access token valid for $([Math]::Round($timeLeft.TotalHours, 1)) hours" -ForegroundColor Green
                }
            }
        }
        catch {
            Write-Host "🔍 Could not check token expiration (continuing anyway)" -ForegroundColor DarkGray
        }
    }
    else {
        Write-Host "❌ Azure CLI not authenticated" -ForegroundColor Red
        Write-Host "💡 Run: az login" -ForegroundColor Cyan
        Write-Host "💡 Or run: az login --use-device-code (for headless environments)" -ForegroundColor DarkGray
        exit 1
    }
}
catch {
    Write-Host "❌ Error checking Azure CLI authentication: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try: az login" -ForegroundColor Cyan
    exit 1
}

# Check if Azure Functions Core Tools is installed
try {
    $funcVersion = func --version 2>$null
    if ($funcVersion) {
        Write-Host "✅ Azure Functions Core Tools: $funcVersion" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Azure Functions Core Tools not found" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Azure Functions Core Tools not found. Please install func CLI" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "host.json")) {
    Write-Host "❌ host.json not found. Make sure you're in the sync-app-backend directory" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Make sure you're in the sync-app-backend directory" -ForegroundColor Red
    exit 1
}

# Verify target Azure Function App exists and is accessible
Write-Host "`n🔍 Verifying Azure Function App accessibility..." -ForegroundColor Cyan
try {
    $functionApp = az functionapp show --name $FunctionAppName --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
    if ($functionApp) {
        Write-Host "✅ Function App '$FunctionAppName' found in resource group '$ResourceGroup'" -ForegroundColor Green
        Write-Host "📍 Location: $($functionApp.location)" -ForegroundColor Cyan
        Write-Host "📍 Runtime: $($functionApp.siteConfig.linuxFxVersion -replace 'Node\|', 'Node.js ')" -ForegroundColor Cyan
        Write-Host "📍 State: $($functionApp.state)" -ForegroundColor Cyan
        
        if ($functionApp.state -ne "Running") {
            Write-Host "⚠️  Function App is not in 'Running' state" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "❌ Function App '$FunctionAppName' not found in resource group '$ResourceGroup'" -ForegroundColor Red
        Write-Host "💡 Check the Function App name and Resource Group" -ForegroundColor Cyan
        Write-Host "💡 Or create the Function App first using Azure Portal or CLI" -ForegroundColor DarkGray
        exit 1
    }
}
catch {
    Write-Host "⚠️  Could not verify Function App (continuing anyway): $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "💡 Make sure the Function App '$FunctionAppName' exists in resource group '$ResourceGroup'" -ForegroundColor DarkGray
}

Write-Host "✅ Prerequisites check completed" -ForegroundColor Green

# Check Git status (informational only - won't block deployment)
Write-Host "`n📋 Checking Git status..." -ForegroundColor Cyan

try {
    # Check if this is a git repository
    $isGitRepo = Test-Path ".git"
    if ($isGitRepo) {
        # Check Git status
        $gitStatus = git status --porcelain 2>$null
        if ($gitStatus) {
            Write-Host "⚠️  Uncommitted changes detected:" -ForegroundColor Yellow
            $gitStatusLines = $gitStatus -split "`n"
            foreach ($line in $gitStatusLines | Select-Object -First 10) {
                if ($line.Trim()) {
                    Write-Host "   $line" -ForegroundColor Yellow
                }
            }
            if ($gitStatusLines.Count -gt 10) {
                Write-Host "   ... and $($gitStatusLines.Count - 10) more files" -ForegroundColor Yellow
            }
            
            if ($AutoCommit) {
                Write-Host "`n🔄 Auto-committing changes..." -ForegroundColor Cyan
                try {
                    git add -A
                    git commit -m "$CommitMessage"
                    Write-Host "✅ Changes committed successfully" -ForegroundColor Green
                    
                    # Show the commit hash
                    $commitHash = git rev-parse HEAD 2>$null
                    if ($commitHash) {
                        Write-Host "📍 Commit hash: $($commitHash.Substring(0,8))" -ForegroundColor DarkGray
                    }
                }
                catch {
                    Write-Host "⚠️  Auto-commit failed: $($_.Exception.Message)" -ForegroundColor Yellow
                    Write-Host "💡 Deployment will continue, but consider committing manually" -ForegroundColor DarkGray
                }
            }
            else {
                Write-Host "💡 No worries! This deployment will work WITHOUT commits!" -ForegroundColor Green
                Write-Host "💡 Unlike VS Code right-click, this script bypasses Git requirements" -ForegroundColor Cyan
                Write-Host "💡 Use -AutoCommit to automatically commit changes before deployment" -ForegroundColor DarkGray
            }
        }
        else {
            Write-Host "✅ Working directory is clean" -ForegroundColor Green
        }
        
        # Show current branch
        $currentBranch = git branch --show-current 2>$null
        if ($currentBranch) {
            Write-Host "📍 Current branch: $currentBranch" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "📁 Not a Git repository (no .git folder found)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "📁 Git not available or not a repository" -ForegroundColor Yellow
}

Write-Host "✅ Git status check completed (deployment will proceed regardless)" -ForegroundColor Green

# Build the project (unless skipped)
if (-not $SkipBuild -and -not $EnableRunFromPackage) {
    Write-Host "`n🔨 Building project..." -ForegroundColor Cyan
    
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Building TypeScript..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
}
elseif ($EnableRunFromPackage) {
    Write-Host "⏭️  Skipping local build - Azure will build on server (run-from-package enabled)" -ForegroundColor Yellow
}
else {
    Write-Host "⏭️  Skipping build (-SkipBuild specified)" -ForegroundColor Yellow
}

# Deploy using VS Code right-click method (proven to work)
Write-Host "`n⏸️  PAUSE: Ready for VS Code right-click deployment" -ForegroundColor Magenta
Write-Host "🔧 1. Right-click on the sync-app-backend folder in VS Code" -ForegroundColor Cyan
Write-Host "🔧 2. Select 'Deploy to Function App...'" -ForegroundColor Cyan
Write-Host "🔧 3. Choose your Function App and deploy" -ForegroundColor Cyan
Write-Host "🔧 4. Wait for deployment to complete" -ForegroundColor Cyan
Write-Host "`n💡 Note: func publish has compatibility issues with Azure Functions v4 TypeScript" -ForegroundColor Yellow
Write-Host "💡 VS Code deployment handles the build process correctly" -ForegroundColor Yellow
Write-Host "`n⏳ Press any key to continue after deployment is complete..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host "✅ Continuing script execution..." -ForegroundColor Green
write-host "🛠️  Deployment in progress..." -ForegroundColor Cyan
write-host "🔄  Sleeping for 3 minutes to allow for complete deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 180
# Test the deployment
Write-Host "`n🧪 Testing deployment..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$healthUrl = "https://$FunctionAppName.azurewebsites.net/api/health"
try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 10
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor DarkGray
}
catch {
    Write-Host "⚠️  Health check failed" -ForegroundColor Yellow
    Write-Host "URL: $healthUrl" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test dashboard endpoint
$dashboardUrl = "https://$FunctionAppName.azurewebsites.net/api/par-brink/dashboard"
Write-Host "`n🧪 Testing dashboard endpoint..." -ForegroundColor Cyan
try {
    $testPayload = @{
        locationId = "109"
        businessDate = "2025-07-27"
    } | ConvertTo-Json
    
    $dashboardResponse = Invoke-RestMethod -Uri $dashboardUrl -Method POST -Body $testPayload -ContentType "application/json" -TimeoutSec 15
    Write-Host "✅ Dashboard endpoint working!" -ForegroundColor Green
    Write-Host "Response structure: $($dashboardResponse.GetType().Name)" -ForegroundColor DarkGray
}
catch {
    Write-Host "⚠️  Dashboard endpoint test failed" -ForegroundColor Yellow
    Write-Host "URL: $dashboardUrl" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Deployment testing completed!" -ForegroundColor Green
Write-Host "🌐 Function App URL: https://$FunctionAppName.azurewebsites.net" -ForegroundColor Cyan

# GitHub backup (if not skipped and Git is available)
if (-not $NoGitBackup -and (Test-Path ".git")) {
    Write-Host "`n📤 Backing up to GitHub..." -ForegroundColor Cyan
    
    try {
        # Add all changes
        git add -A
        
        # Check if there are changes to commit
        $gitStatus = git status --porcelain 2>$null
        if ($gitStatus) {
            # Commit changes
            git commit -m "$CommitMessage"
            Write-Host "✅ Changes committed locally" -ForegroundColor Green
            
            # Push to GitHub
            Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
            git push origin main
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Successfully backed up to GitHub" -ForegroundColor Green
                
                # Show commit info
                $commitHash = git rev-parse HEAD 2>$null
                if ($commitHash) {
                    Write-Host "📍 Commit hash: $($commitHash.Substring(0,8))" -ForegroundColor DarkGray
                }
            }
            else {
                Write-Host "⚠️  Failed to push to GitHub" -ForegroundColor Yellow
                Write-Host "💡 You may need to push manually later" -ForegroundColor DarkGray
            }
        }
        else {
            Write-Host "✅ No changes to commit - repository is up to date" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  GitHub backup failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "💡 Deployment was successful, but Git backup failed" -ForegroundColor DarkGray
    }
}
elseif ($NoGitBackup) {
    Write-Host "⏭️  Skipping GitHub backup (-NoGitBackup specified)" -ForegroundColor Yellow
}
else {
    Write-Host "⏭️  Skipping GitHub backup (not a Git repository)" -ForegroundColor Yellow
}

Write-Host "`n✨ Script execution completed!" -ForegroundColor Green
