# 🚀 Automated Deployment Script - PowerShell
# Deploy Azure Functions Backend automatically
# 
# Author: GitHub Copilot AI Assistant
# Created: July 2025
# Purpose: Automated deployment bypassing VS Code Git requirements
#
# Unlike VS Code right-click deployment, this script DOES NOT require commits!
# It uses Azure Functions Core Tools and Azure CLI directly, bypassing VS Code's Git requirements.
#
# 🔧 Hardcoded Configuration:
#   • Function App: ukg-sync-backend-5rrqlcuxyzlvy
#   • Resource Group: mosaicRG01  
#   • Subscription: 3a09f19f-d0c3-4a11-ac2c-6d869a76ec94
#
# Usage Examples:
#   .\deploy.ps1                                        # Basic deployment with hardcoded settings
#   .\deploy.ps1 -AutoCommit                           # Auto-commit with tracking message
#   .\deploy.ps1 -SkipBuild                            # Skip npm build step
#   .\deploy.ps1 -EnableRunFromPackage                 # Enable server-side build for ZIP deployment
#   .\deploy.ps1 -AutoCommit -CommitMessage "Fix API"  # Custom commit message
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
    [string]$CommitMessage = "🚀 Auto-deploy: Azure Functions update via PowerShell script",
    
    [Parameter(Mandatory = $false)]
    [switch]$EnableRunFromPackage
)

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
                Write-Host "`n� Auto-committing changes..." -ForegroundColor Cyan
                try {
                    git add -A
                    git commit -m "$CommitMessage"
                    Write-Host "✅ Changes committed successfully" -ForegroundColor Green
                }
                catch {
                    Write-Host "⚠️  Auto-commit failed, but deployment will continue" -ForegroundColor Yellow
                }
            }
            else {
                Write-Host "�� No worries! This deployment will work WITHOUT commits!" -ForegroundColor Green
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

# Pause for manual VS Code right-click deployment
Write-Host "`n⏸️  PAUSE: Ready for VS Code right-click deployment" -ForegroundColor Magenta
Write-Host "🔧 1. Right-click on the sync-app-backend folder in VS Code" -ForegroundColor Cyan
Write-Host "🔧 2. Select 'Deploy to Function App...'" -ForegroundColor Cyan
Write-Host "🔧 3. Choose your Function App and deploy" -ForegroundColor Cyan
Write-Host "🔧 4. Wait for deployment to complete" -ForegroundColor Cyan
Write-Host "⏳ Press any key to continue after deployment is complete..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host "✅ Continuing script execution..." -ForegroundColor Green

# Method 1: Try Azure Functions Core Tools deployment
Write-Host "`n🚀 Attempting deployment with Azure Functions Core Tools..." -ForegroundColor Cyan

# Disable WEBSITE_RUN_FROM_PACKAGE for func publish (works better with pre-built files)
if (-not $EnableRunFromPackage) {
    Write-Host "🔧 Checking WEBSITE_RUN_FROM_PACKAGE setting..." -ForegroundColor Cyan
    try {
        $currentSettings = az functionapp config appsettings list --resource-group $ResourceGroup --name $FunctionAppName --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value" --output tsv 2>$null
        if ($currentSettings -eq "1") {
            Write-Host "🔄 Disabling WEBSITE_RUN_FROM_PACKAGE (will trigger app restart)..." -ForegroundColor Yellow
            az functionapp config appsettings set --resource-group $ResourceGroup --name $FunctionAppName --settings WEBSITE_RUN_FROM_PACKAGE="0" --output none
            Write-Host "✅ WEBSITE_RUN_FROM_PACKAGE disabled - using pre-built files" -ForegroundColor Green
            Write-Host "⏳ Waiting for Azure infrastructure to propagate changes..." -ForegroundColor DarkGray
            Write-Host "   🔄 30 seconds for setting propagation + app restart..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 30
            
            # Verify the setting took effect
            Write-Host "   🔍 Verifying setting propagation..." -ForegroundColor DarkGray
            $verifySettings = az functionapp config appsettings list --resource-group $ResourceGroup --name $FunctionAppName --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value" --output tsv 2>$null
            if ($verifySettings -eq "0" -or [string]::IsNullOrEmpty($verifySettings)) {
                Write-Host "   ✅ Verified: WEBSITE_RUN_FROM_PACKAGE is disabled" -ForegroundColor Green
            }
            else {
                Write-Host "   ⚠️  Setting may not have propagated yet (current: $verifySettings)" -ForegroundColor Yellow
            }
            
            Write-Host "   ✅ Wait completed - deployment should now use correct mode" -ForegroundColor Green
        }
        elseif ($currentSettings -eq "0" -or [string]::IsNullOrEmpty($currentSettings)) {
            Write-Host "✅ WEBSITE_RUN_FROM_PACKAGE already disabled" -ForegroundColor Green
        }
        else {
            Write-Host "✅ WEBSITE_RUN_FROM_PACKAGE current value: $currentSettings" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Failed to check/set WEBSITE_RUN_FROM_PACKAGE, continuing anyway..." -ForegroundColor Yellow
    }
}

try {
    if ($VerboseOutput) {
        func azure functionapp publish $FunctionAppName --verbose
    }
    else {
        func azure functionapp publish $FunctionAppName
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful with func publish!" -ForegroundColor Green
        
        # Test the deployment
        Write-Host "`n🧪 Testing deployment..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        
        $healthUrl = "https://$FunctionAppName.azurewebsites.net/api/health"
        try {
            $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 10
            Write-Host "✅ Health check passed" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️  Health check failed, but deployment may still be successful" -ForegroundColor Yellow
            Write-Host "URL: $healthUrl" -ForegroundColor Yellow
        }
        
        Write-Host "`n🎉 Deployment completed successfully!" -ForegroundColor Green
        Write-Host "🌐 Function App URL: https://$FunctionAppName.azurewebsites.net" -ForegroundColor Cyan
        Write-Host "🔍 Admin Functions: https://$FunctionAppName.azurewebsites.net/admin/functions" -ForegroundColor Cyan
        
        exit 0
    }
}
catch {
    Write-Host "⚠️  func publish failed, trying ZIP deployment method..." -ForegroundColor Yellow
}

# Method 2: ZIP deployment fallback
Write-Host "`n📦 Attempting ZIP deployment..." -ForegroundColor Cyan

# Enable WEBSITE_RUN_FROM_PACKAGE if requested
if ($EnableRunFromPackage) {
    Write-Host "🔧 Checking WEBSITE_RUN_FROM_PACKAGE setting..." -ForegroundColor Cyan
    try {
        $currentSettings = az functionapp config appsettings list --resource-group $ResourceGroup --name $FunctionAppName --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value" --output tsv 2>$null
        if ($currentSettings -ne "1") {
            Write-Host "🔄 Enabling WEBSITE_RUN_FROM_PACKAGE (will trigger app restart)..." -ForegroundColor Yellow
            az functionapp config appsettings set --resource-group $ResourceGroup --name $FunctionAppName --settings WEBSITE_RUN_FROM_PACKAGE="1" --output none
            Write-Host "✅ WEBSITE_RUN_FROM_PACKAGE enabled - Azure will build TypeScript on server" -ForegroundColor Green
            Write-Host "⏳ Waiting for Azure infrastructure to propagate changes..." -ForegroundColor DarkGray
            Write-Host "   🔄 30 seconds for setting propagation + app restart..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 30
            Write-Host "   ✅ Wait completed - deployment should now use server-side build" -ForegroundColor Green
        }
        else {
            Write-Host "✅ WEBSITE_RUN_FROM_PACKAGE already enabled" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Failed to check/set WEBSITE_RUN_FROM_PACKAGE, continuing anyway..." -ForegroundColor Yellow
    }
}

try {
    # Create deployment package
    $deploymentZip = "deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    Write-Host "Creating deployment package: $deploymentZip" -ForegroundColor Yellow
    
    # Compress the files (excluding node_modules, .git, etc.)
    $excludePatterns = @("node_modules", ".git", "*.zip", "deployment*.zip", ".vscode", "*.log")
    
    # Use PowerShell compression
    $compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    # Get all files except excluded patterns
    $filesToZip = Get-ChildItem -Recurse | Where-Object {
        $file = $_
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($file.FullName -like "*$pattern*") {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    }
    
    Write-Host "Compressing $($filesToZip.Count) files..." -ForegroundColor Yellow
    Compress-Archive -Path $filesToZip -DestinationPath $deploymentZip -CompressionLevel $compressionLevel
    
    # Deploy via Azure CLI
    Write-Host "Uploading to Azure..." -ForegroundColor Yellow
    az functionapp deployment source config-zip --resource-group $ResourceGroup --name $FunctionAppName --src $deploymentZip
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ZIP deployment successful!" -ForegroundColor Green
        
        # Cleanup
        Remove-Item $deploymentZip -Force
        
        # Test the deployment
        Write-Host "`n🧪 Testing deployment..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
        
        $healthUrl = "https://$FunctionAppName.azurewebsites.net/api/health"
        try {
            $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 15
            Write-Host "✅ Health check passed" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️  Health check failed, but deployment may still be successful" -ForegroundColor Yellow
            Write-Host "URL: $healthUrl" -ForegroundColor Yellow
        }
        
        Write-Host "`n🎉 ZIP Deployment completed successfully!" -ForegroundColor Green
        Write-Host "🌐 Function App URL: https://$FunctionAppName.azurewebsites.net" -ForegroundColor Cyan
        Write-Host "🔍 Admin Functions: https://$FunctionAppName.azurewebsites.net/admin/functions" -ForegroundColor Cyan
        
    }
    else {
        Write-Host "❌ ZIP deployment failed" -ForegroundColor Red
        exit 1
    }
    
}
catch {
    Write-Host "❌ ZIP deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ All deployment methods completed!" -ForegroundColor Green
