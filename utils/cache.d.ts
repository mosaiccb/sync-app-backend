import NodeCache from 'node-cache';
export declare class CacheService {
    private cache;
    constructor();
    /**
     * Get a value from cache
     */
    get<T>(key: string): T | undefined;
    /**
     * Set a value in cache with optional TTL
     */
    set<T>(key: string, value: T, ttl?: number): boolean;
    /**
     * Delete a value from cache
     */
    del(key: string): number;
    /**
     * Delete multiple values from cache
     */
    delMany(keys: string[]): number;
    /**
     * Check if key exists in cache
     */
    has(key: string): boolean;
    /**
     * Get all keys from cache
     */
    keys(): string[];
    /**
     * Clear all cache entries
     */
    flushAll(): void;
    /**
     * Get cache statistics
     */
    getStats(): NodeCache.Stats;
}
export declare const cache: CacheService;
//# sourceMappingURL=cache.d.ts.map