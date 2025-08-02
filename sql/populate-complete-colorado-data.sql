-- Complete Colorado Springs Store Data Population
-- This script includes all the missing Colorado Springs store data found from MOD Pizza website

-- Update CREEKWALK store with complete data (previously had NULL address and phone)
UPDATE store_configurations 
SET 
    address = '160 E Cheyenne Rd Suite 100, Colorado Springs, CO 80906',
    phone = '(719) 355-1271',
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/160-e-cheyenne-rd',
    google_maps_url = 'https://maps.google.com/maps?cid=13618817907777895735',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'Creekwalk';

-- Update DUBLIN COMMONS store with complete data (previously had NULL address and phone)
UPDATE store_configurations 
SET 
    address = '5925 Dublin Blvd, Colorado Springs, CO 80923',
    phone = '(719) 638-2247',
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/5925-dublin-blvd',
    google_maps_url = 'https://maps.google.com/maps?cid=2071970118490749967',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'Dublin Commons';

-- Update FALCON LANDING store with complete data (previously had NULL phone)
UPDATE store_configurations 
SET 
    phone = '(719) 219-1912',
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/7447-n-academy-blvd',
    google_maps_url = 'https://maps.google.com/maps?cid=15263418993111556924',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'Falcon Landing';

-- Update POLARIS POINTE store with complete data (previously had NULL phone)
UPDATE store_configurations 
SET 
    phone = '(719) 487-3137',
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/13461-bass-pro-dr',
    google_maps_url = 'https://maps.google.com/maps?cid=415247098305259910',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'Polaris Pointe';

-- Update SOUTH ACADEMY HIGHLANDS store with complete data (previously had NULL phone)
UPDATE store_configurations 
SET 
    phone = '(719) 576-0168',
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/4465-venetucci-blvd',
    google_maps_url = 'https://maps.google.com/maps?cid=7206433158500898950',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'South Academy Highlands';

-- Update RALSTON CREEK store with complete data (previously missing from database)
UPDATE store_configurations 
SET 
    address = '9515 Ralston Rd Suite 100, Arvada, CO 80002',
    phone = '(720) 535-9407',
    storeurl = 'https://locations.modpizza.com/usa/co/arvada/9515-ralston-rd',
    google_maps_url = 'https://maps.google.com/maps?cid=3222228667163243845',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'Ralston Creek';

-- Update MCCASLIN MARKET store with complete data (previously missing from database)
UPDATE store_configurations 
SET 
    address = '994 W Dillon Rd Suite 600, Louisville, CO 80027',
    phone = '(303) 736-2481',
    storeurl = 'https://locations.modpizza.com/usa/co/louisville/994-w-dillon-rd',
    google_maps_url = 'https://maps.google.com/maps?cid=11586104577016207245',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'McCastlin Marketplace' OR store_name = 'McCastlin Market';

-- Update WELLINGTON store with complete data (previously missing from database)
UPDATE store_configurations 
SET 
    address = '1201 Wellington Ave Suite 101, Grand Junction, CO 81501',
    phone = '(970) 609-0355',
    storeurl = 'https://locations.modpizza.com/usa/co/grand-junction/1201-wellington-ave',
    google_maps_url = 'https://maps.google.com/maps?cid=14806064039195253386',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'COLORADO_SPRINGS_DATA'
WHERE store_name = 'Wellington';

-- Verification queries to check the updates
SELECT 'Colorado Springs Store Data Verification:' as info;

SELECT
    store_name,
    address,
    phone,
    CASE 
        WHEN address IS NULL OR phone IS NULL THEN 'INCOMPLETE'
        ELSE 'COMPLETE'
    END as data_status
FROM store_configurations
WHERE address LIKE '%Colorado Springs%' OR address LIKE '%Arvada%' OR address LIKE '%Louisville%' OR address LIKE '%Grand Junction%' OR store_name IN ('Creekwalk', 'Dublin Commons', 'Falcon Landing', 'Polaris Pointe', 'South Academy Highlands', 'Ralston Creek', 'McCaslin Marketplace', 'McCaslin Market', 'Wellington')
ORDER BY store_name;

-- Count of complete vs incomplete stores
SELECT
    CASE 
        WHEN address IS NULL OR phone IS NULL THEN 'INCOMPLETE'
        ELSE 'COMPLETE'
    END as data_status,
    COUNT(*) as store_count
FROM store_configurations
WHERE address LIKE '%Colorado Springs%' OR address LIKE '%Arvada%' OR address LIKE '%Louisville%' OR address LIKE '%Grand Junction%' OR store_name IN ('Creekwalk', 'Dublin Commons', 'Falcon Landing', 'Polaris Pointe', 'South Academy Highlands', 'Ralston Creek', 'McCaslin Marketplace', 'McCaslin Market', 'Wellington')
GROUP BY CASE 
    WHEN address IS NULL OR phone IS NULL THEN 'INCOMPLETE'
    ELSE 'COMPLETE'
END;-- Overall store completion status
SELECT
    COUNT(*) as total_stores,
    SUM(CASE WHEN address IS NOT NULL AND phone IS NOT NULL THEN 1 ELSE 0 END) as complete_stores,
    SUM(CASE WHEN address IS NULL OR phone IS NULL THEN 1 ELSE 0 END) as incomplete_stores,
    CAST(
        (SUM(CASE WHEN address IS NOT NULL AND phone IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
        AS DECIMAL(5,2)
    ) as completion_percentage
FROM store_configurations;
