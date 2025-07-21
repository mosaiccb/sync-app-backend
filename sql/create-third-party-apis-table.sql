-- Third-Party API Configuration Schema for UKG Sync Application
-- This schema stores non-sensitive third-party API configuration data
-- Sensitive data (access tokens, API keys) are stored in Azure Key Vault using existing KeyVaultService

-- Create ThirdPartyAPIs table for storing third-party API configurations
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ThirdPartyAPIs' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[ThirdPartyAPIs] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [TenantId] UNIQUEIDENTIFIER NULL, -- Optional: link to specific tenant, NULL for global APIs
        [Name] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(1000) NULL,
        [Category] NVARCHAR(100) NOT NULL, -- e.g., 'POS Systems', 'HR Systems', 'Payroll'
        [Provider] NVARCHAR(100) NOT NULL, -- e.g., 'PAR Brink', 'Square', 'Toast'
        [BaseUrl] NVARCHAR(500) NOT NULL,
        [Version] NVARCHAR(50) NULL,
        [AuthType] NVARCHAR(50) NOT NULL, -- 'oauth2', 'apikey', 'basic', 'custom'
        [KeyVaultSecretName] NVARCHAR(255) NOT NULL, -- Reference to Key Vault secret
        [ConfigurationJson] NVARCHAR(MAX) NOT NULL, -- Locations, endpoints, rate limits (non-sensitive)
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [CreatedBy] NVARCHAR(255) NOT NULL,
        [UpdatedBy] NVARCHAR(255) NOT NULL,
        
        -- Foreign key to existing tenants table
        CONSTRAINT FK_ThirdPartyAPIs_Tenants FOREIGN KEY ([TenantId]) 
            REFERENCES [dbo].[Tenants]([Id]) ON DELETE CASCADE,
        
        -- Unique constraint for tenant/provider combination
        CONSTRAINT UQ_ThirdPartyAPIs_TenantProvider UNIQUE ([TenantId], [Provider], [Name])
    );

    -- Indexes for performance
    CREATE NONCLUSTERED INDEX IX_ThirdPartyAPIs_TenantId 
        ON [dbo].[ThirdPartyAPIs] ([TenantId]) 
        INCLUDE ([IsActive], [Provider]);

    CREATE NONCLUSTERED INDEX IX_ThirdPartyAPIs_Provider 
        ON [dbo].[ThirdPartyAPIs] ([Provider]) 
        WHERE [IsActive] = 1;
END
GO

-- API Endpoints table for storing endpoint definitions
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ThirdPartyAPIEndpoints' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[ThirdPartyAPIEndpoints] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [ThirdPartyAPIId] UNIQUEIDENTIFIER NOT NULL,
        [EndpointId] NVARCHAR(100) NOT NULL, -- e.g., 'labor-shifts', 'settings-employees'
        [Name] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [Path] NVARCHAR(255) NOT NULL,
        [Method] NVARCHAR(10) NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
        [RequestTemplate] NVARCHAR(MAX) NULL, -- SOAP/JSON templates
        [HeadersJson] NVARCHAR(MAX) NULL, -- Custom headers as JSON
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_ThirdPartyAPIEndpoints_ThirdPartyAPIs FOREIGN KEY ([ThirdPartyAPIId]) 
            REFERENCES [dbo].[ThirdPartyAPIs]([Id]) ON DELETE CASCADE,
            
        CONSTRAINT UQ_ThirdPartyAPIEndpoints_APIEndpoint UNIQUE ([ThirdPartyAPIId], [EndpointId])
    );

    CREATE NONCLUSTERED INDEX IX_ThirdPartyAPIEndpoints_ThirdPartyAPIId 
        ON [dbo].[ThirdPartyAPIEndpoints] ([ThirdPartyAPIId]) 
        WHERE [IsActive] = 1;
END
GO

-- Audit table for tracking API usage and changes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ThirdPartyAPIAudit' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[ThirdPartyAPIAudit] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [ThirdPartyAPIId] UNIQUEIDENTIFIER NOT NULL,
        [Operation] NVARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'CALL'
        [UserId] NVARCHAR(255) NOT NULL,
        [Details] NVARCHAR(MAX) NULL,
        [IpAddress] NVARCHAR(45) NULL,
        [UserAgent] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_ThirdPartyAPIAudit_ThirdPartyAPIs FOREIGN KEY ([ThirdPartyAPIId]) 
            REFERENCES [dbo].[ThirdPartyAPIs]([Id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_ThirdPartyAPIAudit_ThirdPartyAPIId_CreatedAt 
        ON [dbo].[ThirdPartyAPIAudit] ([ThirdPartyAPIId], [CreatedAt] DESC);
END
GO
