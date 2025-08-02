"use strict";
/**
 * Store Configuration Usage Examples
 * Demonstrating the efficient SQL + JSON cache architecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreExample = getStoreExample;
exports.getAllStoresExample = getAllStoresExample;
exports.getColoradoStoresExample = getColoradoStoresExample;
exports.cacheHealthExample = cacheHealthExample;
exports.refreshCacheExample = refreshCacheExample;
exports.performanceTestExample = performanceTestExample;
exports.dashboardIntegrationExample = dashboardIntegrationExample;
const storeConfigService_1 = require("../services/storeConfigService");
/**
 * Example 1: Basic store lookup (most common operation)
 * Performance: ~1-2ms (JSON cache lookup)
 */
async function getStoreExample(context) {
    const locationToken = "RPNrrDYtnke+OHNLfy74/A=="; // Castle Rock
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (store) {
        context.log(`Store: ${store.name} (${store.state})`);
        context.log(`Timezone: ${store.timezone}`);
        context.log(`PAR Brink ID: ${store.id}`);
        // Performance: Ultra-fast JSON lookup, no database hit
    }
}
/**
 * Example 2: Get all stores for dropdown/admin interface
 * Performance: ~1-2ms (cached) or ~5-10ms (database refresh)
 */
async function getAllStoresExample(context) {
    const stores = await storeConfigService_1.storeConfigService.getAllActiveStores(context);
    context.log(`Found ${stores.length} active stores:`);
    stores.forEach(store => {
        context.log(`  ${store.name} (${store.state}) - ID: ${store.id}`);
    });
    // Auto-refreshes from database if cache is stale (>15 min)
    // Otherwise uses cached JSON data for instant response
}
/**
 * Example 3: Regional filtering
 * Performance: ~1-2ms (filter cached data)
 */
async function getColoradoStoresExample(context) {
    const coloradoStores = await storeConfigService_1.storeConfigService.getStoresByState('CO', context);
    context.log(`Colorado has ${coloradoStores.length} stores`);
    // Group by region
    const regions = coloradoStores.reduce((acc, store) => {
        const region = store.region || 'Unknown';
        if (!acc[region])
            acc[region] = [];
        acc[region].push(store.name);
        return acc;
    }, {});
    Object.entries(regions).forEach(([region, storeNames]) => {
        context.log(`  ${region}: ${storeNames.join(', ')}`);
    });
}
/**
 * Example 4: Cache health monitoring
 */
async function cacheHealthExample(context) {
    const health = await storeConfigService_1.storeConfigService.healthCheck(context);
    context.log('Store Cache Health:');
    context.log(`  Status: ${health.cacheStatus}`);
    context.log(`  Total Stores: ${health.totalStores}`);
    context.log(`  Last Refresh: ${health.lastRefresh}`);
    context.log(`  Cache Age: ${health.cacheAge} seconds`);
    if (health.cacheStatus !== 'healthy') {
        context.warn('Cache needs attention!');
    }
}
/**
 * Example 5: Manual cache refresh (admin function)
 */
async function refreshCacheExample(context) {
    try {
        await storeConfigService_1.storeConfigService.refreshCache(context);
        context.log('✅ Store cache refreshed successfully');
    }
    catch (error) {
        context.error('❌ Cache refresh failed:', error);
    }
}
/**
 * Example 6: Performance testing
 */
async function performanceTestExample(context) {
    const testToken = "RPNrrDYtnke+OHNLfy74/A==";
    const iterations = 100;
    // Test cached lookup performance
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
        await storeConfigService_1.storeConfigService.getStoreConfig(testToken, context);
    }
    const endTime = Date.now();
    const averageTime = (endTime - startTime) / iterations;
    context.log(`Performance Test Results:`);
    context.log(`  ${iterations} lookups in ${endTime - startTime}ms`);
    context.log(`  Average: ${averageTime.toFixed(2)}ms per lookup`);
    context.log(`  Expected: <2ms per lookup (cached), ~5-10ms (database)`);
}
/**
 * Real-world usage in dashboard functions
 */
async function dashboardIntegrationExample(locationToken, context) {
    // Step 1: Get store config (fast cached lookup)
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (!store) {
        throw new Error(`Store not found for token: ${locationToken.substring(0, 10)}...`);
    }
    // Step 2: Use store configuration in business logic
    // const isOperatingHours = (hour: number) => {
    //   // Could be enhanced to read from store.opening_hour / store.closing_hour from database
    //   return hour >= 10 && hour <= 22; // Current hardcoded hours
    // };
    // Step 3: Apply timezone-specific logic
    const currentLocalTime = new Date().toLocaleString("en-US", {
        timeZone: store.timezone
    });
    context.log(`Processing ${store.name} dashboard:`);
    context.log(`  Location: ${store.name}, ${store.state}`);
    context.log(`  Timezone: ${store.timezone}`);
    context.log(`  Current Local Time: ${currentLocalTime}`);
    context.log(`  PAR Brink ID: ${store.id}`);
    return {
        storeName: store.name,
        storeId: store.id,
        timezone: store.timezone,
        state: store.state,
        region: store.region
    };
}
//# sourceMappingURL=storeConfigExamples.js.map