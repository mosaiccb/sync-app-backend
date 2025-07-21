-- Grant database access to managed identity
-- This script must be run by an Azure AD admin user

USE [moevocorp];
GO

-- Drop user if it exists (to start fresh)
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = N'ukg-sync-mi-5rrqlcuxyzlvy')
BEGIN
    PRINT 'Dropping existing user: ukg-sync-mi-5rrqlcuxyzlvy'
    DROP USER [ukg-sync-mi-5rrqlcuxyzlvy];
END
GO

-- Create user from external provider (managed identity)
PRINT 'Creating managed identity user: ukg-sync-mi-5rrqlcuxyzlvy'
CREATE USER [ukg-sync-mi-5rrqlcuxyzlvy] FROM EXTERNAL PROVIDER;
GO

-- Grant database roles
PRINT 'Granting db_datareader role'
ALTER ROLE db_datareader ADD MEMBER [ukg-sync-mi-5rrqlcuxyzlvy];
GO

PRINT 'Granting db_datawriter role'
ALTER ROLE db_datawriter ADD MEMBER [ukg-sync-mi-5rrqlcuxyzlvy];
GO

PRINT 'Granting db_ddladmin role'
ALTER ROLE db_ddladmin ADD MEMBER [ukg-sync-mi-5rrqlcuxyzlvy];
GO

-- Verify the user was created and has permissions
PRINT 'Verifying user creation and permissions:'
SELECT 
    dp.name AS user_name,
    dp.type_desc AS user_type,
    dp.authentication_type_desc AS auth_type,
    r.name AS role_name
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members rm ON dp.principal_id = rm.member_principal_id
LEFT JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'ukg-sync-mi-5rrqlcuxyzlvy'
ORDER BY r.name;
GO

PRINT 'Managed identity database access setup complete!'
