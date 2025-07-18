// Key Vault module for UKG Sync Backend
@description('The name of the key vault')
param name string

@description('The location for the key vault')
param location string

@description('The tenant ID for Key Vault access')
param tenantId string

@description('The principal ID of the user assigned identity')
param userAssignedIdentityId string

@description('Tags for the key vault')
param tags object = {}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 7
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
    publicNetworkAccess: 'Enabled'
  }
}

// Grant Key Vault Secrets User role to the managed identity
resource keyVaultSecretUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, userAssignedIdentityId, 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
  properties: {
    principalId: userAssignedIdentityId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b') // Key Vault Secrets User
    principalType: 'ServicePrincipal'
  }
}

output id string = keyVault.id
output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
