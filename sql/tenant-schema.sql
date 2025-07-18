-- -- Tenant Configuration Schema for UKG Sync Application
-- -- This schema stores non-sensitive tenant configuration data
-- -- Sensitive data (client secrets) remains in Azure Key Vault

-- -- Create Tenants table for storing tenant configuration
-- CREATE TABLE [dbo].[Tenants] (
--     [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
--     [TenantName] NVARCHAR(255) NOT NULL,
--     [CompanyId] NVARCHAR(50) NOT NULL,
--     [BaseUrl] NVARCHAR(500) NOT NULL,
--     [ClientId] NVARCHAR(255) NOT NULL,
--     [IsActive] BIT NOT NULL DEFAULT 1,
--     [CreatedBy] NVARCHAR(255) NOT NULL DEFAULT SYSTEM_USER,
--     [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
--     [ModifiedBy] NVARCHAR(255) NULL,
--     [ModifiedDate] DATETIME2 NULL,
--     [Description] NVARCHAR(1000) NULL
-- );

-- -- Create indexes for performance
-- CREATE INDEX [IX_Tenants_TenantName] ON [dbo].[Tenants] ([TenantName]);
-- CREATE INDEX [IX_Tenants_CompanyId] ON [dbo].[Tenants] ([CompanyId]);
-- CREATE INDEX [IX_Tenants_IsActive] ON [dbo].[Tenants] ([IsActive]);

-- -- Create UKG API Configuration table for storing UKG-specific settings
-- CREATE TABLE [dbo].[UKGApiConfigurations] (
--     [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
--     [TenantId] UNIQUEIDENTIFIER NOT NULL,
--     [TokenEndpoint] NVARCHAR(500) NOT NULL,
--     [ApiVersion] NVARCHAR(50) NOT NULL DEFAULT 'v1',
--     [Scope] NVARCHAR(255) NULL,
--     [IsActive] BIT NOT NULL DEFAULT 1,
--     [CreatedBy] NVARCHAR(255) NOT NULL DEFAULT SYSTEM_USER,
--     [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
--     [ModifiedBy] NVARCHAR(255) NULL,
--     [ModifiedDate] DATETIME2 NULL,
    
--     CONSTRAINT [FK_UKGApiConfigurations_Tenants] 
--         FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Tenants]([Id])
--         ON DELETE CASCADE
-- );

-- -- Create index for foreign key
-- CREATE INDEX [IX_UKGApiConfigurations_TenantId] ON [dbo].[UKGApiConfigurations] ([TenantId]);

-- -- Create audit table for tracking tenant configuration changes
-- CREATE TABLE [dbo].[TenantAudit] (
--     [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
--     [TenantId] UNIQUEIDENTIFIER NOT NULL,
--     [Action] NVARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
--     [OldValues] NVARCHAR(MAX) NULL,
--     [NewValues] NVARCHAR(MAX) NULL,
--     [ChangedBy] NVARCHAR(255) NOT NULL,
--     [ChangedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
--     [IPAddress] NVARCHAR(45) NULL,
--     [UserAgent] NVARCHAR(500) NULL
-- );

-- -- Create index for audit queries
-- CREATE INDEX [IX_TenantAudit_TenantId] ON [dbo].[TenantAudit] ([TenantId]);
-- CREATE INDEX [IX_TenantAudit_ChangedDate] ON [dbo].[TenantAudit] ([ChangedDate]);

-- GO

-- Create view for active tenants with UKG configuration
CREATE VIEW [dbo].[ActiveTenantsWithUKG] AS
SELECT 
    t.[Id] AS TenantId,
    t.[TenantName],
    t.[CompanyId],
    t.[BaseUrl],
    t.[ClientId],
    t.[Description],
    t.[CreatedDate],
    t.[ModifiedDate],
    u.[TokenEndpoint],
    u.[ApiVersion],
    u.[Scope]
FROM [dbo].[Tenants] t
LEFT JOIN [dbo].[UKGApiConfigurations] u ON t.[Id] = u.[TenantId] AND u.[IsActive] = 1
WHERE t.[IsActive] = 1;

GO

-- Insert sample data for testing (optional)
/*
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
*/

-- Create stored procedures for tenant management
GO

-- Procedure to create a new tenant
CREATE PROCEDURE [dbo].[CreateTenant]
    @TenantName NVARCHAR(255),
    @CompanyId NVARCHAR(50),
    @BaseUrl NVARCHAR(500),
    @ClientId NVARCHAR(255),
    @Description NVARCHAR(1000) = NULL,
    @CreatedBy NVARCHAR(255) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TenantId UNIQUEIDENTIFIER = NEWID();
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Insert tenant
        INSERT INTO [dbo].[Tenants] 
            ([Id], [TenantName], [CompanyId], [BaseUrl], [ClientId], [Description], [CreatedBy])
        VALUES 
            (@TenantId, @TenantName, @CompanyId, @BaseUrl, @ClientId, @Description, @CreatedBy);
        
        -- Insert default UKG configuration
        INSERT INTO [dbo].[UKGApiConfigurations] 
            ([TenantId], [TokenEndpoint], [CreatedBy])
        VALUES 
            (@TenantId, @BaseUrl + '/api/v1/security/oauth2/token', @CreatedBy);
        
        -- Audit the creation
        INSERT INTO [dbo].[TenantAudit] 
            ([TenantId], [Action], [NewValues], [ChangedBy])
        VALUES 
            (@TenantId, 'CREATE', 
             CONCAT('TenantName:', @TenantName, '; CompanyId:', @CompanyId, '; BaseUrl:', @BaseUrl), 
             @CreatedBy);
        
        COMMIT TRANSACTION;
        
        SELECT @TenantId AS TenantId;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;

GO

-- Procedure to update tenant
CREATE PROCEDURE [dbo].[UpdateTenant]
    @TenantId UNIQUEIDENTIFIER,
    @TenantName NVARCHAR(255),
    @CompanyId NVARCHAR(50),
    @BaseUrl NVARCHAR(500),
    @ClientId NVARCHAR(255),
    @Description NVARCHAR(1000) = NULL,
    @ModifiedBy NVARCHAR(255) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @OldValues NVARCHAR(MAX);
    DECLARE @NewValues NVARCHAR(MAX);
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Capture old values for audit
        SELECT @OldValues = CONCAT('TenantName:', [TenantName], '; CompanyId:', [CompanyId], '; BaseUrl:', [BaseUrl])
        FROM [dbo].[Tenants] WHERE [Id] = @TenantId;
        
        SET @NewValues = CONCAT('TenantName:', @TenantName, '; CompanyId:', @CompanyId, '; BaseUrl:', @BaseUrl);
        
        -- Update tenant
        UPDATE [dbo].[Tenants] 
        SET 
            [TenantName] = @TenantName,
            [CompanyId] = @CompanyId,
            [BaseUrl] = @BaseUrl,
            [ClientId] = @ClientId,
            [Description] = @Description,
            [ModifiedBy] = @ModifiedBy,
            [ModifiedDate] = GETUTCDATE()
        WHERE [Id] = @TenantId;
        
        -- Update UKG configuration
        UPDATE [dbo].[UKGApiConfigurations] 
        SET 
            [TokenEndpoint] = @BaseUrl + '/api/v1/security/oauth2/token',
            [ModifiedBy] = @ModifiedBy,
            [ModifiedDate] = GETUTCDATE()
        WHERE [TenantId] = @TenantId;
        
        -- Audit the update
        INSERT INTO [dbo].[TenantAudit] 
            ([TenantId], [Action], [OldValues], [NewValues], [ChangedBy])
        VALUES 
            (@TenantId, 'UPDATE', @OldValues, @NewValues, @ModifiedBy);
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;

GO

-- Procedure to delete tenant (soft delete)
CREATE PROCEDURE [dbo].[DeleteTenant]
    @TenantId UNIQUEIDENTIFIER,
    @ModifiedBy NVARCHAR(255) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Soft delete tenant
        UPDATE [dbo].[Tenants] 
        SET 
            [IsActive] = 0,
            [ModifiedBy] = @ModifiedBy,
            [ModifiedDate] = GETUTCDATE()
        WHERE [Id] = @TenantId;
        
        -- Soft delete UKG configuration
        UPDATE [dbo].[UKGApiConfigurations] 
        SET 
            [IsActive] = 0,
            [ModifiedBy] = @ModifiedBy,
            [ModifiedDate] = GETUTCDATE()
        WHERE [TenantId] = @TenantId;
        
        -- Audit the deletion
        INSERT INTO [dbo].[TenantAudit] 
            ([TenantId], [Action], [ChangedBy])
        VALUES 
            (@TenantId, 'DELETE', @ModifiedBy);
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;

GO
