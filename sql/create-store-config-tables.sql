-- Store Configuration Database Schema
-- Efficient schema for 22+ stores with room for expansion

-- Main stores table
CREATE TABLE store_configurations
(
    id INT IDENTITY(1,1) PRIMARY KEY,
    location_token NVARCHAR(255) NOT NULL UNIQUE,
    -- Encrypted PAR Brink token
    store_name NVARCHAR(255) NOT NULL,
    -- Display name (e.g., "Castle Rock")
    par_brink_location_id NVARCHAR(50) NOT NULL,
    -- PAR Brink location ID
    timezone NVARCHAR(50) NOT NULL,
    -- IANA timezone (e.g., "America/Denver")
    state CHAR(2) NOT NULL,
    -- State abbreviation
    region NVARCHAR(50) NULL,
    -- Region for multi-state expansion
    address NVARCHAR(500) NULL,
    -- Full store address
    phone NVARCHAR(20) NULL,
    -- Store phone number
    manager_name NVARCHAR(255) NULL,
    -- Store manager name
    manager_email NVARCHAR(255) NULL,
    -- Store manager email
    is_active BIT NOT NULL DEFAULT 1,
    -- Whether store is operational
    opening_hour INT NOT NULL DEFAULT 10,
    -- Store opening hour (24-hour format)
    closing_hour INT NOT NULL DEFAULT 22,
    -- Store closing hour (24-hour format)
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_updated DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_by NVARCHAR(255) NULL,
    -- Who last updated this record

    -- Ensure valid hours
    CONSTRAINT CK_store_opening_hour CHECK (opening_hour >= 0 AND opening_hour <= 23),
    CONSTRAINT CK_store_closing_hour CHECK (closing_hour >= 0 AND closing_hour <= 23),
    CONSTRAINT CK_store_hours_logical CHECK (
        (closing_hour > opening_hour) OR
        (closing_hour < opening_hour AND closing_hour <= 6) -- Handle overnight stores
    )
);

-- Indexes for performance
CREATE NONCLUSTERED INDEX IX_store_configurations_token ON store_configurations (location_token);
CREATE NONCLUSTERED INDEX IX_store_configurations_state ON store_configurations (state) WHERE is_active = 1;
CREATE NONCLUSTERED INDEX IX_store_configurations_active ON store_configurations (is_active);
CREATE NONCLUSTERED INDEX IX_store_configurations_region ON store_configurations (region) WHERE region IS NOT NULL;

-- Store features/capabilities table (optional - for future expansion)
CREATE TABLE store_features
(
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_id INT NOT NULL,
    feature_name NVARCHAR(100) NOT NULL,
    -- e.g., "drive_thru", "delivery", "catering"
    is_enabled BIT NOT NULL DEFAULT 1,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_store_features_store FOREIGN KEY (store_id) REFERENCES store_configurations(id),
    CONSTRAINT UQ_store_features UNIQUE (store_id, feature_name)
);

-- Store settings table (for store-specific configurations)
CREATE TABLE store_settings
(
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_id INT NOT NULL,
    setting_name NVARCHAR(100) NOT NULL,
    -- e.g., "labor_percentage_target", "peak_hours"
    setting_value NVARCHAR(1000) NOT NULL,
    -- JSON or simple value
    setting_type NVARCHAR(50) NOT NULL,
    -- "number", "text", "json", "boolean"
    description NVARCHAR(500) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_updated DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_store_settings_store FOREIGN KEY (store_id) REFERENCES store_configurations(id),
    CONSTRAINT UQ_store_settings UNIQUE (store_id, setting_name)
);

GO

