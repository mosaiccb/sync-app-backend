-- Validation Queries for PAR Brink Configuration
-- Updated with correct database schema

-- 1. Check Tenants (Main tenant configuration)
SELECT TOP (10) [Id], [TenantName], [CompanyId], [BaseUrl], [IsActive], [CreatedDate], [ModifiedDate]
FROM [dbo].[Tenants]
ORDER BY [CreatedDate] DESC;

-- 2. Check Third Party APIs (PAR Brink configs) 
SELECT TOP (10) [Id], [Name], [Provider], [Category], [BaseUrl], [IsActive], [CreatedAt], [UpdatedAt]
FROM [dbo].[ThirdPartyAPIs]
WHERE [Provider] = 'PAR Brink'
ORDER BY [CreatedAt] DESC;

-- 3. Check API Endpoints for PAR Brink
SELECT e.[Id], e.[ThirdPartyAPIId], e.[EndpointId], e.[Name], e.[Path], e.[Method], a.[Name] as APIName
FROM [dbo].[ThirdPartyAPIEndpoints] e
JOIN [dbo].[ThirdPartyAPIs] a ON e.[ThirdPartyAPIId] = a.[Id]
WHERE a.[Provider] = 'PAR Brink'
ORDER BY e.[CreatedAt] DESC;

-- 4. Check UKG API Configurations 
SELECT u.[Id], u.[TenantId], u.[TokenEndpoint], u.[ApiVersion], u.[Scope], u.[IsActive], t.[TenantName]
FROM [dbo].[UKGApiConfigurations] u
JOIN [dbo].[Tenants] t ON u.[TenantId] = t.[Id]
ORDER BY u.[CreatedDate] DESC;

-- 5. Check Third Party API Audit Trail
SELECT TOP (20) [Id], [ThirdPartyAPIId], [Operation], [UserId], [Details], [CreatedAt]
FROM [dbo].[ThirdPartyAPIAudit]
ORDER BY [CreatedAt] DESC;
