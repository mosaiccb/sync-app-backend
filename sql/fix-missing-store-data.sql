-- Quick Fix for Missing Phone Numbers and Addresses
-- Run this to update existing TBD phone numbers and missing data

-- Fix TBD phone numbers with actual phone numbers found in research
UPDATE store_configurations 
SET 
    phone = '(303) 926-4888',
    last_updated = GETDATE(),
    updated_by = 'PHONE_NUMBER_FIX'
WHERE store_name = 'Diamond Circle' AND (phone = 'TBD' OR phone IS NULL);

UPDATE store_configurations 
SET 
    phone = '(303) 400-3675',
    last_updated = GETDATE(),
    updated_by = 'PHONE_NUMBER_FIX'
WHERE store_name = 'Crown Point' AND (phone = 'TBD' OR phone IS NULL);

UPDATE store_configurations 
SET 
    phone = '(303) 699-7433',
    last_updated = GETDATE(),
    updated_by = 'PHONE_NUMBER_FIX'
WHERE store_name = 'Forest Trace' AND (phone = 'TBD' OR phone IS NULL);

-- Add missing store data from populate-store-urls.sql research
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/broomfield/16818-sheridan-pkwy',
    address = '16818 Sheridan Pkwy Suite 124, Broomfield, CO 80023',
    phone = '(303) 466-4777',
    google_maps_url = 'https://maps.google.com/maps?q=16818+Sheridan+Pkwy+Suite+124+Broomfield+CO+80023',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'MISSING_DATA_FIX'
WHERE store_name = 'Sheridan Parkway' AND state = 'CO';

UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/westminster/6415-w-104th-ave',
    address = '6415 W 104th Ave, Westminster, CO 80020',
    phone = '(303) 469-2333',
    google_maps_url = 'https://maps.google.com/maps?q=6415+W+104th+Ave+Westminster+CO+80020',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'MISSING_DATA_FIX'
WHERE store_name = 'Westminster Promenade' AND state = 'CO';

-- Set default hours for any stores that don't have them yet
UPDATE store_configurations 
SET 
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'DEFAULT_HOURS_FIX'
WHERE state = 'CO' AND daily_hours IS NULL;

-- Mark stores that need research with research placeholders
UPDATE store_configurations 
SET 
    storeurl = CASE 
        WHEN store_name = 'Wellington' THEN 'https://locations.modpizza.com/usa/co/wellington/[TO_BE_RESEARCHED]'
        ELSE 'https://locations.modpizza.com/usa/co/[RESEARCH_NEEDED]'
    END,
    last_updated = GETDATE(),
    updated_by = 'RESEARCH_PLACEHOLDER'
WHERE store_name IN ('Wellington', 'Creekwalk', 'Dublin Commons', 'McCastlin Marketplace', 'Ralston Creek')
    AND state = 'CO'
    AND storeurl IS NULL;

-- Verification: Show current data status
SELECT
    'Data Fix Summary' as summary_type,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN storeurl IS NOT NULL THEN 1 END) as stores_with_url,
    COUNT(CASE WHEN google_maps_url IS NOT NULL THEN 1 END) as stores_with_maps,
    COUNT(CASE WHEN daily_hours IS NOT NULL THEN 1 END) as stores_with_hours,
    COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as stores_with_address,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'TBD' THEN 1 END) as stores_with_phone,
    COUNT(CASE WHEN storeurl LIKE '%RESEARCH%' THEN 1 END) as stores_needing_research
FROM store_configurations
WHERE state = 'CO';

-- Show stores still missing critical data
SELECT
    store_name,
    CASE WHEN address IS NULL OR address = '' THEN '❌ Missing' ELSE '✅ Has' END as address_status,
    CASE WHEN phone IS NULL OR phone = '' OR phone = 'TBD' THEN '❌ Missing/TBD' ELSE '✅ Has' END as phone_status,
    CASE WHEN storeurl LIKE '%RESEARCH%' THEN '🔍 Needs Research' 
         WHEN storeurl IS NOT NULL THEN '✅ Has URL' 
         ELSE '❌ Missing' END as url_status,
    CASE WHEN google_maps_url IS NOT NULL THEN '✅ Has' ELSE '❌ Missing' END as maps_status
FROM store_configurations
WHERE state = 'CO'
    AND (address IS NULL OR address = '' OR phone IS NULL OR phone = '' OR phone = 'TBD' OR storeurl IS NULL OR google_maps_url IS NULL)
ORDER BY 
    CASE WHEN address IS NULL OR address = '' THEN 0 ELSE 1 END,
    store_name;
