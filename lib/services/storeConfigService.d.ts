/**
 * Store Configuration Service
 * Efficiently manages store data with SQL database + JSON file caching
 *
 * Architecture Benefits:
 * - SQL database for authoritative data and easy management
 * - JSON file cache for ultra-fast lookups (no database calls during operations)
 * - Automatic cache refresh with configurable intervals
 * - Fallback mechanisms for reliability
 */
import { InvocationContext } from '@azure/functions';
interface StoreConfig {
    token: string;
    name: string;
    id: string;
    timezone: string;
    state: string;
    address?: string;
    phone?: string;
    storeurl?: string;
    googleMapsUrl?: string;
    manager?: string;
    region?: string;
    isActive: boolean;
    lastUpdated: Date;
    dailyHours?: {
        monday: {
            open: string;
            close: string;
        };
        tuesday: {
            open: string;
            close: string;
        };
        wednesday: {
            open: string;
            close: string;
        };
        thursday: {
            open: string;
            close: string;
        };
        friday: {
            open: string;
            close: string;
        };
        saturday: {
            open: string;
            close: string;
        };
        sunday: {
            open: string;
            close: string;
        };
    };
    openingHour?: number;
    closingHour?: number;
}
declare class StoreConfigService {
    private static instance;
    private cache;
    private readonly cacheFilePath;
    private readonly cacheMaxAge;
    private refreshPromise;
    private constructor();
    static getInstance(): StoreConfigService;
    /**
     * Get store configuration by token (primary method)
     * Ultra-fast lookup using cached JSON data
     */
    getStoreConfig(token: string, context?: InvocationContext): Promise<StoreConfig | null>;
    /**
     * Get all active stores (for dropdown lists, admin panels, etc.)
     */
    getAllActiveStores(context?: InvocationContext): Promise<StoreConfig[]>;
    /**
     * Get stores by state (for regional filtering)
     */
    getStoresByState(state: string, context?: InvocationContext): Promise<StoreConfig[]>;
    /**
     * Force refresh cache from database (admin function)
     */
    refreshCache(context?: InvocationContext): Promise<void>;
    /**
     * Ensure cache is valid (not expired) and load if needed
     */
    private ensureCacheValid;
    /**
     * Load cache from file or database
     */
    private loadCache;
    /**
     * Load cache from JSON file
     */
    private loadCacheFromFile;
    /**
     * Save cache to JSON file
     */
    private saveCacheToFile;
    /**
     * Get single store from database (fallback method)
     */
    private getStoreFromDatabase;
    /**
     * Get all stores from database
     */
    private getAllStoresFromDatabase;
    /**
     * Legacy hardcoded data (fallback until database is implemented)
     */
    private getHardcodedStores;
    /**
     * Health check - verify cache is working
     */
    healthCheck(context?: InvocationContext): Promise<{
        cacheStatus: 'healthy' | 'stale' | 'missing';
        totalStores: number;
        lastRefresh: string;
        cacheAge: number;
    }>;
}
export declare const storeConfigService: StoreConfigService;
export { StoreConfig };
//# sourceMappingURL=storeConfigService.d.ts.map