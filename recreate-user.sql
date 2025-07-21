-- Drop user if exists
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = N'ukg-sync-mi-5rrqlcuxyzlvy')
    DROP USER [ukg-sync-mi-5rrqlcuxyzlvy];
GO

-- Create user from external provider (managed identity)
CREATE USER [ukg-sync-mi-5rrqlcuxyzlvy] FROM EXTERNAL PROVIDER;
GO

-- Grant roles
ALTER ROLE db_datareader ADD MEMBER [ukg-sync-mi-5rrqlcuxyzlvy];
ALTER ROLE db_datawriter ADD MEMBER [ukg-sync-mi-5rrqlcuxyzlvy];
ALTER ROLE db_ddladmin ADD MEMBER [ukg-sync-mi-5rrqlcuxyzlvy];
GO

-- Verify user creation
SELECT name, type_desc, authentication_type_desc 
FROM sys.database_principals 
WHERE name = 'ukg-sync-mi-5rrqlcuxyzlvy';
GO
