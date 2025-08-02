"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeConfigService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class StoreConfigService {
    static instance;
    cache = null;
    cacheFilePath = path.join(__dirname, '../data/store-cache.json');
    cacheMaxAge = 15 * 60 * 1000; // 15 minutes in milliseconds
    refreshPromise = null;
    constructor() { }
    static getInstance() {
        if (!StoreConfigService.instance) {
            StoreConfigService.instance = new StoreConfigService();
        }
        return StoreConfigService.instance;
    }
    /**
     * Get store configuration by token (primary method)
     * Ultra-fast lookup using cached JSON data
     */
    async getStoreConfig(token, context) {
        await this.ensureCacheValid(context);
        if (!this.cache) {
            context?.warn('Store cache unavailable, falling back to database');
            return await this.getStoreFromDatabase(token, context);
        }
        const store = this.cache.stores[token];
        if (!store) {
            context?.warn(`Store not found for token: ${token.substring(0, 10)}...`);
            return null;
        }
        return store;
    }
    /**
     * Get all active stores (for dropdown lists, admin panels, etc.)
     */
    async getAllActiveStores(context) {
        context?.log('🏪 StoreConfigService.getAllActiveStores() called');
        await this.ensureCacheValid(context);
        if (!this.cache) {
            context?.warn('Store cache unavailable, falling back to database');
            const dbStores = await this.getAllStoresFromDatabase(context);
            context?.log(`🔍 Database fallback returned ${dbStores.length} stores`);
            return dbStores;
        }
        const activeStores = Object.values(this.cache.stores)
            .filter(store => store.isActive)
            .sort((a, b) => a.name.localeCompare(b.name));
        context?.log(`🔍 Cache returned ${activeStores.length} active stores from ${Object.keys(this.cache.stores).length} total cached stores`);
        context?.log(`🔍 Cache last refreshed: ${this.cache.lastRefresh}`);
        // Debug first store from cache
        if (activeStores.length > 0) {
            const firstStore = activeStores[0];
            context?.log(`🔍 First cached store - Name: "${firstStore.name}", Address: "${firstStore.address || 'NO ADDRESS'}"`);
        }
        return activeStores;
    }
    /**
     * Get stores by state (for regional filtering)
     */
    async getStoresByState(state, context) {
        const allStores = await this.getAllActiveStores(context);
        return allStores.filter(store => store.state === state);
    }
    /**
     * Force refresh cache from database (admin function)
     */
    async refreshCache(context) {
        context?.log('🔄 Force refreshing store cache from database...');
        try {
            const stores = await this.getAllStoresFromDatabase(context);
            const storeMap = {};
            stores.forEach(store => {
                storeMap[store.token] = store;
            });
            this.cache = {
                stores: storeMap,
                lastRefresh: new Date(),
                cacheVersion: '1.0',
                totalStores: stores.length
            };
            // Save to file for persistence across function cold starts
            await this.saveCacheToFile(context);
            context?.log(`✅ Cache refreshed with ${stores.length} stores`);
        }
        catch (error) {
            context?.error('❌ Failed to refresh store cache:', error);
            throw error;
        }
    }
    /**
     * Ensure cache is valid (not expired) and load if needed
     */
    async ensureCacheValid(context) {
        // Prevent multiple concurrent refresh operations
        if (this.refreshPromise) {
            await this.refreshPromise;
            return;
        }
        const needsRefresh = !this.cache ||
            (Date.now() - this.cache.lastRefresh.getTime()) > this.cacheMaxAge;
        if (needsRefresh) {
            this.refreshPromise = this.loadCache(context);
            try {
                await this.refreshPromise;
            }
            finally {
                this.refreshPromise = null;
            }
        }
    }
    /**
     * Load cache from file or database
     */
    async loadCache(context) {
        try {
            // Try to load from cache file first (fast cold start)
            const cacheData = await this.loadCacheFromFile(context);
            if (cacheData &&
                (Date.now() - cacheData.lastRefresh.getTime()) < this.cacheMaxAge) {
                this.cache = cacheData;
                context?.log(`📋 Loaded ${cacheData.totalStores} stores from cache file`);
                return;
            }
            // Cache file is stale or missing, refresh from database
            context?.log('🔄 Cache file stale or missing, refreshing from database...');
            await this.refreshCache(context);
        }
        catch (error) {
            context?.error('❌ Failed to load store cache:', error);
            // Fallback: try to use stale cache if available
            if (this.cache) {
                context?.warn('⚠️ Using stale cache due to refresh failure');
                return;
            }
            throw error;
        }
    }
    /**
     * Load cache from JSON file
     */
    async loadCacheFromFile(context) {
        try {
            const data = await fs.readFile(this.cacheFilePath, 'utf-8');
            const parsed = JSON.parse(data);
            // Convert date strings back to Date objects
            parsed.lastRefresh = new Date(parsed.lastRefresh);
            Object.values(parsed.stores).forEach((store) => {
                store.lastUpdated = new Date(store.lastUpdated);
            });
            return parsed;
        }
        catch (error) {
            context?.log('📁 Cache file not found or invalid, will create new one');
            return null;
        }
    }
    /**
     * Save cache to JSON file
     */
    async saveCacheToFile(context) {
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(this.cacheFilePath), { recursive: true });
            // Save cache with pretty formatting for debugging
            await fs.writeFile(this.cacheFilePath, JSON.stringify(this.cache, null, 2), 'utf-8');
            context?.log(`💾 Cache saved to file: ${this.cacheFilePath}`);
        }
        catch (error) {
            context?.error('❌ Failed to save cache to file:', error);
            // Don't throw - cache can still work in memory
        }
    }
    /**
     * Get single store from database (fallback method)
     */
    async getStoreFromDatabase(token, context) {
        try {
            // Import database service dynamically to avoid circular dependencies
            const { databaseStoreService } = await Promise.resolve().then(() => __importStar(require('./databaseStoreService')));
            // Try database first
            const store = await databaseStoreService.getStoreByToken(token, context);
            if (store) {
                return store;
            }
            context?.warn(`Store not found in database for token: ${token.substring(0, 10)}...`);
        }
        catch (error) {
            context?.warn('Database query failed, falling back to hardcoded data:', error);
        }
        // Fallback to hardcoded data
        const hardcodedMapping = this.getHardcodedStores();
        const hardcodedStore = hardcodedMapping[token];
        if (!hardcodedStore) {
            context?.warn(`Store not found in hardcoded fallback for token: ${token.substring(0, 10)}...`);
            return null;
        }
        // Convert hardcoded format to StoreConfig format
        return {
            token,
            name: hardcodedStore.name,
            id: hardcodedStore.id,
            timezone: hardcodedStore.timezone,
            state: hardcodedStore.state,
            isActive: true,
            lastUpdated: new Date()
        };
    }
    /**
     * Get all stores from database
     */
    async getAllStoresFromDatabase(context) {
        try {
            context?.log('🔍 getAllStoresFromDatabase: Attempting database connection...');
            // Import database service dynamically to avoid circular dependencies
            const { databaseStoreService } = await Promise.resolve().then(() => __importStar(require('./databaseStoreService')));
            // Try database first
            const stores = await databaseStoreService.getAllStores(context);
            context?.log(`📊 Retrieved ${stores.length} stores from SQL database`);
            // Debug first store from database
            if (stores.length > 0) {
                const firstStore = stores[0];
                context?.log(`🔍 First DB store - Name: "${firstStore.name}", Address: "${firstStore.address || 'NO ADDRESS'}", Token: ${firstStore.token.substring(0, 10)}...`);
            }
            return stores;
        }
        catch (error) {
            context?.error('❌ Database query failed, falling back to hardcoded data:', error);
            // Fallback to hardcoded data if database is unavailable
            context?.log('🔍 Using hardcoded fallback data...');
            const hardcodedMapping = this.getHardcodedStores();
            const stores = Object.entries(hardcodedMapping).map(([token, config]) => ({
                token,
                name: config.name,
                id: config.id,
                timezone: config.timezone,
                state: config.state,
                isActive: true,
                lastUpdated: new Date()
            }));
            context?.log(`📊 Fallback: Retrieved ${stores.length} stores from hardcoded data`);
            return stores;
        }
    }
    /**
     * Legacy hardcoded data (fallback until database is implemented)
     */
    getHardcodedStores() {
        return {
            "RPNrrDYtnke+OHNLfy74/A==": { name: "Castle Rock", id: "109", timezone: "America/Denver", state: "CO" },
            "16U5e0+GFEW/ixlKo+VJhg==": { name: "Centre", id: "159", timezone: "America/Denver", state: "CO" },
            "xQwecGX8lUGnpLlTbheuug==": { name: "Creekwalk", id: "651", timezone: "America/Denver", state: "CO" },
            "BhFEGI1ffUi1CLVe8/qtKw==": { name: "Crown Point", id: "479", timezone: "America/Denver", state: "CO" },
            "XbEjtd0tKkavxcJ043UsUg==": { name: "Diamond Circle", id: "204133", timezone: "America/Denver", state: "CO" },
            "kRRYZ8SCiUatilX4KO7dBg==": { name: "Dublin Commons", id: "20408", timezone: "America/Denver", state: "CO" },
            "dWQm28UaeEq0qStmvTfACg==": { name: "Falcon Landing", id: "67", timezone: "America/Denver", state: "CO" },
            "Q58QIT+t+kGf9tzqHN2OCA==": { name: "Forest Trace", id: "188", timezone: "America/Denver", state: "CO" },
            "2LUEj0hnMk+kCQlUcySYBQ==": { name: "Greeley", id: "354", timezone: "America/Denver", state: "CO" },
            "x/S/SDwyrEem54+ZoCILeg==": { name: "Highlands Ranch", id: "204049", timezone: "America/Denver", state: "CO" },
            "gAAbGt6udki8DwPMkonciA==": { name: "Johnstown", id: "722", timezone: "America/Denver", state: "CO" },
            "37CE8WDS8k6isMGLMB9PRA==": { name: "Lowry", id: "619", timezone: "America/Denver", state: "CO" },
            "7yC7X4KjZEuoZCDviTwspA==": { name: "McCastlin Marketplace", id: "161", timezone: "America/Denver", state: "CO" },
            "SUsjq0mEck6HwRkd7uNACg==": { name: "Northfield Commons", id: "336", timezone: "America/Denver", state: "CO" },
            "M4X3DyDrLUKwi3CQHbqlOQ==": { name: "Polaris Pointe", id: "1036", timezone: "America/Denver", state: "CO" },
            "38AZmQGFQEy5VNajl9utlA==": { name: "Park Meadows", id: "26", timezone: "America/Denver", state: "CO" },
            "ZOJMZlffDEqC849w6PnF0g==": { name: "Ralston Creek", id: "441", timezone: "America/Denver", state: "CO" },
            "A2dHEwIh9USNnpMrXCrpQw==": { name: "Sheridan Parkway", id: "601", timezone: "America/Denver", state: "CO" },
            "y4xlWfqFJEuvmkocDGZGtw==": { name: "South Academy Highlands", id: "204047", timezone: "America/Denver", state: "CO" },
            "6OwU+/7IOka+PV9JzAgzYQ==": { name: "Tower", id: "579", timezone: "America/Denver", state: "CO" },
            "YUn21EMuwki+goWuIJ5yGg==": { name: "Wellington", id: "652", timezone: "America/Denver", state: "CO" },
            "OpM9o1kTOkyMM2vevMMqdw==": { name: "Westminster Promenade", id: "202794", timezone: "America/Denver", state: "CO" }
        };
    }
    /**
     * Health check - verify cache is working
     */
    async healthCheck(context) {
        try {
            await this.ensureCacheValid(context);
            if (!this.cache) {
                return {
                    cacheStatus: 'missing',
                    totalStores: 0,
                    lastRefresh: 'never',
                    cacheAge: 0
                };
            }
            const cacheAge = Date.now() - this.cache.lastRefresh.getTime();
            const isStale = cacheAge > this.cacheMaxAge;
            return {
                cacheStatus: isStale ? 'stale' : 'healthy',
                totalStores: this.cache.totalStores,
                lastRefresh: this.cache.lastRefresh.toISOString(),
                cacheAge: Math.round(cacheAge / 1000) // seconds
            };
        }
        catch (error) {
            context?.error('Health check failed:', error);
            return {
                cacheStatus: 'missing',
                totalStores: 0,
                lastRefresh: 'error',
                cacheAge: 0
            };
        }
    }
}
// Export singleton instance
exports.storeConfigService = StoreConfigService.getInstance();
//# sourceMappingURL=storeConfigService.js.map