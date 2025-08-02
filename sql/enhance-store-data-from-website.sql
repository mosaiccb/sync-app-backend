-- Enhanced Store Data Migration with Complete Website Address Information
-- This script updates the existing store configurations with actual addresses and phone numbers
-- scraped from the MOD Pizza locations website using city-specific URLs

-- ========================================
-- STORES WITH COMPLETE DATA (Address + Phone)
-- ========================================

-- Update Castle Rock store
UPDATE store_configurations 
SET 
    address = '4989 Factory Shops Blvd, Castle Rock, CO 80108',
    phone = '(720) 616-4500',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Castle Rock';

-- Update Highlands Ranch store
UPDATE store_configurations 
SET 
    address = '3622 E Highlands Ranch Pkwy, Highlands Ranch, CO 80126', 
    phone = '(303) 470-1049',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Highlands Ranch';

-- Update Greeley store
UPDATE store_configurations 
SET 
    address = '4365 Centerplace Dr Suite 300, Greeley, CO 80634',
    phone = '(970) 330-1344',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Greeley';

-- Update Johnstown store
UPDATE store_configurations 
SET 
    address = '4938 Thompson Pkwy, Johnstown, CO 80534',
    phone = '(970) 667-3762',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Johnstown';

-- Update Polaris Pointe store (Colorado Springs)
UPDATE store_configurations 
SET 
    address = '13461 Bass Pro Dr Suite 100, Colorado Springs, CO 80921',
    phone = '(719) 487-3137',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Polaris Pointe';

-- Update Lowry store (Denver)
UPDATE store_configurations 
SET 
    address = '63 N Quebec St Suite 111, Denver, CO 80230',
    phone = '(720) 693-9448',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Lowry';

-- Update Westminster Promenade store
UPDATE store_configurations 
SET 
    address = '6415 W 104th Ave Suite 400, Westminster, CO 80020',
    phone = '(720) 417-7300',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Westminster Promenade';

-- ========================================
-- STORES WITH ADDRESS ONLY (Phone TBD)
-- ========================================

-- Update Centre store (Park Meadows in Centennial)
UPDATE store_configurations 
SET 
    address = '8225 S Chester St #103, Centennial, CO 80112',
    phone = '(720) 214-5360',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Centre' OR par_brink_location_id = '159';

-- Update Diamond Circle store (Lafayette)
UPDATE store_configurations 
SET 
    address = '1137 Diamond Circle Suite 400, Lafayette, CO 80026',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Diamond Circle';

-- Update Crown Point store (Parker)
UPDATE store_configurations 
SET 
    address = '18300 Cottonwood Dr Suite 111, Parker, CO 80138',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Crown Point';

-- Update Forest Trace store (Aurora)
UPDATE store_configurations 
SET 
    address = '23890 E Smoky Hill Rd Suite 10, Aurora, CO 80016',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Forest Trace';

-- Update Sheridan Parkway store (Broomfield)
UPDATE store_configurations 
SET 
    address = '16818 Sheridan Pkwy Suite 124, Broomfield, CO 80023',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Sheridan Parkway';

-- Update Creekwalk store (Colorado Springs)
UPDATE store_configurations 
SET 
    address = '160 E Cheyenne Rd Suite 100, Colorado Springs, CO 80906',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Creekwalk';

-- Update Dublin Commons store (Colorado Springs)
UPDATE store_configurations 
SET 
    address = '5925 Dublin Blvd, Colorado Springs, CO 80923',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Dublin Commons';

-- Update Falcon Landing store (Colorado Springs)
UPDATE store_configurations 
SET 
    address = '7447 N Academy Blvd, Colorado Springs, CO 80920',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Falcon Landing';

-- Update South Academy Highlands store (Colorado Springs)
UPDATE store_configurations 
SET 
    address = '4465 Venetucci Blvd Suite 130, Colorado Springs, CO 80906',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'South Academy Highlands';

-- Update Tower store (Denver)
UPDATE store_configurations 
SET 
    address = '6651 N Tower Rd Suite 110, Denver, CO 80249',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Tower';

-- Update Northfield Commons store (Denver)
UPDATE store_configurations 
SET 
    address = '9135 Northfield Blvd Suite 140, Denver, CO 80230',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Northfield Commons';

-- Update McCastlin Marketplace store (found as McCaslin Market in Louisville)
UPDATE store_configurations 
SET 
    address = '994 W Dillon Rd Suite 600, Louisville, CO 80027',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'McCastlin Marketplace';

-- Update Ralston Creek store (found in Arvada)
UPDATE store_configurations 
SET 
    address = '9515 Ralston Rd Suite 100, Arvada, CO 80002',
    phone = 'TBD - Website Research Pending',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_DATA_ENHANCEMENT'
WHERE store_name = 'Ralston Creek';

-- Update operating hours based on website data (consistent across all locations)
-- All stores: Mon-Thu & Sun: 10:30 AM - 9:00 PM, Fri-Sat: 10:30 AM - 10:00 PM
-- Convert to 24-hour format: 10:30 AM = 10, 9:00 PM = 21, 10:00 PM = 22
UPDATE store_configurations 
SET 
    opening_hour = 10,  -- 10:30 AM (round down to 10 AM for hour-based filtering)
    closing_hour = 22,  -- Latest closing time (Friday/Saturday 10 PM)
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_HOURS_UPDATE'
WHERE state = 'CO';

-- Add store hours details as settings for more precise tracking
INSERT INTO store_settings
    (store_id, setting_name, setting_value, setting_type, description)
SELECT id, 'detailed_hours',
    '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    'json',
    'Detailed operating hours by day of week from website'
FROM store_configurations
WHERE state = 'CO'
    AND NOT EXISTS (
        SELECT 1
    FROM store_settings ss
    WHERE ss.store_id = store_configurations.id
        AND ss.setting_name = 'detailed_hours'
    );

-- Verify the enhanced data
SELECT
    store_name,
    address,
    phone,
    par_brink_location_id,
    region,
    opening_hour,
    closing_hour,
    CASE 
        WHEN address IS NOT NULL AND address != '' THEN 'Has Address'
        ELSE 'Missing Address'
    END as address_status,
    CASE 
        WHEN phone IS NOT NULL AND phone != '' AND phone != 'TBD' THEN 'Has Phone'
        ELSE 'Missing Phone'
    END as phone_status
FROM store_configurations
WHERE state = 'CO'
ORDER BY 
    CASE WHEN address IS NOT NULL AND address != '' THEN 0 ELSE 1 END,
    store_name;

-- Summary of data enhancement
SELECT
    'Data Enhancement Summary' as summary_type,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as stores_with_address,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'TBD' THEN 1 END) as stores_with_phone,
    COUNT(CASE WHEN address IS NOT NULL AND phone IS NOT NULL AND phone != 'TBD' THEN 1 END) as stores_complete
FROM store_configurations
WHERE state = 'CO';
