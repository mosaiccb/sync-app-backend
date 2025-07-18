// Main deployment template for UKG Sync Multi-Tenant Backend
targetScope = 'resourceGroup'

@description('The name of the environment (e.g., dev, staging, prod)')
param environmentName string

@description('The location for all resources')
param location string = resourceGroup().location

@description('The tenant ID for Key Vault access')
param tenantId string = tenant().tenantId

// Reference existing Function App
resource existingFunctionApp 'Microsoft.Web/sites@2024-04-01' existing = {
  name: 'ukg-sync-backend-5rrqlcuxyzlvy'
}

// Outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenantId
output AZURE_RESOURCE_GROUP string = resourceGroup().name
output AZURE_FUNCTION_APP_NAME string = existingFunctionApp.name
output AZURE_FUNCTION_APP_URL string = 'https://${existingFunctionApp.properties.defaultHostName}'
