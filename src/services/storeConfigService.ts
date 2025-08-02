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

import * as fs from 'fs/promises';
import * as path from 'path';
import { InvocationContext } from '@azure/functions';

interface StoreConfig {
  token: string;           // Encrypted PAR Brink location token
  name: string;            // Store display name
  id: string;              // PAR Brink location ID
  timezone: string;        // IANA timezone (e.g., "America/Denver")
  state: string;           // State abbreviation
  address?: string;        // Optional: full address
  phone?: string;          // Optional: store phone
  storeurl?: string;       // Optional: MOD Pizza website URL
  googleMapsUrl?: string;  // Optional: Google Maps URL
  manager?: string;        // Optional: store manager
  region?: string;         // Optional: for multi-region expansion
  isActive: boolean;       // Whether store is currently operational
  lastUpdated: Date;       // When this record was last modified
  dailyHours?: {           // Optional: detailed daily hours
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  openingHour?: number;    // Optional: general opening hour (for backward compatibility)
  closingHour?: number;    // Optional: general closing hour (for backward compatibility)
}

interface StoreConfigCache {
  stores: { [token: string]: StoreConfig };
  lastRefresh: Date;
  cacheVersion: string;
  totalStores: number;
}

class StoreConfigService {
  private static instance: StoreConfigService;
  private cache: StoreConfigCache | null = null;
  private readonly cacheFilePath = path.join(__dirname, '../data/store-cache.json');
  private readonly cacheMaxAge = 15 * 60 * 1000; // 15 minutes in milliseconds
  private refreshPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): StoreConfigService {
    if (!StoreConfigService.instance) {
      StoreConfigService.instance = new StoreConfigService();
    }
    return StoreConfigService.instance;
  }

  /**
   * Get store configuration by token (primary method)
   * Ultra-fast lookup using cached JSON data
   */
  public async getStoreConfig(token: string, context?: InvocationContext): Promise<StoreConfig | null> {
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
  public async getAllActiveStores(context?: InvocationContext): Promise<StoreConfig[]> {
    await this.ensureCacheValid(context);
    
    if (!this.cache) {
      context?.warn('Store cache unavailable, falling back to database');
      return await this.getAllStoresFromDatabase(context);
    }

    return Object.values(this.cache.stores)
      .filter(store => store.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get stores by state (for regional filtering)
   */
  public async getStoresByState(state: string, context?: InvocationContext): Promise<StoreConfig[]> {
    const allStores = await this.getAllActiveStores(context);
    return allStores.filter(store => store.state === state);
  }

  /**
   * Force refresh cache from database (admin function)
   */
  public async refreshCache(context?: InvocationContext): Promise<void> {
    context?.log('🔄 Force refreshing store cache from database...');
    
    try {
      const stores = await this.getAllStoresFromDatabase(context);
      const storeMap: { [token: string]: StoreConfig } = {};
      
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
    } catch (error) {
      context?.error('❌ Failed to refresh store cache:', error);
      throw error;
    }
  }

  /**
   * Ensure cache is valid (not expired) and load if needed
   */
  private async ensureCacheValid(context?: InvocationContext): Promise<void> {
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
      } finally {
        this.refreshPromise = null;
      }
    }
  }

  /**
   * Load cache from file or database
   */
  private async loadCache(context?: InvocationContext): Promise<void> {
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
      
    } catch (error) {
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
  private async loadCacheFromFile(context?: InvocationContext): Promise<StoreConfigCache | null> {
    try {
      const data = await fs.readFile(this.cacheFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert date strings back to Date objects
      parsed.lastRefresh = new Date(parsed.lastRefresh);
      Object.values(parsed.stores).forEach((store: any) => {
        store.lastUpdated = new Date(store.lastUpdated);
      });
      
      return parsed;
    } catch (error) {
      context?.log('📁 Cache file not found or invalid, will create new one');
      return null;
    }
  }

  /**
   * Save cache to JSON file
   */
  private async saveCacheToFile(context?: InvocationContext): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.cacheFilePath), { recursive: true });
      
      // Save cache with pretty formatting for debugging
      await fs.writeFile(
        this.cacheFilePath, 
        JSON.stringify(this.cache, null, 2), 
        'utf-8'
      );
      
      context?.log(`💾 Cache saved to file: ${this.cacheFilePath}`);
    } catch (error) {
      context?.error('❌ Failed to save cache to file:', error);
      // Don't throw - cache can still work in memory
    }
  }

  /**
   * Get single store from database (fallback method)
   */
  private async getStoreFromDatabase(token: string, context?: InvocationContext): Promise<StoreConfig | null> {
    try {
      // Import database service dynamically to avoid circular dependencies
      const { databaseStoreService } = await import('./databaseStoreService');
      
      // Try database first
      const store = await databaseStoreService.getStoreByToken(token, context);
      if (store) {
        return store;
      }
      
      context?.warn(`Store not found in database for token: ${token.substring(0, 10)}...`);
      
    } catch (error) {
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
  private async getAllStoresFromDatabase(context?: InvocationContext): Promise<StoreConfig[]> {
    try {
      // Import database service dynamically to avoid circular dependencies
      const { databaseStoreService } = await import('./databaseStoreService');
      
      // Try database first
      const stores = await databaseStoreService.getAllStores(context);
      context?.log(`📊 Retrieved ${stores.length} stores from SQL database`);
      return stores;
      
    } catch (error) {
      context?.warn('Database query failed, falling back to hardcoded data:', error);
      
      // Fallback to hardcoded data if database is unavailable
      const hardcodedMapping = this.getHardcodedStores();
      const stores: StoreConfig[] = Object.entries(hardcodedMapping).map(([token, config]) => ({
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
  private getHardcodedStores(): { [token: string]: { name: string; id: string; timezone: string; state: string } } {
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
  public async healthCheck(context?: InvocationContext): Promise<{
    cacheStatus: 'healthy' | 'stale' | 'missing';
    totalStores: number;
    lastRefresh: string;
    cacheAge: number;
  }> {
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
    } catch (error) {
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
export const storeConfigService = StoreConfigService.getInstance();
export { StoreConfig };
