"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.CacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
class CacheService {
    cache;
    constructor() {
        this.cache = new node_cache_1.default({
            stdTTL: 300, // Default TTL of 5 minutes
            checkperiod: 60, // Check for expired keys every 60 seconds
            useClones: false
        });
    }
    /**
     * Get a value from cache
     */
    get(key) {
        return this.cache.get(key);
    }
    /**
     * Set a value in cache with optional TTL
     */
    set(key, value, ttl) {
        return this.cache.set(key, value, ttl || 0);
    }
    /**
     * Delete a value from cache
     */
    del(key) {
        return this.cache.del(key);
    }
    /**
     * Delete multiple values from cache
     */
    delMany(keys) {
        return this.cache.del(keys);
    }
    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Get all keys from cache
     */
    keys() {
        return this.cache.keys();
    }
    /**
     * Clear all cache entries
     */
    flushAll() {
        this.cache.flushAll();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return this.cache.getStats();
    }
}
exports.CacheService = CacheService;
// Export singleton instance
exports.cache = new CacheService();
//# sourceMappingURL=cache.js.map