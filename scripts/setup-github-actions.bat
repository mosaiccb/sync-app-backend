@echo off
echo === GitHub Actions Setup for UKG Sync Backend (Windows Version) ===
echo.

REM Check if Azure CLI is installed
az --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Azure CLI is not installed. Please install it first:
    echo    https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

REM Login to Azure
echo 🔐 Logging in to Azure...
az login

REM Get subscription ID
echo 📋 Getting subscription information...
for /f "tokens=*" %%i in ('az account show --query id -o tsv') do set SUBSCRIPTION_ID=%%i
echo Using subscription: %SUBSCRIPTION_ID%

REM Get tenant ID
for /f "tokens=*" %%i in ('az account show --query tenantId -o tsv') do set TENANT_ID=%%i
echo Using tenant: %TENANT_ID%

REM Prompt for repository information
echo.
set /p GITHUB_REPO="📍 Enter your GitHub repository (format: owner/repo): "
set /p APP_NAME="📍 Enter your application name (default: ukg-sync-backend): "
if "%APP_NAME%"=="" set APP_NAME=ukg-sync-backend

REM Create service principal
echo.
echo 🔑 Creating service principal for GitHub Actions...
set SP_NAME=%APP_NAME%-github-actions

echo Creating service principal...
az ad sp create-for-rbac --name "%SP_NAME%" --role contributor --scopes "/subscriptions/%SUBSCRIPTION_ID%" --sdk-auth > sp-output.json

if %errorlevel% equ 0 (
    echo ✅ Service principal created successfully
) else (
    echo ❌ Failed to create service principal
    pause
    exit /b 1
)

REM Display instructions
echo.
echo ================================================
echo 🔧 COPY THESE SECRETS TO YOUR GITHUB REPOSITORY
echo ================================================
echo.
echo Go to: https://github.com/%GITHUB_REPO%/settings/secrets/actions
echo.
echo 1. AZURE_CREDENTIALS
echo -------------------
type sp-output.json
echo.
echo 2. AZURE_TENANT_ID
echo ------------------
echo %TENANT_ID%
echo.
echo 3. AZURE_SUBSCRIPTION_ID
echo ------------------------
echo %SUBSCRIPTION_ID%
echo.
echo ================================================
echo 🌍 COPY THESE VARIABLES TO YOUR GITHUB REPOSITORY
echo ================================================
echo.
echo Go to: https://github.com/%GITHUB_REPO%/settings/variables/actions
echo.
echo 1. AZURE_LOCATION
echo -----------------
echo centralus
echo.
echo ================================================
echo.
echo ✅ Service Principal setup completed!
echo.
echo 📋 Summary:
echo    - Service Principal: %SP_NAME%
echo    - Subscription: %SUBSCRIPTION_ID%
echo    - Tenant: %TENANT_ID%
echo    - Repository: %GITHUB_REPO%
echo.
echo 🔧 Next steps:
echo    1. Copy the secrets above to your GitHub repository
echo    2. Go to: https://github.com/%GITHUB_REPO%/settings/environments
echo    3. Create 'development' and 'production' environments
echo    4. Configure protection rules for production environment
echo    5. Push your code to trigger the deployment workflow
echo.
echo 💡 The AZURE_CREDENTIALS are saved in sp-output.json for easy copying
echo.

REM Save summary to file
echo GitHub Repository: %GITHUB_REPO% > setup-summary.txt
echo Service Principal: %SP_NAME% >> setup-summary.txt
echo. >> setup-summary.txt
echo === GitHub Secrets === >> setup-summary.txt
echo AZURE_CREDENTIALS: >> setup-summary.txt
type sp-output.json >> setup-summary.txt
echo. >> setup-summary.txt
echo AZURE_TENANT_ID: >> setup-summary.txt
echo %TENANT_ID% >> setup-summary.txt
echo. >> setup-summary.txt
echo AZURE_SUBSCRIPTION_ID: >> setup-summary.txt
echo %SUBSCRIPTION_ID% >> setup-summary.txt
echo. >> setup-summary.txt
echo === GitHub Variables === >> setup-summary.txt
echo AZURE_LOCATION: >> setup-summary.txt
echo centralus >> setup-summary.txt
echo. >> setup-summary.txt
echo === URLs === >> setup-summary.txt
echo Secrets: https://github.com/%GITHUB_REPO%/settings/secrets/actions >> setup-summary.txt
echo Variables: https://github.com/%GITHUB_REPO%/settings/variables/actions >> setup-summary.txt
echo Environments: https://github.com/%GITHUB_REPO%/settings/environments >> setup-summary.txt

echo 📄 All details saved to: setup-summary.txt
echo.
pause
