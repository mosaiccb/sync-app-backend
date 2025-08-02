-- Migrate hardcoded store data to database
-- Run this after creating the store configuration tables

-- Insert all 22 Colorado stores
INSERT INTO store_configurations
    (
    location_token,
    store_name,
    par_brink_location_id,
    timezone,
    state,
    region,
    opening_hour,
    closing_hour,
    updated_by
    )
VALUES
    -- Colorado Stores (Mountain Time Zone)
    ('RPNrrDYtnke+OHNLfy74/A==', 'Castle Rock', '109', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('16U5e0+GFEW/ixlKo+VJhg==', 'Centre', '159', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('xQwecGX8lUGnpLlTbheuug==', 'Creekwalk', '651', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('BhFEGI1ffUi1CLVe8/qtKw==', 'Crown Point', '479', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('XbEjtd0tKkavxcJ043UsUg==', 'Diamond Circle', '204133', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('kRRYZ8SCiUatilX4KO7dBg==', 'Dublin Commons', '20408', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('dWQm28UaeEq0qStmvTfACg==', 'Falcon Landing', '67', 'America/Denver', 'CO', 'Colorado Springs Area', 10, 22, 'DATA_MIGRATION'),
    ('Q58QIT+t+kGf9tzqHN2OCA==', 'Forest Trace', '188', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('2LUEj0hnMk+kCQlUcySYBQ==', 'Greeley', '354', 'America/Denver', 'CO', 'Northern Colorado', 10, 22, 'DATA_MIGRATION'),
    ('x/S/SDwyrEem54+ZoCILeg==', 'Highlands Ranch', '204049', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('gAAbGt6udki8DwPMkonciA==', 'Johnstown', '722', 'America/Denver', 'CO', 'Northern Colorado', 10, 22, 'DATA_MIGRATION'),
    ('37CE8WDS8k6isMGLMB9PRA==', 'Lowry', '619', 'America/Denver', 'CO', 'Denver Metro', 10, 22, 'DATA_MIGRATION'),
    ('7yC7X4KjZEuoZCDviTwspA==', 'McCastlin Marketplace', '161', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('SUsjq0mEck6HwRkd7uNACg==', 'Northfield Commons', '336', 'America/Denver', 'CO', 'Denver Metro', 10, 22, 'DATA_MIGRATION'),
    ('M4X3DyDrLUKwi3CQHbqlOQ==', 'Polaris Pointe', '1036', 'America/Denver', 'CO', 'Colorado Springs Area', 10, 22, 'DATA_MIGRATION'),
    ('38AZmQGFQEy5VNajl9utlA==', 'Park Meadows', '26', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('ZOJMZlffDEqC849w6PnF0g==', 'Ralston Creek', '441', 'America/Denver', 'CO', 'Colorado Front Range', 10, 22, 'DATA_MIGRATION'),
    ('A2dHEwIh9USNnpMrXCrpQw==', 'Sheridan Parkway', '601', 'America/Denver', 'CO', 'Denver Metro', 10, 22, 'DATA_MIGRATION'),
    ('y4xlWfqFJEuvmkocDGZGtw==', 'South Academy Highlands', '204047', 'America/Denver', 'CO', 'Colorado Springs Area', 10, 22, 'DATA_MIGRATION'),
    ('6OwU+/7IOka+PV9JzAgzYQ==', 'Tower', '579', 'America/Denver', 'CO', 'Denver Metro', 10, 22, 'DATA_MIGRATION'),
    ('YUn21EMuwki+goWuIJ5yGg==', 'Wellington', '652', 'America/Denver', 'CO', 'Northern Colorado', 10, 22, 'DATA_MIGRATION'),
    ('OpM9o1kTOkyMM2vevMMqdw==', 'Westminster Promenade', '202794', 'America/Denver', 'CO', 'Denver Metro', 10, 22, 'DATA_MIGRATION');

-- Add some common store features for all stores
INSERT INTO store_features
    (store_id, feature_name, is_enabled)
    SELECT id, 'dine_in', 1
    FROM store_configurations
    WHERE state = 'CO'
UNION ALL
    SELECT id, 'takeout', 1
    FROM store_configurations
    WHERE state = 'CO'
UNION ALL
    SELECT id, 'online_ordering', 1
    FROM store_configurations
    WHERE state = 'CO'
UNION ALL
    SELECT id, 'mobile_app', 1
    FROM store_configurations
    WHERE state = 'CO';

-- Add some drive-thru capability to select stores (larger locations)
INSERT INTO store_features
    (store_id, feature_name, is_enabled)
SELECT id, 'drive_thru', 1
FROM store_configurations
WHERE store_name IN ('Park Meadows', 'Highlands Ranch', 'Westminster Promenade', 'Northfield Commons', 'Greeley');

-- Add delivery capability to metro area stores
INSERT INTO store_features
    (store_id, feature_name, is_enabled)
SELECT id, 'delivery', 1
FROM store_configurations
WHERE region IN ('Denver Metro', 'Colorado Front Range');

-- Add some default store settings
INSERT INTO store_settings
    (store_id, setting_name, setting_value, setting_type, description)
    SELECT id, 'labor_percentage_target', '30.0', 'number', 'Target labor percentage for this store'
    FROM store_configurations
    WHERE state = 'CO'
UNION ALL
    SELECT id, 'peak_hours', '["11:00-13:00", "17:00-20:00"]', 'json', 'Peak operating hours for scheduling'
    FROM store_configurations
    WHERE state = 'CO'
UNION ALL
    SELECT id, 'max_employees_per_hour', '15', 'number', 'Maximum employees that can be scheduled per hour'
    FROM store_configurations
    WHERE state = 'CO';

-- Verify the data
SELECT
    COUNT(*) as total_stores,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_stores,
    COUNT(DISTINCT state) as states,
    COUNT(DISTINCT region) as regions
FROM store_configurations;

-- Show sample of migrated data
SELECT TOP 5
    store_name,
    par_brink_location_id,
    timezone,
    state,
    region,
    opening_hour,
    closing_hour,
    (SELECT COUNT(*)
    FROM store_features sf
    WHERE sf.store_id = sc.id AND sf.is_enabled = 1) as feature_count
FROM store_configurations sc
ORDER BY store_name;
