-- Query PAR Brink Configuration from Database
-- Run these queries to see what's currently stored

-- 1. Check PAR Brink API configuration
SELECT
    [Id],
    [Name],
    [Provider],
    [Category],
    [BaseUrl],
    [AuthType],
    [KeyVaultSecretName],
    [ConfigurationJson],
    [IsActive],
    [CreatedAt],
    [UpdatedAt]
FROM [dbo].[ThirdPartyAPIs]
WHERE [Provider] = 'PAR Brink'
ORDER BY [CreatedAt] DESC;

-- 2. Check just the configuration JSON (easier to read)
SELECT
    [Name],
    [ConfigurationJson]
FROM [dbo].[ThirdPartyAPIs]
WHERE [Provider] = 'PAR Brink';

-- 3. Parse the access token from JSON (if you want to see it directly)
SELECT
    [Name],
    JSON_VALUE([ConfigurationJson], '$.accessToken') as AccessToken,
    JSON_VALUE([ConfigurationJson], '$.selectedEndpoints') as SelectedEndpoints,
    JSON_QUERY([ConfigurationJson], '$.locations') as Locations
FROM [dbo].[ThirdPartyAPIs]
WHERE [Provider] = 'PAR Brink';

-- 4. Count locations in configuration
SELECT
    [Name],
    JSON_VALUE([ConfigurationJson], '$.accessToken') as AccessToken,
    (SELECT COUNT(*)
    FROM OPENJSON(JSON_QUERY([ConfigurationJson], '$.locations'))) as LocationCount
FROM [dbo].[ThirdPartyAPIs]
WHERE [Provider] = 'PAR Brink';
