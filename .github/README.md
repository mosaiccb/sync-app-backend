# GitHub Actions Deployment Setup

This project uses GitHub Actions for automated deployment to Azure Functions. The CI/CD pipeline includes build, test, and deployment stages.

## Workflows

### 1. azure-deploy.yml
- **Triggers**: Push to main branch, manual dispatch
- **Jobs**: 
  - Build and test the application
  - Deploy to development environment
  - Deploy to production environment (requires manual approval)

### 2. pr-validation.yml
- **Triggers**: Pull requests to main branch
- **Jobs**: 
  - Validate code quality with linting
  - Run unit tests
  - Security audit
  - TypeScript compilation check

## Required GitHub Secrets

To enable GitHub Actions deployment, you need to configure the following secrets in your GitHub repository:

### Azure Service Principal Credentials
1. **AZURE_CREDENTIALS**: JSON object containing service principal credentials
   ```json
   {
     "clientId": "your-client-id",
     "clientSecret": "your-client-secret",
     "subscriptionId": "your-subscription-id",
     "tenantId": "your-tenant-id"
   }
   ```

2. **AZURE_CLIENT_ID**: Service principal client ID
3. **AZURE_CLIENT_SECRET**: Service principal client secret
4. **AZURE_TENANT_ID**: Azure tenant ID
5. **AZURE_SUBSCRIPTION_ID**: Azure subscription ID

### Optional Configuration
6. **AZURE_RESOURCE_GROUP**: Resource group name (if different from azd default)
7. **AZURE_LOCATION**: Azure region (if different from azd default)

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with the appropriate name and value

## Creating Azure Service Principal

Run the following Azure CLI commands to create a service principal:

```bash
# Create service principal
az ad sp create-for-rbac --name "ukg-sync-backend-github-actions" --role contributor --scopes /subscriptions/{subscription-id} --sdk-auth

# The output will be similar to:
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

Use this entire JSON object as the value for the `AZURE_CREDENTIALS` secret.

## Environment Configuration

The workflow uses GitHub Environments for deployment approvals:
- **development**: Deploys automatically on push to main
- **production**: Requires manual approval before deployment

To set up environments:
1. Go to Settings > Environments
2. Create "development" and "production" environments
3. Configure protection rules for production (require reviewers)

## AZD Environment Setup

Make sure your AZD environments are properly configured:

```bash
# List environments
azd env list

# Set environment variables if needed
azd env set AZURE_SUBSCRIPTION_ID your-subscription-id
azd env set AZURE_LOCATION your-location
```

## Manual Deployment

You can also trigger deployments manually:
1. Go to the Actions tab in your repository
2. Select the "Deploy to Azure" workflow
3. Click "Run workflow"
4. Choose the branch to deploy from

## Troubleshooting

### Common Issues

1. **Authentication Failures**: Verify service principal has proper permissions
2. **Build Failures**: Check Node.js version compatibility
3. **Deployment Failures**: Ensure AZD environments are properly configured

### Debug Steps

1. Check workflow logs in GitHub Actions
2. Verify all secrets are properly set
3. Test AZD deployment locally
4. Validate Azure resource permissions

## Security Best Practices

- Service principal uses least privilege access
- Secrets are encrypted in GitHub
- Production deployments require approval
- Security audits run on every PR
- Dependencies are automatically updated via Dependabot (recommended)

## Monitoring

After deployment, monitor your application:
- Check Azure Function logs
- Monitor Application Insights
- Review deployment status in GitHub Actions
