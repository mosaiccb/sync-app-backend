// Managed Identity module for UKG Sync Backend
@description('The name of the managed identity')
param name string

@description('The location for the managed identity')
param location string

@description('Tags for the managed identity')
param tags object = {}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: name
  location: location
  tags: tags
}

output id string = managedIdentity.id
output principalId string = managedIdentity.properties.principalId
output clientId string = managedIdentity.properties.clientId
output name string = managedIdentity.name
