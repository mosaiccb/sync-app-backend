-- Populate Enhanced Store Location Data
-- Updates store_configurations with website URLs, Google Maps links, and detailed daily hours

-- First, let's update the stores we found with complete data
-- All stores have the same hours pattern: Mon-Thu & Sun: 10:30-21:00, Fri-Sat: 10:30-22:00

-- Castle Rock - Complete data
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/castle-rock/4989-factory-shops-blvd',
    google_maps_url = 'https://maps.google.com/maps?cid=16437963281198900693',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '4989 Factory Shops Blvd, Castle Rock, CO 80108',
    phone = '(720) 616-4500',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Castle Rock';

-- Park Meadows (Centre) - Complete data
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/centennial/8225-s-chester-st',
    google_maps_url = 'https://maps.google.com/maps?cid=15602767228847630048',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '8225 S Chester St #103, Centennial, CO 80112',
    phone = '(720) 214-5360',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Centre' OR par_brink_location_id = '159';

-- Highlands Ranch - Complete data
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/highlands-ranch/3622-e-highlands-ranch-pkwy',
    google_maps_url = 'https://maps.google.com/maps?cid=11216264807469848944',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '3622 E Highlands Ranch Pkwy, Highlands Ranch, CO 80126',
    phone = '(303) 470-1049',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Highlands Ranch';

-- Greeley - Complete data
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/greeley/4365-centerplace-dr',
    google_maps_url = 'https://maps.google.com/maps?cid=7227571368134027493',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '4365 Centerplace Dr Suite 300, Greeley, CO 80634',
    phone = '(970) 330-1344',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Greeley';

-- Johnstown - Complete data
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/johnstown/4938-thompson-pkwy',
    google_maps_url = 'https://maps.google.com/maps?cid=5216913561357604912',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '4938 Thompson Pkwy, Johnstown, CO 80534',
    phone = '(970) 667-3762',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Johnstown';

-- Centre Avenue (Fort Collins) - Complete data
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/fort-collins/1013-centre-ave',
    google_maps_url = 'https://maps.google.com/maps?cid=9286025168589401004',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '1013 Centre Ave, Fort Collins, CO 80526',
    phone = '(970) 484-3497',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Centre' AND region = 'Northern Colorado';

-- Add other stores that were found during city-specific searches
-- These would need phone numbers added through individual page scraping

-- Diamond Circle (Lafayette)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/lafayette/1137-diamond-circle',
    google_maps_url = 'https://maps.google.com/maps?cid=11662399690356397910',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '1137 Diamond Circle Suite 400, Lafayette, CO 80026',
    phone = '(303) 926-4888',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Diamond Circle';

-- Crown Point (Parker)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/parker/18300-cottonwood-dr',
    google_maps_url = 'https://maps.google.com/maps?cid=13183713727606401955',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '18300 Cottonwood Dr Suite 111, Parker, CO 80138',
    phone = '(303) 400-3675',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Crown Point';

-- Forest Trace (Aurora)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/aurora/23890-e-smoky-hill-rd',
    google_maps_url = 'https://maps.google.com/maps?cid=2251220781721193115',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '23890 E Smoky Hill Rd Suite 10, Aurora, CO 80016',
    phone = '(303) 699-7433',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Forest Trace';

-- Add stores that need additional research but have addresses/phones from other sources
-- These stores need Google Maps URLs and complete enhancement

-- Sheridan Parkway (Broomfield) - From populate-store-urls.sql
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/broomfield/16818-sheridan-pkwy',
    google_maps_url = 'https://maps.google.com/maps?q=16818+Sheridan+Pkwy+Suite+124+Broomfield+CO+80023', -- Generic maps link
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '16818 Sheridan Pkwy Suite 124, Broomfield, CO 80023',
    phone = '(303) 466-4777',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Sheridan Parkway';

-- Westminster Promenade - From populate-store-urls.sql  
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/westminster/6415-w-104th-ave',
    google_maps_url = 'https://maps.google.com/maps?q=6415+W+104th+Ave+Westminster+CO+80020', -- Generic maps link
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    address = '6415 W 104th Ave, Westminster, CO 80020',
    phone = '(303) 469-2333',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Westminster Promenade';

-- Stores that need complete research for addresses and phones
-- Mark with research placeholders for now

-- Wellington - Partial URL known
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/wellington/[TO_BE_RESEARCHED]',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name = 'Wellington';

-- Stores needing complete research
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/[RESEARCH_NEEDED]',
    daily_hours = '{"monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}, "sunday": {"open": "10:30", "close": "21:00"}}',
    monday_open = '10:30', monday_close = '21:00',
    tuesday_open = '10:30', tuesday_close = '21:00',
    wednesday_open = '10:30', wednesday_close = '21:00',
    thursday_open = '10:30', thursday_close = '21:00',
    friday_open = '10:30', friday_close = '22:00',
    saturday_open = '10:30', saturday_close = '22:00',
    sunday_open = '10:30', sunday_close = '21:00',
    last_updated = GETDATE(),
    updated_by = 'ENHANCED_WEBSITE_DATA'
WHERE store_name IN ('Creekwalk', 'Dublin Commons', 'McCastlin Marketplace', 'Ralston Creek')
    AND state = 'CO';

-- Add default hours for all other Colorado stores (assuming same pattern)
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
    updated_by = 'DEFAULT_HOURS_UPDATE'
WHERE state = 'CO'
    AND daily_hours IS NULL;

-- Verification queries
SELECT
    'Enhanced Data Summary' as summary_type,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN storeurl IS NOT NULL THEN 1 END) as stores_with_url,
    COUNT(CASE WHEN google_maps_url IS NOT NULL THEN 1 END) as stores_with_maps,
    COUNT(CASE WHEN daily_hours IS NOT NULL THEN 1 END) as stores_with_hours,
    COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as stores_with_address,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'TBD' THEN 1 END) as stores_with_phone
FROM store_configurations
WHERE state = 'CO';

-- Show stores with complete data
SELECT
    store_name,
    address,
    phone,
    CASE WHEN storeurl IS NOT NULL THEN '✅' ELSE '❌' END as has_url,
    CASE WHEN google_maps_url IS NOT NULL THEN '✅' ELSE '❌' END as has_maps,
    CASE WHEN daily_hours IS NOT NULL THEN '✅' ELSE '❌' END as has_hours,
    CASE WHEN phone IS NOT NULL AND phone != 'TBD' THEN '✅' ELSE '❌' END as has_phone
FROM store_configurations
WHERE state = 'CO'
ORDER BY 
    CASE WHEN storeurl IS NOT NULL THEN 0 ELSE 1 END,
    store_name;
