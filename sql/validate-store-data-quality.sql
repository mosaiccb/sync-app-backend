-- Store Data Validation Script
-- Compares current database stores with MOD Pizza website findings

-- Check which stores we have in database vs website
    SELECT
        'Database vs Website Comparison' as analysis_type,
        'Current Store Count' as metric,
        COUNT(*) as value
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1

UNION ALL

    SELECT
        'Database vs Website Comparison',
        'Stores with Addresses',
        COUNT(*)
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1 AND address IS NOT NULL AND address != ''

UNION ALL

    SELECT
        'Database vs Website Comparison',
        'Stores with Phone Numbers',
        COUNT(*)
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1 AND phone IS NOT NULL AND phone != '' AND phone != 'TBD';

-- Show current store data quality
SELECT
    store_name,
    par_brink_location_id,
    region,
    CASE 
        WHEN address IS NULL OR address = '' THEN '❌ Missing'
        WHEN address LIKE '%TBD%' THEN '⚠️ Placeholder'
        ELSE '✅ Has Address'
    END as address_status,
    CASE 
        WHEN phone IS NULL OR phone = '' THEN '❌ Missing'
        WHEN phone = 'TBD' THEN '⚠️ Placeholder'
        ELSE '✅ Has Phone'
    END as phone_status,
    CASE 
        WHEN opening_hour = 10 AND closing_hour = 22 THEN '✅ Standard Hours'
        ELSE '⚠️ Custom Hours'
    END as hours_status
FROM store_configurations
WHERE state = 'CO' AND is_active = 1
ORDER BY 
    CASE WHEN address IS NOT NULL AND address != '' THEN 0 ELSE 1 END,
    store_name;

-- Identify potential data issues
    SELECT
        'Data Quality Issues' as issue_type,
        COUNT(*) as issue_count,
        'Stores missing addresses' as description
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1 AND (address IS NULL OR address = '')

UNION ALL

    SELECT
        'Data Quality Issues',
        COUNT(*),
        'Stores missing phone numbers'
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1 AND (phone IS NULL OR phone = '' OR phone = 'TBD')

UNION ALL

    SELECT
        'Data Quality Issues',
        COUNT(*),
        'Stores with placeholder data'
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1 AND (address LIKE '%TBD%' OR phone = 'TBD');

-- Website data coverage analysis
WITH
    website_matches
    AS
    (
        SELECT store_name,
            CASE 
      WHEN store_name IN ('Castle Rock', 'Highlands Ranch', 'Greeley', 'Johnstown') THEN 'Complete Match'
      WHEN store_name IN ('Centre', 'Diamond Circle', 'Crown Point', 'Forest Trace', 'Sheridan Parkway') THEN 'Partial Match'
      ELSE 'No Match Found'
    END as match_status
        FROM store_configurations
        WHERE state = 'CO' AND is_active = 1
    )
SELECT
    match_status,
    COUNT(*) as store_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*)
    FROM store_configurations
    WHERE state = 'CO' AND is_active = 1), 1) as percentage
FROM website_matches
GROUP BY match_status
ORDER BY 
    CASE match_status 
        WHEN 'Complete Match' THEN 1 
        WHEN 'Partial Match' THEN 2 
        ELSE 3 
    END;
