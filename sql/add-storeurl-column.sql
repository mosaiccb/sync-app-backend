-- Enhanced store location data columns
-- Adds storeurl, google_maps_url, and detailed daily hours to store_configurations table

-- Check if columns exist before adding them
IF NOT EXISTS (SELECT 1
FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.store_configurations') AND name = 'storeurl')
BEGIN
    ALTER TABLE dbo.store_configurations 
    ADD storeurl NVARCHAR(500) NULL;
    PRINT 'Added storeurl column';
END
ELSE
BEGIN
    PRINT 'storeurl column already exists';
END

IF NOT EXISTS (SELECT 1
FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.store_configurations') AND name = 'google_maps_url')
BEGIN
    ALTER TABLE dbo.store_configurations 
    ADD google_maps_url NVARCHAR(500) NULL;
    PRINT 'Added google_maps_url column';
END
ELSE
BEGIN
    PRINT 'google_maps_url column already exists';
END

IF NOT EXISTS (SELECT 1
FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.store_configurations') AND name = 'daily_hours')
BEGIN
    ALTER TABLE dbo.store_configurations 
    ADD daily_hours NVARCHAR(MAX) NULL;
    PRINT 'Added daily_hours column';
END
ELSE
BEGIN
    PRINT 'daily_hours column already exists';
END

-- Add convenience columns for common queries (check if they exist first)
IF NOT EXISTS (SELECT 1
FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.store_configurations') AND name = 'monday_open')
BEGIN
    ALTER TABLE dbo.store_configurations 
    ADD monday_open TIME NULL,
        monday_close TIME NULL,
        tuesday_open TIME NULL,
        tuesday_close TIME NULL,
        wednesday_open TIME NULL,
        wednesday_close TIME NULL,
        thursday_open TIME NULL,
        thursday_close TIME NULL,
        friday_open TIME NULL,
        friday_close TIME NULL,
        saturday_open TIME NULL,
        saturday_close TIME NULL,
        sunday_open TIME NULL,
        sunday_close TIME NULL;
    PRINT 'Added daily hours convenience columns';
END
ELSE
BEGIN
    PRINT 'Daily hours convenience columns already exist';
END

-- Add indexes for performance (only if they don't exist)
IF NOT EXISTS (SELECT 1
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.store_configurations') AND name = 'IX_store_configurations_storeurl')
BEGIN
    CREATE NONCLUSTERED INDEX IX_store_configurations_storeurl 
    ON dbo.store_configurations (storeurl) 
    WHERE storeurl IS NOT NULL;
    PRINT 'Created storeurl index';
END
ELSE
BEGIN
    PRINT 'storeurl index already exists';
END

IF NOT EXISTS (SELECT 1
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.store_configurations') AND name = 'IX_store_configurations_maps_url')
BEGIN
    CREATE NONCLUSTERED INDEX IX_store_configurations_maps_url 
    ON dbo.store_configurations (google_maps_url) 
    WHERE google_maps_url IS NOT NULL;
    PRINT 'Created google_maps_url index';
END
ELSE
BEGIN
    PRINT 'google_maps_url index already exists';
END

-- Add column descriptions (safe to re-run)
BEGIN TRY
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Direct URL to the store''s detailed page on MOD Pizza website',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'store_configurations',
        @level2type = N'COLUMN', @level2name = N'storeurl';
    PRINT 'Added storeurl column description';
END TRY
BEGIN CATCH
    PRINT 'storeurl column description already exists or column not found';
END CATCH

BEGIN TRY
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Google Maps URL for store location and directions',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'store_configurations',
        @level2type = N'COLUMN', @level2name = N'google_maps_url';
    PRINT 'Added google_maps_url column description';
END TRY
BEGIN CATCH
    PRINT 'google_maps_url column description already exists or column not found';
END CATCH

BEGIN TRY
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Complete daily hours in JSON format: {"monday": {"open": "10:30", "close": "21:00"}, ...}',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'store_configurations',
        @level2type = N'COLUMN', @level2name = N'daily_hours';
    PRINT 'Added daily_hours column description';
END TRY
BEGIN CATCH
    PRINT 'daily_hours column description already exists or column not found';
END CATCH

PRINT 'Enhanced store columns script completed successfully!';
