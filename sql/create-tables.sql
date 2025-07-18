-- Tenant Configuration Schema for UKG Sync Application
-- This schema stores non-sensitive tenant configuration data
-- Sensitive data (client secrets) remains in Azure Key Vault

-- Create Tenants table for storing tenant configuration
CREATE TABLE [dbo].[Tenants] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [TenantName] NVARCHAR(255) NOT NULL,
    [CompanyId] NVARCHAR(50) NOT NULL,
    [BaseUrl] NVARCHAR(500) NOT NULL,
    [ClientId] NVARCHAR(255) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedBy] NVARCHAR(255) NOT NULL DEFAULT SYSTEM_USER,
    [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [ModifiedBy] NVARCHAR(255) NULL,
    [ModifiedDate] DATETIME2 NULL,
    [Description] NVARCHAR(1000) NULL
);

-- Create indexes for performance
CREATE INDEX [IX_Tenants_TenantName] ON [dbo].[Tenants] ([TenantName]);
CREATE INDEX [IX_Tenants_CompanyId] ON [dbo].[Tenants] ([CompanyId]);
CREATE INDEX [IX_Tenants_IsActive] ON [dbo].[Tenants] ([IsActive]);

-- Create UKG API Configuration table for storing UKG-specific settings
CREATE TABLE [dbo].[UKGApiConfigurations] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [TenantId] UNIQUEIDENTIFIER NOT NULL,
    [TokenEndpoint] NVARCHAR(500) NOT NULL,
    [ApiVersion] NVARCHAR(50) NOT NULL DEFAULT 'v1',
    [Scope] NVARCHAR(255) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedBy] NVARCHAR(255) NOT NULL DEFAULT SYSTEM_USER,
    [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [ModifiedBy] NVARCHAR(255) NULL,
    [ModifiedDate] DATETIME2 NULL,
    
    CONSTRAINT [FK_UKGApiConfigurations_Tenants] 
        FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Tenants]([Id])
        ON DELETE CASCADE
);

-- Create index for foreign key
CREATE INDEX [IX_UKGApiConfigurations_TenantId] ON [dbo].[UKGApiConfigurations] ([TenantId]);

-- Create audit table for tracking tenant configuration changes
CREATE TABLE [dbo].[TenantAudit] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [TenantId] UNIQUEIDENTIFIER NOT NULL,
    [Action] NVARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    [OldValues] NVARCHAR(MAX) NULL,
    [NewValues] NVARCHAR(MAX) NULL,
    [ChangedBy] NVARCHAR(255) NOT NULL,
    [ChangedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [IPAddress] NVARCHAR(45) NULL,
    [UserAgent] NVARCHAR(500) NULL
);

-- Create index for audit queries
CREATE INDEX [IX_TenantAudit_TenantId] ON [dbo].[TenantAudit] ([TenantId]);
CREATE INDEX [IX_TenantAudit_ChangedDate] ON [dbo].[TenantAudit] ([ChangedDate]);

-- Insert sample data for testing
INSERT INTO [dbo].[Tenants] 
    ([TenantName], [CompanyId], [BaseUrl], [ClientId], [Description])
VALUES 
    ('Mosaic Employer Solutions', '33631552', 'https://service.ultipro.com', 'your-client-id', 'Main company tenant for UKG Ready API integration');

-- Get the inserted tenant ID for UKG configuration
DECLARE @TenantId UNIQUEIDENTIFIER = (SELECT TOP 1 [Id] FROM [dbo].[Tenants] WHERE [TenantName] = 'Mosaic Employer Solutions');

INSERT INTO [dbo].[UKGApiConfigurations] 
    ([TenantId], [TokenEndpoint], [ApiVersion], [Scope])
VALUES 
    (@TenantId, 'https://service.ultipro.com/api/v1/security/oauth2/token', 'v1', 'read write');
