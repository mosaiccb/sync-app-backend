/**
 * Store Configuration Usage Examples
 * Demonstrating the efficient SQL + JSON cache architecture
 */
import { InvocationContext } from '@azure/functions';
/**
 * Example 1: Basic store lookup (most common operation)
 * Performance: ~1-2ms (JSON cache lookup)
 */
export declare function getStoreExample(context: InvocationContext): Promise<void>;
/**
 * Example 2: Get all stores for dropdown/admin interface
 * Performance: ~1-2ms (cached) or ~5-10ms (database refresh)
 */
export declare function getAllStoresExample(context: InvocationContext): Promise<void>;
/**
 * Example 3: Regional filtering
 * Performance: ~1-2ms (filter cached data)
 */
export declare function getColoradoStoresExample(context: InvocationContext): Promise<void>;
/**
 * Example 4: Cache health monitoring
 */
export declare function cacheHealthExample(context: InvocationContext): Promise<void>;
/**
 * Example 5: Manual cache refresh (admin function)
 */
export declare function refreshCacheExample(context: InvocationContext): Promise<void>;
/**
 * Example 6: Performance testing
 */
export declare function performanceTestExample(context: InvocationContext): Promise<void>;
/**
 * Real-world usage in dashboard functions
 */
export declare function dashboardIntegrationExample(locationToken: string, context: InvocationContext): Promise<{
    storeName: string;
    storeId: string;
    timezone: string;
    state: string;
    region: string | undefined;
}>;
//# sourceMappingURL=storeConfigExamples.d.ts.map