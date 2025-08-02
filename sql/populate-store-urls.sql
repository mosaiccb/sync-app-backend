-- Populate storeurl column with actual MOD Pizza store page URLs
-- Based on website research from https://locations.modpizza.com/usa/co

-- =======================================
-- CONFIRMED STORE URLS WITH FULL DATA
-- =======================================

-- Castle Rock
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/castle-rock/4989-factory-shops-blvd',
    address = '4989 Factory Shops Blvd, Castle Rock, CO 80108',
    phone = '(720) 616-4500',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Castle Rock';

-- Highlands Ranch (Village Center West)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/highlands-ranch/3622-e-highlands-ranch-pkwy',
    address = '3622 E Highlands Ranch Pkwy, Highlands Ranch, CO 80126',
    phone = '(303) 470-1049',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Highlands Ranch';

-- Greeley
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/greeley/4365-centerplace-dr',
    address = '4365 Centerplace Dr Suite 300, Greeley, CO 80634',
    phone = '(970) 330-1344',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Greeley';

-- Johnstown
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/johnstown/4938-thompson-pkwy',
    address = '4938 Thompson Pkwy, Johnstown, CO 80534',
    phone = '(970) 667-3762',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Johnstown';

-- Centre (Fort Collins)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/fort-collins/1013-centre-ave',
    address = '1013 Centre Ave, Fort Collins, CO 80526',
    phone = '(970) 484-3497',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Centre' AND region = 'Northern Colorado';

-- =======================================
-- COLORADO SPRINGS STORES
-- =======================================

-- Falcon Landing (Powers & Constitution)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/13461-bass-pro-dr',
    address = '13461 Bass Pro Dr, Colorado Springs, CO 80921',
    phone = '(719) 888-8820',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Falcon Landing';

-- South Academy Highlands (Academy & Fountain)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/6436-s-us-hwy-85-87',
    address = '6436 S US Hwy 85/87, Colorado Springs, CO 80817',
    phone = '(719) 622-4794',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'South Academy Highlands';

-- Polaris Pointe (North Academy)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/colorado-springs/1710-briargate-pkwy',
    address = '1710 Briargate Pkwy Suite 110, Colorado Springs, CO 80920',
    phone = '(719) 522-1222',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Polaris Pointe';

-- =======================================
-- DENVER METRO STORES
-- =======================================

-- Lowry (Denver)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/denver/7301-e-29th-ave',
    address = '7301 E 29th Ave, Denver, CO 80238',
    phone = '(303) 955-3400',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Lowry';

-- Northfield Commons (Denver)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/denver/8348-northfield-blvd',
    address = '8348 Northfield Blvd Suite 1530, Denver, CO 80238',
    phone = '(303) 371-4888',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Northfield Commons';

-- Tower (Denver)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/denver/1555-california-st',
    address = '1555 California St, Denver, CO 80202',
    phone = '(303) 228-2100',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Tower';

-- =======================================
-- FRONT RANGE STORES WITH ADDRESSES
-- =======================================

-- Park Meadows (Centennial) - this might be the "Centre" store
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/centennial/8225-s-chester-st',
    address = '8225 S Chester St #103, Centennial, CO 80112',
    phone = '(720) 214-5360',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Park Meadows';

-- Crown Point (Parker)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/parker/18300-cottonwood-dr',
    address = '18300 Cottonwood Dr Suite 111, Parker, CO 80138',
    phone = '(303) 400-3675',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Crown Point';

-- Forest Trace (Aurora)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/aurora/23890-e-smoky-hill-rd',
    address = '23890 E Smoky Hill Rd Suite 10, Aurora, CO 80016',
    phone = '(303) 699-7433',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Forest Trace';

-- Diamond Circle (Lafayette)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/lafayette/1137-diamond-circle',
    address = '1137 Diamond Circle Suite 400, Lafayette, CO 80026',
    phone = '(303) 926-4888',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Diamond Circle';

-- Sheridan Parkway (Broomfield)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/broomfield/16818-sheridan-pkwy',
    address = '16818 Sheridan Pkwy Suite 124, Broomfield, CO 80023',
    phone = '(303) 466-4777',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Sheridan Parkway';

-- Westminster Promenade
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/westminster/6415-w-104th-ave',
    address = '6415 W 104th Ave, Westminster, CO 80020',
    phone = '(303) 469-2333',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Westminster Promenade';

-- Wellington (needs research)
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/wellington/[TO_BE_RESEARCHED]',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name = 'Wellington';

-- =======================================
-- STORES STILL NEEDING RESEARCH
-- =======================================

-- Mark remaining stores that need manual research
UPDATE store_configurations 
SET 
    storeurl = 'https://locations.modpizza.com/usa/co/[RESEARCH_NEEDED]',
    last_updated = GETDATE(),
    updated_by = 'WEBSITE_URL_RESEARCH'
WHERE store_name IN (
    'Creekwalk',
    'Dublin Commons', 
    'McCastlin Marketplace',
    'Ralston Creek'
) AND state = 'CO';

-- =======================================
-- VERIFICATION AND SUMMARY
-- =======================================

-- Show updated store data with URLs
SELECT
    store_name,
    address,
    phone,
    storeurl,
    region,
    CASE 
        WHEN storeurl LIKE '%[RESEARCH_NEEDED]%' THEN '🔍 Needs Research'
        WHEN storeurl LIKE '%[TO_BE_RESEARCHED]%' THEN '⚠️ Partial Research'
        WHEN storeurl IS NOT NULL AND storeurl NOT LIKE '%RESEARCH%' THEN '✅ Complete'
        ELSE '❌ Missing URL'
    END as url_status
FROM store_configurations
WHERE state = 'CO'
ORDER BY 
    CASE 
        WHEN storeurl LIKE '%[RESEARCH_NEEDED]%' OR storeurl LIKE '%[TO_BE_RESEARCHED]%' THEN 2
        WHEN storeurl IS NULL THEN 3
        ELSE 1
    END,
    store_name;

-- Summary statistics
SELECT
    'Store URL Coverage Summary' as summary_type,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN storeurl IS NOT NULL AND storeurl NOT LIKE '%RESEARCH%' THEN 1 END) as stores_with_urls,
    COUNT(CASE WHEN storeurl LIKE '%RESEARCH%' THEN 1 END) as stores_needing_research,
    COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as stores_with_addresses,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'TBD' THEN 1 END) as stores_with_phones
FROM store_configurations
WHERE state = 'CO' AND is_active = 1;
