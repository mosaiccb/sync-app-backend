-- Grant database access to the Function App managed identity
-- This script must be executed by an Azure AD admin user on the moevocorp database

-- Connect to the moevocorp database first, then run these commands:

-- Create a database user for the managed identity
-- Replace 'ukg-sync-backend-5rrqlcuxyzlvy' with your actual function app name if different
CREATE USER [ukg-sync-backend-5rrqlcuxyzlvy] FROM EXTERNAL PROVIDER;

-- Grant necessary database roles
-- db_datareader: allows reading all data in the database
-- db_datawriter: allows inserting, updating, and deleting data
-- db_ddladmin: allows creating/modifying database schema if needed
ALTER ROLE db_datareader ADD MEMBER [ukg-sync-backend-5rrqlcuxyzlvy];
ALTER ROLE db_datawriter ADD MEMBER [ukg-sync-backend-5rrqlcuxyzlvy];
ALTER ROLE db_ddladmin ADD MEMBER [ukg-sync-backend-5rrqlcuxyzlvy];

-- Verify the user was created successfully
SELECT 
    name,
    type_desc,
    authentication_type_desc,
    create_date
FROM sys.database_principals 
WHERE name = 'ukg-sync-backend-5rrqlcuxyzlvy';

-- Show role memberships
SELECT 
    r.name AS role_name,
    m.name AS member_name
FROM sys.database_role_members rm
JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
WHERE m.name = 'ukg-sync-backend-5rrqlcuxyzlvy';
