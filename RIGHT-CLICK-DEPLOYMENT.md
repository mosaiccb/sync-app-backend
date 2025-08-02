# Right-Click Deployment Troubleshooting Guide

## 🎯 Overview

This document covers the complete troubleshooting process for VS Code right-click deployment issues with Azure Functions TypeScript projects.

## 🚨 Common Issues and Solutions

### Issue 1: "Failed to get status of deployment"

**Symptoms:**

```
6:01:13 PM: WARNING: Ignoring preDeployTask "npm prune (functions)" for non-zip deploy.
6:01:14 PM: WARNING: Ignoring postDeployTask "npm install (functions)" for non-zip deploy.
6:01:15 PM ukg-sync-backend-5rrqlcuxyzlvy: Deploying Local Git repository to "{resourceName}"...
6:02:16 PM: Error: Failed to get status of deployment.
```

**Root Cause:** VS Code cannot properly read deployment status from Azure, but the deployment often succeeds anyway.

**Solution:** This is primarily a status reporting issue - check Azure Deployment Center logs to verify if deployment actually succeeded.

### Issue 2: TypeScript Compilation Failures During Deployment

**Symptoms:**

```
Command: npm run build
'tsc' is not recognized as an internal or external command
```

**Root Cause:** Azure Function App doesn't have TypeScript installed for server-side builds.

**Initial Attempted Fix (Not Recommended):**

- Moving TypeScript to `dependencies` instead of `devDependencies`
- Creating `.deployment` file with `npm install && npm run build`

**Better Solution:** Disable server-side builds entirely (see Issue 3).

### Issue 3: Slow Deployment Times

**Symptoms:**

- Deployments taking 5+ minutes
- Unnecessary TypeScript compilation on Azure
- Double work (local build + server build)

**Root Cause:** `SCM_DO_BUILD_DURING_DEPLOYMENT=true` causes Azure to rebuild code that's already compiled locally.

**✅ RECOMMENDED SOLUTION:**

1. **Disable server-side builds:**

```bash
az functionapp config appsettings set --name <function-app-name> --resource-group <resource-group> --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false
```

2. **Remove build commands:**

```bash
az functionapp config appsettings delete --name <function-app-name> --resource-group <resource-group> --setting-names POST_BUILD_COMMAND
```

3. **Restart Function App:**

```bash
az functionapp restart --name <function-app-name> --resource-group <resource-group>
```

## 🏆 Final Working Configuration

### Azure Function App Settings:

```
SCM_DO_BUILD_DURING_DEPLOYMENT = false
POST_BUILD_COMMAND = (removed)
WEBSITE_ZIP_DEPLOYMENT_USE_CACHE = 0
```

### Local Development Workflow:

1. **Build locally:** `npm run build`
2. **Right-click deploy:** VS Code → sync-app-backend → "Deploy to Function App..."
3. **Azure copies pre-built files** from `lib/` folder

### Deployment Process (Fast):

```
Right-click deploy →
Git push to Azure →
Azure copies pre-built .js files from lib/ →
Done! (30-60 seconds)
```

## 🔍 Verification Steps

### Check if deployment worked despite VS Code errors:

1. **Test health endpoint:**

```powershell
Invoke-RestMethod -Uri "https://<function-app-name>.azurewebsites.net/api/health" -Method GET
```

2. **Check Azure Deployment Center logs:**

   - Go to Azure Portal → Function App → Deployment Center
   - Look for successful file copying like:

   ```
   Copying file: 'lib\functions\parBrinkDashboard.js'
   Copying file: 'lib\functions\health.js'
   ```

3. **Verify functions are deployed:**

```bash
az functionapp function list --name <function-app-name> --resource-group <resource-group> --output table
```

## 📊 Performance Comparison

| Method         | Time          | Description                         |
| -------------- | ------------- | ----------------------------------- |
| **Before Fix** | 5-10 minutes  | Azure builds TypeScript from source |
| **After Fix**  | 30-60 seconds | Azure copies pre-built JavaScript   |

## 🛠️ Project Configuration

### Required Local Files:

- **`lib/` folder:** Contains compiled JavaScript (from `npm run build`)
- **`tsconfig.json`:** TypeScript compilation configuration
- **`.gitignore`:** Should NOT ignore `lib/` folder for deployment

### VS Code Settings (`.vscode/settings.json`):

```json
{
  "azureFunctions.deploySubpath": "sync-app-backend",
  "azureFunctions.projectLanguage": "TypeScript",
  "azureFunctions.projectRuntime": "~4",
  "azureFunctions.preDeployTask": "",
  "azureFunctions.postDeployTask": "",
  "azureFunctions.scmDoBuildDuringDeployment": false,
  "azureFunctions.enableZipDeploy": false
}
```

## 📝 Troubleshooting Checklist

### Before Deployment:

- [ ] Run `npm run build` locally
- [ ] Verify `lib/functions/*.js` files exist
- [ ] Check that `SCM_DO_BUILD_DURING_DEPLOYMENT=false`

### During Deployment:

- [ ] Monitor VS Code output (ignore status errors)
- [ ] Check Azure Deployment Center for actual progress
- [ ] Look for file copying messages (not build messages)

### After Deployment:

- [ ] Test function endpoints
- [ ] Check function logs in Azure
- [ ] Verify latest code changes are deployed

## 🎯 Key Lessons Learned

1. **"Failed to get status" is usually just a reporting issue** - deployment often succeeds
2. **Pre-built deployments are much faster** than server-side builds
3. **Azure Deployment Center logs** are more reliable than VS Code deployment output
4. **Local build + deploy** is more efficient than remote build
5. **TypeScript should stay in devDependencies** when using pre-built deployment

## 📚 Related Documentation

- [Azure Functions TypeScript Developer Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Functions Deployment Technologies](https://docs.microsoft.com/en-us/azure/azure-functions/functions-deployment-technologies)
- [VS Code Azure Functions Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)

## 🔄 Quick Reference Commands

```bash
# Check deployment settings
az functionapp config appsettings list --name <function-app-name> --resource-group <resource-group>

# Disable server-side builds (recommended)
az functionapp config appsettings set --name <function-app-name> --resource-group <resource-group> --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false

# Test deployment
Invoke-RestMethod -Uri "https://<function-app-name>.azurewebsites.net/api/health"

# Local build before deployment
npm run build
```

## ✅ **Deployment Success Confirmation**

**Latest Deployment:** August 1, 2025 @ 19:19 UTC  
**Status:** ✅ **SUCCESSFUL** - All timezone alignment fixes working correctly

### Verified Working Features:

- ✅ **Timezone Conversion:** UTC correctly converting to Mountain Time
- ✅ **Precise Overlap Math:** Fractional hour calculations (0.002, 0.895, etc.)
- ✅ **Single Shift Records:** No double-counting from IN/OUT punches
- ✅ **Labor Cost Distribution:** Accurate hourly rates and cost calculations
- ✅ **Debug Logging:** Comprehensive timezone and overlap debugging

### Sample Working Log Output:

```
🔍 TIMEZONE DEBUG: UTC: 2025-08-01T22:59:53.091Z (22:00) → MT Hour: 16:00
Hourly employee at 16:00: 0.002 overlap hours (of 2.333 total), $14.75/hour = $0.03
Hourly employee at 17:00: 1.000 overlap hours (of 2.333 total), $14.75/hour = $14.75
```

The labor alignment issue has been **completely resolved**! 🎯

---

**Created:** August 1, 2025  
**Last Updated:** August 1, 2025  
**Status:** ✅ **PROVEN WORKING** - Deployment guide with confirmed successful fixes
